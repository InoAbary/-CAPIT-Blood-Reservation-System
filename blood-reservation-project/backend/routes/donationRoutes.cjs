const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Donor = require('../../db/models/donor.cjs');
const Donation = require('../../db/models/donation.cjs');
const Facility = require('../../db/models/facilities.cjs');
const Staff = require('../../db/models/staff.cjs');
const { createDonor } = require('../services/createDonor.cjs');

// ---------------------------------------------------------------------------
// Resolve the facility a staff user acts on.
//  - admin: must supply ?facilityID= (GET) or body.facilityID (POST)
//  - everyone else: look up their Staff doc and use its facilityID
// Assumes req.user was populated upstream (global auth middleware in app.js).
// Returns the facility ObjectId, or null after sending an error response.
// ---------------------------------------------------------------------------
async function resolveFacility(req, res) {
  const { role } = req.user || {};

  if (role === 'admin') {
    const supplied = req.query.facilityID || req.body?.facilityID;
    if (!supplied || !mongoose.Types.ObjectId.isValid(supplied)) {
      res.status(400).json({ error: 'An admin must supply a valid facilityID.' });
      return null;
    }
    return supplied;
  }

  // Match the identity lookup pattern used in appointmentRoutes.cjs
  const staffId = req.user?.id || req.user?._id || req.user?.sub;
  if (!staffId || !mongoose.Types.ObjectId.isValid(staffId)) {
    res.status(401).json({ error: 'Missing or invalid staff identity.' });
    return null;
  }

  const staffDoc = await Staff.findById(staffId)
    .select('facilityID isActive role')
    .lean();

  if (!staffDoc || staffDoc.isActive === false) {
    res.status(403).json({ error: 'Staff account is inactive or missing.' });
    return null;
  }

  if (!staffDoc.facilityID) {
    res.status(403).json({ error: 'No facility assigned to this account.' });
    return null;
  }

  return staffDoc.facilityID;
}

