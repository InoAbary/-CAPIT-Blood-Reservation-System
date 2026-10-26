const express = require('express');
const mongoose = require('mongoose');
const BloodRequest = require('../../db/models/BloodRequest.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const Operation = require('../../db/models/fulfillmentOperation.cjs');
const { authenticateInventory, requireInventoryWrite } = require('../middleware/inventoryAccess.cjs');
const { fulfillRequest, eligibleStock } = require('../services/fulfillRequest.cjs');
const router = express.Router();
router.use(...authenticateInventory, requireInventoryWrite);

// Staff only; always use the facility derived from the current staff account.
router.get('/', async (req, res) => {
    try {
        const facilityID = req.inventoryAccess.facility._id;
        const requests = await BloodRequest.find({ receivingFacilityID: facilityID,
            requestStatus: { $in: ['Pending', 'Approved', 'Partially Fulfilled', 'Fulfilled'] } })
        .sort({ createdAt: 1, _id: 1 }).lean();
        const counts = await BloodUnits.aggregate([
            { $match: eligibleStock(facilityID) },
                                                  { $group: { _id: { bloodType: '$bloodType', component: '$component' }, count: { $sum: 1 } } }
        ]);
        const released = await BloodUnits.aggregate([
            { $match: { requestID: { $in: requests.map(row => row._id) }, status: 'Released' } },
                                                    { $group: { _id: '$requestID', count: { $sum: 1 } } }
        ]);
        const activeOperations = await Operation.find({ facilityID, active: true }).select('requestID state').lean();
        const activeRequests = new Set(activeOperations.map(operation => String(operation.requestID)));
        const stock = new Map(counts.map(row => [`${row._id.bloodType}|${row._id.component}`, row.count]));
        const progress = new Map(released.map(row => [String(row._id), row.count]));
        res.json({ success: true, recoveryRequired: activeOperations.some(operation => operation.state === 'Needs Recovery'), requests: requests.map(row => ({ ...row,
            fulfillmentPending: activeRequests.has(String(row._id)),
                                                                                                                                                             fulfilledUnits: progress.get(String(row._id)) || 0,
                                                                                                                                                             remainingUnits: Math.max(0, row.units - (progress.get(String(row._id)) || 0)),
                                                                                                                                                             availableUnits: stock.get(`${row.bloodType}|${row.component}`) || 0
        })) });
    } catch (error) {
        console.error('Fulfillment queue error:', error.name);
        res.status(500).json({ success: false, message: 'Could not load requests for fulfillment.' });
    }
});
router.post('/:id/fulfill', async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid request ID.' });
    const body = req.body;
    if (!body || Array.isArray(body) || Object.keys(body).some(key => !['units', 'expectedFulfilledUnits'].includes(key))) {
        return res.status(400).json({ message: 'Send units and expectedFulfilledUnits only.' });
    }
    try {
        const result = await fulfillRequest({ requestID: req.params.id,
            facilityID: req.inventoryAccess.facility._id, actorID: req.inventoryAccess.account._id,
            units: body.units, expectedFulfilledUnits: body.expectedFulfilledUnits });
        return res.json({ success: true, ...result });
    } catch (error) {
        console.error('Fulfill request error:', error.message);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        return res.status(500).json({ success: false, message: 'Could not confirm fulfillment. Check request progress before trying again.' });
    }
});
module.exports = router;
