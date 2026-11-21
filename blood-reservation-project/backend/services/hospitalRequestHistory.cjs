const FulfillmentOperation = require('../../db/models/fulfillmentOperation.cjs');

async function getRecordedReleaseHistory(requestIDs) {
    const history = new Map();
    if (!requestIDs.length) return history;

    const releases = await FulfillmentOperation.find({
        requestID: { $in: requestIDs },
        state: 'Completed',
        'result.request.requestStatus': { $in: ['Partially Fulfilled', 'Fulfilled'] },
    })
        .select('requestID updatedAt result.request.requestStatus result.request.fulfilledUnits result.releasedCount')
        .sort({ updatedAt: 1, _id: 1 })
        .lean();

    for (const release of releases) {
        const requestID = String(release.requestID);
        const events = history.get(requestID) ?? [];
        events.push({
            id: String(release._id),
            status: release.result.request.requestStatus,
            updatedAt: release.updatedAt,
            releasedCount: release.result.releasedCount,
            fulfilledUnits: release.result.request.fulfilledUnits,
        });
        history.set(requestID, events);
    }

    return history;
}

module.exports = getRecordedReleaseHistory;
