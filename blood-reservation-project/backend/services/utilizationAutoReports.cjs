const BloodRequest = require('../../db/models/BloodRequest.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const BloodReport = require('../../db/models/bloodReports.cjs');
const Counter = require('../../db/models/counters.cjs');

const HOUR = 60 * 60 * 1000;
const BATCH_SIZE = 100;
let indexPromise;
let isRunning = false;

function reportDeadlineDays() {
    const days = Number(process.env.UTILIZATION_REPORT_DAYS ?? 7);
    return Number.isInteger(days) && days >= 1 && days <= 365 ? days : 7;
}

function ensureReportIndex() {
    if (!indexPromise) {
        indexPromise = (async () => {
            if (BloodReport.schema.path('bloodUnitID')?.options.unique !== true) {
                throw new Error('Install the updated bloodReports.cjs model before starting utilization reporting.');
            }
            await BloodReport.createIndexes();
        })().catch(error => { indexPromise = null; throw error; });
    }
    return indexPromise;
}

async function reserveReportIds(count) {
    if (!count) return [];
    const counter = await Counter.findOneAndUpdate(
        { _id: 'reportID' },
        { $inc: { sequence: count } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const start = counter.sequence - count + 1;
    return Array.from({ length: count }, (_, i) => `R${String(start + i).padStart(8, '0')}`);
}

// Each upsert is independently safe on standalone MongoDB. A unique bloodUnitID
// index prevents a scheduled run from overwriting a simultaneous hospital report.
async function createDueReports(now = new Date()) {
    if (isRunning) return 0;
    isRunning = true;
    let created = 0;
    try {
        await ensureReportIndex();
        const cutoff = new Date(now.getTime() - reportDeadlineDays() * 24 * HOUR);
        let afterId = null;

        while (true) {
            const filter = { requestStatus: 'Fulfilled', fulfilledAt: { $ne: null, $lte: cutoff } };
            if (afterId) filter._id = { $gt: afterId };

            const requests = await BloodRequest.find(filter)
                .select('_id').sort({ _id: 1 }).limit(BATCH_SIZE).lean();
            if (!requests.length) break;
            afterId = requests[requests.length - 1]._id;

            const units = await BloodUnits.find({
                requestID: { $in: requests.map(request => request._id) },
                status: 'Released', releasedAt: { $ne: null }
            }).select('_id').lean();
            if (!units.length) continue;

            const existing = await BloodReport.distinct('bloodUnitID', {
                bloodUnitID: { $in: units.map(unit => unit._id) }
            });
            const reportedIds = new Set(existing.map(String));
            const missing = units.filter(unit => !reportedIds.has(String(unit._id)));
            if (!missing.length) continue;

            const ids = await reserveReportIds(missing.length);
            const writes = missing.map((unit, index) => ({
                updateOne: {
                    filter: { bloodUnitID: unit._id },
                    update: { $setOnInsert: {
                        reportID: ids[index], bloodUnitID: unit._id, status: 'Used',
                        reportSource: 'System', isAssumed: true, reportedBy: null,
                        description: 'Automatically recorded after the utilization reporting deadline.',
                        dateCreated: now, updatedAt: now
                    } },
                    upsert: true, timestamps: false
                }
            }));

            try {
                const result = await BloodReport.bulkWrite(writes, { ordered: false });
                created += result.upsertedCount;
            } catch (error) {
                // Concurrent submissions may win the unique-index race.
                const errors = error.writeErrors || [];
                if (!(errors.length && errors.every(item => item.code === 11000))) throw error;
                created += error.result?.upsertedCount || 0;
            }
        }
        return created;
    } finally {
        isRunning = false;
    }
}

async function startUtilizationAutoReports() {
    const run = () => createDueReports().then(count => {
        if (count) console.info(`Created ${count} automatic utilization reports.`);
    }).catch(error => console.error('Automatic utilization reporting failed:', error));
    await run();
    const timer = setInterval(run, HOUR);
    timer.unref?.();
}

module.exports = { createDueReports, ensureReportIndex, reserveReportIds, reportDeadlineDays, startUtilizationAutoReports };
