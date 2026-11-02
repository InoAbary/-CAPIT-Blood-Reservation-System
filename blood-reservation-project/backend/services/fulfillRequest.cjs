const BloodRequest = require('../../db/models/BloodRequest.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const Inventory = require('../../db/models/inventories.cjs');
const History = require('../../db/models/bloodUnitsHistory.cjs');
const Operation = require('../../db/models/fulfillmentOperation.cjs');
const ALLOWED_STATUSES = ['Approved', 'Partially Fulfilled'];
const COMPONENTS = ['Packed RBC', 'Plasma', 'Platelets', 'Whole Blood'];
const fail = (status, message) => Object.assign(new Error(message), { status });
function expiryCutoff(now = new Date()) {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    return new Date(`${date}T00:00:00.000Z`);
}
function eligibleStock(facilityID, now = new Date()) {
    return { facilityID: String(facilityID), status: 'In-stock', requestID: null, releaseOperationID: null,
        expiryDate: { $gte: expiryCutoff(now) }, collectionDate: { $lte: now } };
}
let indexPromise;
async function ensureIndexes() {
    if (!indexPromise) indexPromise = (async () => {
        // The unique lock and history indexes must exist before releasing any stock.
        await Operation.init(); await History.init();
        await Operation.createIndexes(); await History.createIndexes();
        if (!BloodUnits.schema.path('releaseOperationID')) throw fail(500, 'Update the bloodUnits model to include releaseOperationID and restart Node.');
                                       if (!History.schema.path('releaseOperationID')) throw fail(500, 'Update the bloodUnitsHistory model and restart Node.');
                                       if (!BloodRequest.schema.path('fulfilledUnits')) throw fail(500, 'Update the BloodRequest model and restart Node.');
    })().catch(error => { indexPromise = null; throw error; });
        return indexPromise;
}
async function readRequest(requestID, facilityID) {
    return BloodRequest.findOne({ _id: requestID, receivingFacilityID: facilityID }).lean();
}
function validateRequest(request) {
    if (!request) throw fail(404, 'Request not found in your facility.');
    if (!ALLOWED_STATUSES.includes(request.requestStatus)) throw fail(409, 'Only approved or partially fulfilled requests can be fulfilled.');
    if (!Number.isSafeInteger(request.units) || request.units < 1 || !COMPONENTS.includes(request.component)) throw fail(409, 'Invalid request product details.');
}
// Idempotent completion: no stock allocation happens here. Also used by recovery
// with the API server STOPPED so an interrupted operation cannot still be running.
async function finishOperation(operation) {
    const released = await BloodUnits.find({ releaseOperationID: operation._id, requestID: operation.requestID, status: 'Released' })
    .sort({ collectionDate: 1, dateAdded: 1, _id: 1 }).lean();
    if (!released.length) {
        await Operation.deleteOne({ _id: operation._id, active: true });
        return null;
    }
    const request = await readRequest(operation.requestID, operation.facilityID);
    if (!request) throw fail(409, 'Released units need recovery, but their request is missing. Restore the request before continuing.');
    for (const unit of released) {
        const history = {
            facilityID: operation.facilityID, releaseOperationID: operation._id,
            bloodUnitID: unit.bloodUnitID, donorID: unit.donorID, bloodType: unit.bloodType,
            component: unit.component, collectionDate: unit.collectionDate, expiryDate: unit.expiryDate,
            status: 'Released', requestID: operation.requestID, releasedAt: unit.releasedAt,
            releasedToFacilityID: operation.receivingHospitalID || null,
            action: 'Updated', performedBy: operation.actorID, date: unit.releasedAt,
            changes: [
                { field: 'status', oldValue: 'In-stock', newValue: 'Released' },
                { field: 'requestID', oldValue: null, newValue: operation.requestID },
                { field: 'releasedAt', oldValue: null, newValue: unit.releasedAt }
            ]
        };
        await History.updateOne({ releaseOperationID: operation._id, bloodUnitID: unit.bloodUnitID },
                                { $setOnInsert: history }, { upsert: true, runValidators: true });
    }
    const fulfilledUnits = await BloodUnits.countDocuments({ requestID: operation.requestID, status: 'Released' });
    if (fulfilledUnits > request.units) throw fail(409, 'Release totals exceed this request. Manual reconciliation is required.');
    const complete = fulfilledUnits === request.units;
    const now = new Date();
    const updatedRequest = await BloodRequest.findOneAndUpdate({ _id: request._id, receivingFacilityID: operation.facilityID }, {
        $set: { fulfilledUnits, requestStatus: complete ? 'Fulfilled' : 'Partially Fulfilled',
            fulfilledAt: complete ? (request.fulfilledAt || now) : null }
    }, { returnDocument: 'after', runValidators: true }).lean();
    if (!updatedRequest) throw fail(409, 'The request was changed or removed during release. Recovery is required.');
    const available = await BloodUnits.countDocuments({ ...eligibleStock(operation.facilityID), bloodType: operation.bloodType, component: operation.component });
    await Inventory.updateOne({ facilityID: operation.facilityID, bloodType: operation.bloodType, component: operation.component }, {
        $set: { availQuantity: available, availStatus: available === 0 ? 'Out of Stock' : available <= 5 ? 'Limited' : 'Available', lastUpdated: now, updatedBy: operation.actorID }
    }, { upsert: true, runValidators: true });
    const result = { request: updatedRequest, releasedUnits: released.map(unit => ({ bloodUnitID: unit.bloodUnitID,
        collectionDate: unit.collectionDate, status: 'Released', releasedAt: unit.releasedAt })),
        releasedCount: released.length, requestedReleaseCount: operation.units,
        partialRelease: released.length < operation.units, availableAfter: available };
        // Release the durable request lock only after all projections/history are saved.
        await Operation.updateOne({ _id: operation._id }, { $set: { active: false, state: 'Completed', result, lastError: '' } });
        return result;
}
async function fulfillRequest({ requestID, facilityID, actorID, units, expectedFulfilledUnits }) {
    if (!Number.isSafeInteger(units) || units < 1) throw fail(400, 'Units must be a positive whole number.');
    if (!Number.isSafeInteger(expectedFulfilledUnits) || expectedFulfilledUnits < 0) throw fail(400, 'Refresh before releasing units.');
    await ensureIndexes();
    // Scope is checked even for replay, so a foreign facility cannot inspect a job.
    const request = await readRequest(requestID, facilityID);
    if (!request) throw fail(404, 'Request not found in your facility.');
    const previous = await Operation.findOne({ requestID, expectedFulfilledUnits }).lean();
    if (previous) {
        if (String(previous.facilityID) !== String(facilityID)) throw fail(404, 'Request not found in your facility.');
        if (previous.active) throw fail(409, 'This request has a release in progress or awaiting recovery. Refresh; if it stays blocked, stop the backend and run the recovery script.');
        if (previous.units !== units) throw fail(409, 'This progress point was already processed. Refresh before choosing another release quantity.');
        return { ...previous.result, replayed: true };
    }
    validateRequest(request);
    let operation;
    try {
        operation = await Operation.create({ requestID, facilityID, actorID,
            receivingHospitalID: request.hospitalFacilityID || null,
            bloodType: request.bloodType, component: request.component,
            units, expectedFulfilledUnits, active: true, state: 'Processing' });
    } catch (error) {
        if (error.code === 11000) throw fail(409, 'Another release is already processing this request. Refresh the queue.');
        throw error;
    }
    let startedClaims = false;
    try {
        // Recheck after acquiring the unique per-request operation lock.
        const current = await readRequest(requestID, facilityID);
        validateRequest(current);
        const alreadyReleased = await BloodUnits.countDocuments({ requestID, status: 'Released' });
        if (alreadyReleased !== expectedFulfilledUnits) throw fail(409, 'Request progress changed. Refresh before releasing more units.');
        if (units > current.units - alreadyReleased) throw fail(409, 'Release quantity exceeds the remaining request.');
        const filter = { ...eligibleStock(facilityID), bloodType: current.bloodType, component: current.component };
        const available = await BloodUnits.countDocuments(filter);
        if (available < units) throw fail(409, `Only ${available} eligible units are available. Choose a smaller release quantity.`);
        startedClaims = true;
        for (let i = 0; i < units; i++) {
            // Each unit is claimed and marked Released in ONE atomic MongoDB write.
            // Competing requests cannot claim the same unit, even on standalone MongoDB.
            const now = new Date();
            const unit = await BloodUnits.findOneAndUpdate({ ...eligibleStock(facilityID, now), bloodType: current.bloodType, component: current.component }, {
                $set: { status: 'Released', requestID: current._id, releaseOperationID: operation._id, releasedAt: now, lastUpdated: now }
            }, { sort: { collectionDate: 1, dateAdded: 1, _id: 1 }, returnDocument: 'after', runValidators: true }).lean();
            if (!unit) break; // Another request took the remaining stock; keep actual releases.
        }
        const result = await finishOperation(operation);
        if (!result) { startedClaims = false; throw fail(409, 'No eligible stock remained. No units were released.'); }
        return result;
    } catch (error) {
        if (!startedClaims) {
            await Operation.deleteOne({ _id: operation._id, active: true });
            throw error;
        }
        // Never put a potentially issued unit back into stock after an uncertain
        // outcome. The journal retains ownership for controlled offline recovery.
        await Operation.updateOne({ _id: operation._id, active: true }, { $set: { state: 'Needs Recovery', lastError: error.message } }).catch(() => {});
        throw fail(503, 'Release could not be fully confirmed. Some units may already be Released. Do not resubmit; stop the backend and run the recovery script, then refresh.');
    }
}
module.exports = { fulfillRequest, finishOperation, ensureIndexes, eligibleStock, expiryCutoff };