// ---------------------------------------------------------------------------
// GET /api/donations/staff-donations
//   ?page=1&limit=20&search=...&type=...&from=...&to=...&facilityID=(admin only)
// ---------------------------------------------------------------------------
router.get('/staff-donations', async (req, res) => {
  try {
    const facilityID = await resolveFacility(req, res);
    if (!facilityID) return;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { facilityID };

    if (req.query.type) {
      const allowedTypes = [
        'Whole Blood Donation',
        'Power Red Donation',
        'Platelet Donation',
        'Plasma Donation',
      ];
      if (!allowedTypes.includes(req.query.type)) {
        return res.status(400).json({ error: 'Invalid donation type filter.' });
      }
      filter.donationType = req.query.type;
    }

    if (req.query.from || req.query.to) {
      filter.dateTime = {};
      if (req.query.from) {
        const from = new Date(req.query.from);
        if (Number.isNaN(from.getTime())) {
          return res.status(400).json({ error: 'Invalid "from" date.' });
        }
        filter.dateTime.$gte = from;
      }
      if (req.query.to) {
        const to = new Date(req.query.to);
        if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.to)) to.setUTCDate(to.getUTCDate() + 1);
        if (Number.isNaN(to.getTime())) {
          return res.status(400).json({ error: 'Invalid "to" date.' });
        }
        filter.dateTime.$lt = to;
      }
    }

    if (filter.dateTime?.$gte && filter.dateTime?.$lt && filter.dateTime.$gte >= filter.dateTime.$lt) {
      return res.status(400).json({ error: 'Start date must not be after end date.' });
    }

    if (req.query.search && req.query.search.trim()) {
      const term = req.query.search.trim();
      const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matchedDonors = await Donor.find(
        { $or: [{ firstName: rx }, { lastName: rx }, { email: rx }] },
        { _id: 1 }
      ).lean();
      filter.donorID = { $in: matchedDonors.map((d) => d._id) };
    }

    const [donations, total] = await Promise.all([
      Donation.find(filter)
        .populate('donorID', 'firstName lastName email bloodType')
        .populate('screener extractor encoder', 'firstName lastName email')
        .sort({ dateTime: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Donation.countDocuments(filter),
    ]);

    res.json({
      donations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('staff-donations GET error:', err);
    res.status(500).json({ error: 'Failed to load donations.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/donations/staff-donations
//   Body: { donorID, donationType, screener, extractor, notes?, dateTime?, facilityID? (admin only) }
// ---------------------------------------------------------------------------
router.post('/staff-donations', async (req, res) => {
  try {
    const facilityID = await resolveFacility(req, res);
    if (!facilityID) return;

    const { donorID, donationType, notes, dateTime, screener, extractor } = req.body;
    const encoder = req.user?.id || req.user?._id || req.user?.sub;
    if (!encoder || !mongoose.Types.ObjectId.isValid(encoder)) {
      return res.status(401).json({ error: 'Missing or invalid staff identity.' });
    }
    for (const [label, id] of Object.entries({ screener, extractor })) {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'A valid ' + label + ' is required.' });
      }
    }
    const staff = await Staff.find({
      _id: { $in: [screener, extractor, encoder] },
      isActive: { $ne: false },
    }).select('_id facilityID').lean();
    const creator = staff.find(person => String(person._id) === String(encoder));
    if (!creator) return res.status(403).json({ error: 'Staff account is inactive or missing.' });
    for (const [label, id] of Object.entries({ screener, extractor })) {
      if (!staff.some(person => String(person._id) === id && String(person.facilityID) === String(facilityID))) {
        return res.status(400).json({ error: 'The ' + label + ' must be active staff at this facility.' });
      }
    }

    if (!donorID || !mongoose.Types.ObjectId.isValid(donorID)) {
      return res.status(400).json({ error: 'A valid donor is required.' });
    }

    const allowedTypes = [
      'Whole Blood Donation',
      'Power Red Donation',
      'Platelet Donation',
      'Plasma Donation',
    ];
    if (!allowedTypes.includes(donationType)) {
      return res.status(400).json({ error: 'Invalid donation type.' });
    }

    let when = new Date();
    if (dateTime) {
      when = new Date(dateTime);
      if (Number.isNaN(when.getTime())) {
        return res.status(400).json({ error: 'Invalid dateTime.' });
      }
    }

    const [donor, facility] = await Promise.all([
      Donor.findById(donorID).lean(),
      Facility.findById(facilityID).lean(),
    ]);
    if (!donor) return res.status(404).json({ error: 'Donor not found.' });
    if (!facility) return res.status(404).json({ error: 'Facility not found.' });

    const donation = await Donation.create({
      donorID,
      facilityID,
      donationType,
      screener,
      extractor,
      encoder,
      notes: notes ? String(notes).trim() : undefined,
      dateTime: when,
    });

    const populated = await Donation.findById(donation._id)
      .populate('donorID', 'firstName lastName email bloodType')
        .populate('screener extractor encoder', 'firstName lastName email')
      .lean();

    res.status(201).json({ donation: populated });
  } catch (err) {
    console.error('staff-donations POST error:', err);
    res.status(500).json({ error: 'Failed to record donation.' });
  }
});

// Create a donor record without creating a login account.
router.post('/donors', async (req, res) => {
  try {
    const facilityID = await resolveFacility(req, res);
    if (!facilityID) return;
    return createDonor(req, res);
  } catch (err) {
    console.error('staff donor access error:', err);
    res.status(500).json({ error: 'Failed to add donor.' });
  }
});

// Active staff available to screen or extract donations at this facility.
router.get('/staff-options', async (req, res) => {
  try {
    const facilityID = await resolveFacility(req, res);
    if (!facilityID) return;
    const staff = await Staff.find({ facilityID, isActive: { $ne: false } })
      .select('firstName lastName email').sort({ lastName: 1, firstName: 1 }).lean();
    res.json({ staff });
  } catch (err) {
    console.error('donation staff-options error:', err);
    res.status(500).json({ error: 'Failed to load staff.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/donations/donor-lookup?q=...
// ---------------------------------------------------------------------------
router.get('/donor-lookup', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ donors: [] });

    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const donors = await Donor.find(
      { $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { donorID: rx }] },
      { firstName: 1, lastName: 1, email: 1, bloodType: 1, donorID: 1 }
    )
      .limit(10)
      .lean();

    res.json({ donors });
  } catch (err) {
    console.error('donor-lookup error:', err);
    res.status(500).json({ error: 'Lookup failed.' });
  }
});

module.exports = router;