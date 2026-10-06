const express = require('express');
const mongoose = require('mongoose');
const Facility = require('./../../db/models/facilities.cjs');   // adjust paths to your model files
const Inventory = require('../../db/models/inventories.cjs');
const syncInventory = require('../services/syncInventory.cjs');

const router = express.Router();

const validateId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid facility id.' });
    }
    next();
};

// GET /api/facilities -> active facilities for the dropdown (id + name only)
router.get('/', async (req, res) => {
    try {
        const facilities = await Facility.find({ isActive: true })
        .select('facilityName')
        .sort({ facilityName: 1 })
        .lean();
        res.json(facilities);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to load facilities.' });
    }
});

// GET /api/facilities/:id -> full details of one facility
router.get('/:id', validateId, async (req, res) => {
    try {
        const facility = await Facility.findById(req.params.id).lean();
        if (!facility) {
            return res.status(404).json({ message: 'Facility not found.' });
        }
        res.json(facility);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to load facility.' });
    }
});

// GET /api/facilities/:id/inventory
// Recounts the facility's blood units, updates its inventory entries, then returns them.
router.get('/:id/inventory', validateId, async (req, res) => {
    try {
        const facility = await Facility.findById(req.params.id).lean();
        if (!facility) {
            return res.status(404).json({ message: 'Facility not found.' });
        }
        if (!facility.facilityID) {
            return res
            .status(422)
            .json({ message: 'This facility has no facilityID, so its blood units cannot be counted.' });
        }

        //await syncInventory(facility);

        const items = await Inventory.find({ facilityID: facility._id })
        .select('bloodType component availQuantity availStatus lastUpdated')
        .lean();

        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to load inventory.' });
    }
});

module.exports = router;
