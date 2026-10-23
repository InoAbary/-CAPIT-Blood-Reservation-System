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


router.get('/', async (req, res) => {
    try {
       
        const facilities = await Facility.find({ isActive: true })
        .sort({ facilityName: 1 })
        .lean();
        res.json({success: true, facilities: facilities});
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to load facilities.' });
    }
});


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

        await syncInventory(facility);

        const items = await Inventory.find({ facilityID: facility._id })
        .select('bloodType component availQuantity availStatus lastUpdated')
        .lean();

        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to load inventory.' });
    }
});

router.post('/', async(req,res) => {
    try {
        const {facilityName, category, facilityType, typeLabel, address, contactNumber, hours, lat, lon} = req.body
        if (!facilityName || !address) {
      return res.status(400).json({
        success: false,
        message: 'facilityName and address are required.',
      });
    }

    // Generate a facilityID if your schema requires one
    const facilityID =
      'F' + String(Date.now()).slice(-5) + Math.floor(Math.random() * 90 + 10);

    const facility = await Facility.create({
      facilityID,
      facilityName,
      category,
      facilityType,
      typeLabel,
      address,
      contactNumber,
      hours,
      lat,
      lon,
      isActive: true,
    });

    res.status(201).json({ success: true, facility });
  } catch (err) {
    console.error('POST /api/facilities failed:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create facility.',
      error: err.message,
    });
  }
});


module.exports = router;
