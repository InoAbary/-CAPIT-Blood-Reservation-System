const express = require('express');
const mongoose = require('mongoose');
const Facility = require('./../../db/models/facilities.cjs');   // adjust paths to your model files
const Inventory = require('../../db/models/inventories.cjs');
const syncInventory = require('../services/syncInventory.cjs');
const Counter = require('../../db/models/counters.cjs');
const BloodUnits = require('../../db//models/bloodUnits.cjs')

const router = express.Router();

const requireStaff = require('../middleware/requireStaff.cjs');
const requireRole = require('../middleware/requireRole.cjs');

const validateId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid facility id.' });
    }
    next();
};


const nextFacilityID = async () => {
    const counter = await Counter.findOneAndUpdate(
        {_id: 'facilityID'},
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    return `F${String(counter.sequence).padStart(8, '0')}`;
}

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

router.post('/availability/batch', async (req, res) => {
  try {
    const { facilityIDs = [], bloodType, component } = req.body || {};

    if (!Array.isArray(facilityIDs) || facilityIDs.length === 0) {
      return res.json({ success: true, availability: {} });
    }

    const match = {
      facilityID: { $in: facilityIDs },
      status: 'In-stock',
      expiryDate: { $gt: new Date() },
    };
    if (bloodType) match.bloodType = bloodType;
    if (component) match.component = component;

    const rows = await BloodUnits.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            facilityID: '$facilityID',
            bloodType: '$bloodType',
            component: '$component',
          },
          units: { $sum: 1 },
        },
      },
    ]);

    // Shape: { [facilityID]: { [bloodType]: { [component]: unitCount } } }
    const availability = {};
    for (const r of rows) {
      const f = r._id.facilityID;
      const bt = r._id.bloodType;
      const ck = r._id.component;
      availability[f] = availability[f] || {};
      availability[f][bt] = availability[f][bt] || {};
      availability[f][bt][ck] = r.units;
    }

    res.json({ success: true, availability });
  } catch (err) {
    console.error('POST /availability/batch failed:', err);
    res.status(500).json({ message: 'Failed to load availability.' });
  }
});

router.post('/', requireStaff, requireRole("admin"), async(req,res) => {
    try {
        const {facilityName, category, facilityType, typeLabel, address, contactNumber, hours, lat, lon} = req.body
        if (!facilityName || !address) {
      return res.status(400).json({
        success: false,
        message: 'facilityName and address are required.',
      });
    }

    // Generate a facilityID if your schema requires one
    const facilityID = await nextFacilityID();
      

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
