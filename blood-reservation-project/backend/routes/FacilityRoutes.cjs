const express = require('express');
const mongoose = require('mongoose');
const Facility = require('../../db/models/facilities.cjs'); // adjust path to your model file

const router = express.Router();

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
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid facility id.' });
        }

        const facility = await Facility.findById(id).lean();
        if (!facility) {
            return res.status(404).json({ message: 'Facility not found.' });
        }

        res.json(facility);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to load facility.' });
    }
});

module.exports = router;
