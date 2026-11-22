const router = require('express').Router();
const { Types } = require('mongoose');
const requireDonor = require('../middleware/requireDonor.cjs');
const requireStaff = require('../middleware/requireStaff.cjs');
const { BLOOD_SERVICE_FACILITY_TYPES } = require('../utils/facilityTypes.cjs');
const Staff = require('../../db/models/staff.cjs');
const Facility = require('../../db/models/facilities.cjs');
const SidebarSeen = require('../../db/models/sidebarSeen.cjs');
const Appointment = require('../../db/models/appointmentSchedules.cjs');
const BloodRequest = require('../../db/models/BloodRequest.cjs');
const { OPEN_BLOOD_REQUEST_STATUSES } = require('../utils/openBloodRequestStatuses.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const BloodReport = require('../../db/models/bloodReports.cjs');
const FormAnswers = require('../../db/models/formAnswers.cjs');

const tabs = {
  donor: ['appointments'],
  bsf: ['branch-requests', 'appointments', 'donor-forms', 'utilization'],
  hospital: ['my-requests', 'utilization'],
};

router.use('/:workspace', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!Object.hasOwn(tabs, req.params.workspace)) return res.sendStatus(404);
  const authenticate = req.params.workspace === 'donor' ? requireDonor : requireStaff;
  return authenticate(req, res, next);
});

router.use('/:workspace', async (req, res, next) => {
  try {
    const workspace = req.params.workspace;
    const scope = { workspace, owner: new Types.ObjectId(req.user.id) };
    if (workspace !== 'donor') {
      const staff = await Staff.findOne({
        _id: scope.owner, isActive: true, role: { $in: ['staff', 'hospital', 'branch-admin'] },
      }).select('facilityID createdAt').lean();
      const facility = staff?.facilityID && await Facility.findOne({
        _id: staff.facilityID, isActive: { $ne: false },
        facilityType: { $in: workspace === 'bsf' ? BLOOD_SERVICE_FACILITY_TYPES : ['hospital', 'hospital_bsf'] },
      }).select('_id').lean();
      if (!facility) return res.sendStatus(403);
      scope.facility = facility._id;
      scope.joinedAt = staff.createdAt;
    }
    req.sidebar = scope;
    next();
  } catch (error) {
    next(error);
  }
});

function markerId(scope, tab) {
  return [scope.workspace, scope.owner, scope.facility, tab].join(':');
}

async function countNewReports(facility, newer) {
  const [result] = await BloodReport.aggregate([
    { $match: { dateCreated: newer } },
    { $group: { _id: '$bloodUnitID' } },
    { $lookup: {
      from: BloodUnits.collection.name, localField: '_id', foreignField: '_id',
      pipeline: [{ $match: { facilityID: String(facility), status: 'Released' } }],
      as: 'ownedUnit',
    } },
    { $match: { 'ownedUnit.0': { $exists: true } } },
    { $count: 'count' },
  ]);
  return result?.count || 0;
}

async function countAwaitingReports(facility) {
  const requestIds = await BloodRequest.distinct('_id', { hospitalFacilityID: facility });
  if (!requestIds.length) return 0;
  const [result] = await BloodUnits.aggregate([
    { $match: { requestID: { $in: requestIds }, status: 'Released' } },
    { $lookup: {
      from: BloodReport.collection.name, localField: '_id', foreignField: 'bloodUnitID',
      pipeline: [{ $limit: 1 }],
      as: 'matchingReport',
    } },
    { $match: { 'matchingReport.0': { $exists: false } } },
    { $count: 'count' },
  ]);
  return result?.count || 0;
}

async function countDonorForms(facility, newer, now) {
  const offset = 8 * 60 * 60 * 1000;
  const start = new Date(Math.floor((now.getTime() + offset) / 86400000) * 86400000 - offset);
  const end = new Date(start.getTime() + 86400000);
  const [result] = await FormAnswers.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $lookup: {
      from: Appointment.collection.name, localField: 'donor', foreignField: 'donor',
      pipeline: [
        { $match: { venue: facility, date: { $gte: start, $lt: end },
          status: { $in: ['pending', 'approved', 'completed'] } } },
        { $sort: { createdAt: -1, _id: -1 } }, { $limit: 1 },
      ],
      as: 'appointment',
    } },
    { $match: { 'appointment.0': { $exists: true },
      $or: [{ createdAt: newer }, { 'appointment.0.createdAt': newer }] } },
    { $count: 'count' },
  ]);
  return result?.count || 0;
}

