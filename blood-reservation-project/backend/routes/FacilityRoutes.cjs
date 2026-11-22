const express = require('express');
const mongoose = require('mongoose');
const Facility = require('./../../db/models/facilities.cjs');   // adjust paths to your model files
const Inventory = require('../../db/models/inventories.cjs');
const syncInventory = require('../services/syncInventory.cjs');
const Counter = require('../../db/models/counters.cjs');
const BloodUnits = require('../../db//models/bloodUnits.cjs')
const { getStockBalances, stockKey } = require('../services/requestStock.cjs');
const Staff = require('../../db/models/staff.cjs');
const { recordAdminAudit } = require('../services/adminAudit.cjs');

const router = express.Router();
const { authenticateInventory, authorizeFacility } = require('../middleware/inventoryAccess.cjs');

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

const exactTextPattern = (value) => new RegExp(`^${String(value || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}$`, 'i');

// Dedicated inventory picker; keep the public map directory unchanged.
router.get('/inventory-access', ...authenticateInventory, async (req, res) => {
    try {
        const access = req.inventoryAccess;
        const facilities = access.canEdit ? [access.facility] : await Facility.find({}).sort({ facilityName: 1 }).lean();
        res.json({ success: true, role: access.account.role, canEdit: access.canEdit,
            assignedFacilityID: access.facility?._id || null, facilities });
    } catch (error) {
        res.status(500).json({ message: 'Could not load inventory facilities.' });
    }
});

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


router.get('/:id/inventory', ...authenticateInventory, authorizeFacility, validateId, async (req, res) => {
    try {
        const facility = await Facility.findById(req.params.id).lean();
        if (!facility) {
            return res.status(404).json({ message: 'Facility not found.' });
        }

        if (!req.inventoryAccess.canEdit) {
            const items = await syncInventory(facility, { readOnly: true });
            const balances = await getStockBalances([facility._id]);
            const emptyBalance = { inStockUnits: 0, allocatedUnits: 0, availableUnits: 0 };
            return res.json(items.map((item) => ({
                ...item,
                ...(balances.get(stockKey(facility._id, item.bloodType, item.component)) ?? emptyBalance),
            })));
        }
        await syncInventory(facility);

        const items = await Inventory.find({ facilityID: facility._id })
        .select('bloodType component availQuantity availStatus lastUpdated')
        .lean();

        const balances = await getStockBalances([facility._id]);
        const emptyBalance = { inStockUnits: 0, allocatedUnits: 0, availableUnits: 0 };
        return res.json(items.map((item) => ({
            ...item,
            ...(balances.get(stockKey(facility._id, item.bloodType, item.component)) ?? emptyBalance),
        })));
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
        const {facilityName, category, facilityType, typeLabel, address, contactNumber, hours, operatingHours, lat, lon} = req.body
        if (!facilityName || !address) {
            return res.status(400).json({
                success: false,
                message: 'facilityName and address are required.',
            });
        }

        // Reject repeat submissions by name, or by the same address and map location.
        const latitude = Number(lat);
        const longitude = Number(lon);
        const duplicateMatch = [{ facilityName: exactTextPattern(facilityName) }];
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            const coordinateTolerance = 0.00015;
            duplicateMatch.push({
                address: exactTextPattern(address),
                lat: { $gte: latitude - coordinateTolerance, $lte: latitude + coordinateTolerance },
                lon: { $gte: longitude - coordinateTolerance, $lte: longitude + coordinateTolerance },
            });
        }
        const duplicate = await Facility.findOne({ $or: duplicateMatch }).select('facilityID facilityName').lean();
        if (duplicate) {
            return res.status(409).json({
                success: false,
                duplicate: true,
                message: `${duplicate.facilityName} is already in the facility directory${duplicate.facilityID ? ` (${duplicate.facilityID})` : ''}.`,
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
            operatingHours: {
                daysOpen: [],
                is24Hours: false,
                opensAt: '',
                closesAt: '',
                source: 'placeholder',
                placeholderText: String(operatingHours?.placeholderText || '').slice(0, 1200),
            },
            lat,
            lon,
            isActive: true,
        });

        try {
            const actor = await Staff.findById(req.user.id).select('firstName lastName email').lean();
            await recordAdminAudit({
                action: 'Facility Created',
                actor: actor ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email : 'System Admin',
                actorRole: 'System Admin',
                targetName: facility.facilityName,
                targetRole: 'Facility',
                branch: facility.facilityName,
                details: `A ${facility.typeLabel || facility.facilityType} facility was added to the network.`,
            });
        } catch (auditError) {
            console.error('Could not record facility creation audit event:', auditError.message);
        }

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

router.put('/:id', requireStaff, requireRole('admin'), validateId, async (req, res) => {
    try {
        const allowed = ['facilityName', 'category', 'facilityType', 'typeLabel', 'address', 'contactNumber', 'hours', 'lat', 'lon'];
        const updates = Object.fromEntries(allowed.filter((key) => req.body?.[key] !== undefined).map((key) => [key, req.body[key]]));
        if (!updates.facilityName?.trim() || !updates.address?.trim()) {
            return res.status(400).json({ success: false, message: 'Facility name and address are required.' });
        }
        const facility = await Facility.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        if (!facility) return res.status(404).json({ success: false, message: 'Facility not found.' });
        try {
            const actor = await Staff.findById(req.user.id).select('firstName lastName email').lean();
            await recordAdminAudit({ action: 'Facility Updated', actor: actor ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email : 'System Admin', actorRole: 'System Admin', targetName: facility.facilityName, targetRole: 'Facility', branch: facility.facilityName, details: `Facility ${facility.facilityID} details were updated.` });
        } catch (auditError) { console.error('Could not record facility update audit event:', auditError.message); }
        return res.json({ success: true, facility });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message || 'Failed to update facility.' });
    }
});

// Archive instead of physically deleting so historical appointments and inventory retain their facility reference.
router.delete('/:id', requireStaff, requireRole('admin'), validateId, async (req, res) => {
    try {
        const facility = await Facility.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!facility) return res.status(404).json({ success: false, message: 'Facility not found.' });
        try {
            const actor = await Staff.findById(req.user.id).select('firstName lastName email').lean();
            await recordAdminAudit({ action: 'Facility Archived', actor: actor ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email : 'System Admin', actorRole: 'System Admin', targetName: facility.facilityName, targetRole: 'Facility', branch: facility.facilityName, details: `Facility ${facility.facilityID} was removed from the active directory.` });
        } catch (auditError) { console.error('Could not record facility archive audit event:', auditError.message); }
        return res.json({ success: true, message: 'Facility removed from the active directory.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to remove facility.' });
    }
});


module.exports = router;
