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
            requestStatus: {
                $in: ['Pending', 'Allocated', 'Approved', 'Partially Fulfilled', 'Fulfilled']
            } })
        .sort({ createdAt: 1, _id: 1 }).lean();
        const counts = await BloodUnits.aggregate([
            { $match: eligibleStock(facilityID) },
                                                  { $group: { _id: { bloodType: '$bloodType', component: '$component' }, count: { $sum: 1 } } }
        ]);
        const released = await BloodUnits.aggregate([
            { $match: { requestID: { $in: requests.map(row => row._id) }, status: 'Released' } },
            { $group: { _id: '$requestID', count: { $sum: 1 }, bloodBagIDs: { $push: '$bloodUnitID' } } }
        ]);
        const activeOperations = await Operation.find({ facilityID, active: true }).select('requestID state').lean();
        const activeRequests = new Set(activeOperations.map(operation => String(operation.requestID)));
        const stock = new Map(counts.map(row => [`${row._id.bloodType}|${row._id.component}`, row.count]));
        const releasedByRequest = new Map(released.map(row => [String(row._id), row]));
        res.json({
            success: true,
            recoveryRequired: activeOperations.some(operation => operation.state === 'Needs Recovery'),
            requests: requests.map(row => {
                const progress = releasedByRequest.get(String(row._id));
                const fulfilledUnits = progress?.count ?? 0;
                return {
                    ...row,
                    fulfillmentPending: activeRequests.has(String(row._id)),
                    fulfilledUnits,
                    remainingUnits: Math.max(0, row.units - fulfilledUnits),
                    releasedBloodBagIDs: progress?.bloodBagIDs.filter(Boolean).sort() ?? [],
                    availableUnits: stock.get(`${row.bloodType}|${row.component}`) || 0
                };
            })
        });
    } catch (error) {
        console.error('Fulfillment queue error:', error.name);
        res.status(500).json({ success: false, message: 'Could not load requests for fulfillment.' });
    }
});

router.get('/:id/eligible-units', async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return res.status(400).json({ message: 'Invalid request ID.' });
    }

    const q = req.query.q ?? '';
    if (typeof q !== 'string' || q.trim().length > 64) {
        return res.status(400).json({ message: 'Enter a bag code of up to 64 characters.' });
    }

    try {
        const facilityID = req.inventoryAccess.facility._id;
        const request = await BloodRequest.findOne({
            _id: req.params.id,
            receivingFacilityID: facilityID,
            requestStatus: { $in: ['Allocated', 'Approved'] },
        }).select('bloodType component').lean();

        if (!request) {
            return res.status(404).json({ message: 'Open request not found at your facility.' });
        }

        const filter = {
            ...eligibleStock(facilityID),
            bloodType: request.bloodType,
            component: request.component,
        };

        const search = q.trim();
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.bloodUnitID = { $regex: escaped, $options: 'i' };
        }

        const units = await BloodUnits.find(filter)
            .select('bloodUnitID storageLocation expiryDate -_id')
            .sort({ bloodUnitID: 1 })
            .limit(20)
            .lean();

        return res.json({ success: true, units });
    } catch (error) {
        console.error('Eligible blood unit lookup failed:', error.name);
        return res.status(500).json({ message: 'Could not load eligible blood bags.' });
    }
});


router.post('/:id/fulfill', async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid request ID.' });
    const body = req.body;
    if (!body || Array.isArray(body) || Object.keys(body).some(key => !['units', 'expectedFulfilledUnits', 'bloodUnitIDs'].includes(key))) {
        return res.status(400).json({ message: 'Send units, expectedFulfilledUnits, and bloodUnitIDs only.' });
    }
    try {
        const result = await fulfillRequest({ requestID: req.params.id,
            facilityID: req.inventoryAccess.facility._id, actorID: req.inventoryAccess.account._id,
            units: body.units, expectedFulfilledUnits: body.expectedFulfilledUnits, bloodUnitIDs: body.bloodUnitIDs });
        return res.json({ success: true, ...result });
    } catch (error) {
        console.error('Fulfill request error:', error.message);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        return res.status(500).json({ success: false, message: 'Could not confirm fulfillment. Check request progress before trying again.' });
    }
});
module.exports = router;