async function countWorkAndCancellations(model, facilityFilter, statusField, openStatuses, cancelledStatus, newer) {
  const [counts] = await model.aggregate([
    { $match: {
      ...facilityFilter,
      $or: [
        { [statusField]: { $in: openStatuses } },
        { [statusField]: cancelledStatus, updatedAt: newer },
      ],
    } },
    { $group: {
      _id: null,
      total: { $sum: 1 },
      unreadCount: { $sum: { $cond: [{ $eq: [`$${statusField}`, cancelledStatus] }, 1, 0] } },
    } },
  ]);
  return counts || { total: 0, unreadCount: 0 };
}

function countUnreadUpdates(scope, tab, newer, now) {
  if (scope.workspace === 'donor') {
    return Appointment.countDocuments({
      donor: scope.owner, status: { $in: ['approved', 'denied', 'cancelled', 'attended', 'no_show', 'completed'] },
      updatedAt: newer,
    });
  }
  if (tab === 'utilization') return countNewReports(scope.facility, newer);
  if (tab === 'donor-forms') return countDonorForms(scope.facility, newer, now);
  return BloodRequest.countDocuments({
    hospitalFacilityID: scope.facility, updatedAt: newer,
    requestStatus: { $in: [...OPEN_BLOOD_REQUEST_STATUSES, 'Fulfilled', 'Cancelled'] },
    $expr: { $gt: ['$updatedAt', '$createdAt'] },
  });
}

async function countTab(scope, tab, newer, now) {
  if (scope.workspace === 'hospital' && tab === 'utilization') {
    return { total: await countAwaitingReports(scope.facility), unreadCount: 0 };
  }
  if (scope.workspace === 'bsf' && tab === 'appointments') {
    return countWorkAndCancellations(
      Appointment, { venue: scope.facility }, 'status', ['pending'], 'cancelled', newer,
    );
  }
  if (scope.workspace === 'bsf' && tab === 'branch-requests') {
    return countWorkAndCancellations(
      BloodRequest, { receivingFacilityID: scope.facility }, 'requestStatus',
      OPEN_BLOOD_REQUEST_STATUSES,
      'Cancelled', newer,
    );
  }
  const unreadCount = await countUnreadUpdates(scope, tab, newer, now);
  return { total: unreadCount, unreadCount };
}

router.get('/:workspace', async (req, res, next) => {
  try {
    const scope = req.sidebar;
    const keys = tabs[scope.workspace];
    const observedAt = new Date();
    const markers = await SidebarSeen.find({ _id: { $in: keys.map(tab => markerId(scope, tab)) } }).lean();
    const seen = new Map(markers.map(marker => [marker._id, marker.seenThrough]));
    const totals = await Promise.all(keys.map(async tab => {
      const lastSeen = seen.get(markerId(scope, tab)) || scope.joinedAt || new Date(0);
      const counts = await countTab(scope, tab, { $gt: lastSeen, $lte: observedAt }, observedAt);
      return { tab, ...counts };
    }));
    res.json({
      counts: Object.fromEntries(totals.map(({ tab, total }) => [tab, total])),
      unreadCounts: Object.fromEntries(totals.map(({ tab, unreadCount }) => [tab, unreadCount])),
      observedAt,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:workspace/seen', async (req, res, next) => {
  const scope = req.sidebar;
  const { tab, observedAt } = req.body || {};
  const date = new Date(observedAt);
  if (!tabs[scope.workspace].includes(tab) || typeof observedAt !== 'string' ||
    !Number.isFinite(date.getTime()) || date > new Date()) return res.sendStatus(400);
  const filter = { _id: markerId(scope, tab) };
  const update = { $max: { seenThrough: date } };
  try {
    try {
      await SidebarSeen.updateOne(filter, update, { upsert: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      await SidebarSeen.updateOne(filter, update);
    }
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

router.use((error, req, res, next) => {
  console.error('Sidebar updates failed:', error.message);
  res.status(500).json({ error: 'Could not load or acknowledge sidebar updates.' });
});

module.exports = router;
