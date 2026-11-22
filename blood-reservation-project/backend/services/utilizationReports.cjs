const BloodReport = require('../../db/models/bloodReports.cjs');
const BloodRequest = require('../../db/models/BloodRequest.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const Counter = require('../../db/models/counters.cjs');

const HANDOFF_STATUSES = ['Picked Up', 'Delivered'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const WASTAGE_REASONS = [
  'Damaged or leaking bag',
  'Storage or temperature issue',
  'Contamination or handling issue',
  'Transfusion canceled after preparation',
  'Other',
];

async function recordUtilizationReport(bloodUnitID, {
  status, description = '', reportedBy = null, isAssumed = false, dateCreated = new Date(),
  wastageReason = '', wastageReasonOther = '', requireWastageReason = true,
}) {
  const reason = status === 'Wasted' && typeof wastageReason === 'string' ? wastageReason.trim() : '';
  const other = reason === 'Other' && typeof wastageReasonOther === 'string' ? wastageReasonOther.trim() : '';
  if (status === 'Wasted' && (requireWastageReason || reason) && !WASTAGE_REASONS.includes(reason)) {
    throw Object.assign(new Error('Select a wastage reason.'), { status: 400 });
  }
  if (reason === 'Other' && (!other || other.length > 240)) {
    throw Object.assign(new Error('Describe the other wastage reason in 1–240 characters.'), { status: 400 });
  }

  const fields = {
    status, description, reportedBy, isAssumed, dateCreated,
    reportSource: isAssumed ? 'System' : 'Hospital',
    wastageReason: reason,
    wastageReasonOther: other,
  };
  const replaceAssumption = id => BloodReport.findOneAndUpdate(
    { _id: id, bloodUnitID, reportSource: 'System', isAssumed: true },
    { $set: fields },
    { returnDocument: 'after', runValidators: true },
  );

  // Existing reports may have independent MongoDB IDs. Keep them in place.
  const existing = await BloodReport.findOne({ bloodUnitID })
    .sort({ reportSource: 1, dateCreated: -1, _id: -1 })
    .select('_id')
    .lean();
  if (existing) return isAssumed ? null : replaceAssumption(existing._id);

  const counter = await Counter.findOneAndUpdate(
    { _id: 'reportID' },
    { $inc: { sequence: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  );

  try {
    // All writers use the bag's ID as the report's MongoDB ID. The built-in
    // unique index prevents duplicate reports even on standalone MongoDB.
    return await BloodReport.create({
      _id: bloodUnitID, bloodUnitID,
      reportID: `R${String(counter.sequence).padStart(8, '0')}`,
      ...fields,
    });
  } catch (error) {
    if (error.code !== 11000 || !error.keyPattern?._id) throw error;
    return isAssumed ? null : replaceAssumption(bloodUnitID);
  }
}

async function recordOverdueUtilizationReports(now = new Date()) {
  const cutoff = new Date(now.getTime() - WEEK_MS);
  const requests = BloodRequest.find({
    hospitalFacilityID: { $ne: null },
    requestStatus: { $in: ['Partially Fulfilled', 'Fulfilled'] },
    fulfillmentStatus: { $in: HANDOFF_STATUSES },
    fulfillmentEvents: {
      $elemMatch: { status: { $in: HANDOFF_STATUSES }, updatedAt: { $lte: cutoff } },
    },
  }).select('_id fulfillmentStatus fulfillmentEvents').lean().cursor();

  for await (const request of requests) {
    const handoffAt = request.fulfillmentEvents
      .filter(event => event.status === request.fulfillmentStatus && event.updatedAt)
      .reduce((latest, event) => Math.max(latest, event.updatedAt.getTime()), 0);
    if (!handoffAt || handoffAt > cutoff.getTime()) continue;

    const units = await BloodUnits.find({
      requestID: request._id,
      status: 'Released',
      // A bag selected after the request's handoff has no confirmed receipt date.
      releasedAt: { $type: 'date', $lte: new Date(handoffAt) },
    }).select('_id').lean();

    for (const unit of units) {
      try {
        await recordUtilizationReport(unit._id, {
          status: 'Used',
          description: 'Assumed used after seven days without a hospital report following pickup or delivery.',
          isAssumed: true,
          dateCreated: now,
        });
      } catch (error) {
        console.error('Automatic utilization report failed for blood unit', String(unit._id), error.name);
      }
    }
  }
}

function startAutomaticUtilizationReports() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await recordOverdueUtilizationReports();
    } catch (error) {
      console.error('Automatic utilization reporting failed:', error.message);
    } finally {
      running = false;
    }
  };
  void tick();
  const timer = setInterval(tick, CHECK_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { recordUtilizationReport, recordOverdueUtilizationReports, startAutomaticUtilizationReports, WASTAGE_REASONS };
