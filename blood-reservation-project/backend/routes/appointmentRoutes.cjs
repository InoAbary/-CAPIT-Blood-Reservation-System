const express = require('express')

const router = express.Router();

const Donor = require('../../db/models/donor.cjs')
const Appointment = require('../../db/models/appointmentSchedules.cjs')
const Facility = require('../../db/models/facilities.cjs')
const Staff = require('../../db/models/staff.cjs')

const requireDonor = require('../middleware/requireDonor.cjs');
const requireStaff = require('../middleware/requireStaff.cjs');

/* ------------------------------------------------------------------ *
 * DONOR ROUTES
 * ------------------------------------------------------------------ */

// List the logged-in donor's appointments (pending + history)
router.get('/', requireDonor, async (req, res) => {
  try {
    const donorId = req.user?.id || req.user?._id || req.user?.sub;
    if (!donorId) {
        return res.status(401).json({ error: 'Donor authentication required.' });
    }

    const appointments = await Appointment.find({ donor: donorId })
      .populate('venue', 'facilityName address facilityType')
      .populate('assocStaff', 'firstName lastName')
      .sort({ date: 1 })
      .lean();

    return res.json({ appointments });
  } catch (err) {
    console.error('GET /donor-appointments failed:', err);
    return res.status(500).json({ error: 'Unable to load your appointments.' });
  }
});

// List venues a donor can choose from
router.get('/venues', requireDonor, async (req, res) => {
  try {
    // Adjust the filter to your Facility schema (e.g. acceptBSF, acceptingDonations…)
    const venues = await Facility.find({ facilityType: { $in: ['bsf', 'prc_chapter', 'hospital'] } })
      .select('facilityName address facilityType')
      .lean();
    return res.json({ venues });
  } catch (err) {
    console.error('GET /venues failed:', err);
    return res.status(500).json({ error: 'Unable to load venues.' });
  }
});

// Create a pending appointment request
router.post('/send-appointment', requireDonor, async (req, res) => {
  try {
    const donorId = req.user?.id || req.user?._id || req.user?.sub;
    if (!donorId) {
      return res.status(401).json({ error: 'Donor authentication required.' });
    }

    const { date, venue } = req.body || {};
    if (!date || !venue) {
      return res.status(400).json({ error: 'Please choose both a date and a venue.' });
    }

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'That date is invalid.' });
    }
    if (parsed.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Please choose a future date.' });
    }
    const maxFuture = Date.now() + 90 * 24 * 60 * 60 * 1000;
    if (parsed.getTime() > maxFuture) {
      return res.status(400).json({ error: 'Please choose a date within the next 90 days.' });
    }

    // One open appointment per donor per day
    const startOfDay = new Date(parsed);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsed);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await Appointment.findOne({
      donor: donorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'approved'] },
    });
    if (existing) {
      return res.status(409).json({
        error: 'You already have an open appointment request on that day.',
      });
    }

    const appt = await Appointment.create({
      donor: donorId,
      venue,
      date: parsed,
      status: 'pending',
    });

    const populated = await appt.populate('venue', 'facilityName address facilityType');
    return res.status(201).json({ appointment: populated });
  } catch (err) {
    console.error('POST /send-appointment failed:', err);
    return res.status(500).json({ error: 'Unable to create your appointment request.' });
  }
});

// Donor cancels their own pending appointment
router.patch('/:id/cancel', requireDonor, async (req, res) => {
  try {
    const donorId = req.user?.id || req.user?._id || req.user?.sub;
    
    const { id } = req.params;

    const appt = await Appointment.findOne({ _id: id, donor: donorId });
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
    if (!['pending', 'approved'].includes(appt.status)) {
      return res.status(409).json({ error: 'Only open appointments can be cancelled.' });
    }

    appt.status = 'cancelled';
    appt.note = req.body?.note || 'Cancelled by donor';
    await appt.save();
    return res.json({ appointment: appt });
  } catch (err) {
    console.error('PATCH cancel failed:', err);
    return res.status(500).json({ error: 'Unable to cancel that appointment.' });
  }
});

/* ------------------------------------------------------------------ *
 * STAFF ROUTES
 * ------------------------------------------------------------------ */

// Staff view: pending (default) or all appointments at their facility
async function getStaffFacility(req) {
  const staffId = req.user?.id || req.user?._id || req.user?.sub;
  if (!staffId) return { staffId: null, facilityId: null };

  const staffDoc = await Staff.findById(staffId)
    .select('facilityID isActive role')
    .lean();

  if (!staffDoc || staffDoc.isActive === false) {
    return { staffId, facilityId: null };
  }

  const facilityId = staffDoc.facilityID || null;
  return { staffId, facilityId };
}

// Staff view: pending (default) or all appointments at their facility
router.get('/staff-appointments', requireStaff, async (req, res) => {
  try {
    const { facilityId } = await getStaffFacility(req);
    if (!facilityId) {
      return res.status(400).json({
        error: 'No facility is associated with this staff account.',
      });
    }

    const { status } = req.query;
    const filter = { venue: facilityId };
    if (status && status !== 'all') filter.status = status;

    const appointments = await Appointment.find(filter)
      .populate('donor', 'firstName lastName email bloodType phone')
      .populate('assocStaff', 'firstName lastName')
      .sort({ date: 1 })
      .lean();

    return res.json({ appointments });
  } catch (err) {
    console.error('GET /staff-appointments failed:', err);
    return res.status(500).json({ error: 'Unable to load appointments.' });
  }
});

// Staff approves or denies
router.patch('/staff-appointments/:id', requireStaff, async (req, res) => {
  try {
    const { action, note } = req.body || {};
    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "deny".' });
    }

    const { staffId, facilityId } = await getStaffFacility(req);
    if (!staffId) {
      return res.status(401).json({ error: 'Staff authentication required.' });
    }
    if (!facilityId) {
      return res.status(400).json({
        error: 'No facility is associated with this staff account.',
      });
    }

    const { id } = req.params;

    const appt = await Appointment.findOne({ _id: id, venue: facilityId });
    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found at your facility.' });
    }
    if (appt.status !== 'pending') {
      return res.status(409).json({ error: 'Only pending appointments can be decided.' });
    }

    appt.status = action === 'approve' ? 'approved' : 'denied';
    appt.assocStaff = staffId;
    appt.decidedAt = new Date();
    if (action === 'deny' && note) appt.note = note;
    await appt.save();

    const populated = await appt.populate('donor', 'firstName lastName email bloodType');
    return res.json({ appointment: populated });
  } catch (err) {
    console.error('PATCH /staff-appointments/:id failed:', err);
    return res.status(500).json({ error: 'Unable to update that appointment.' });
  }
});


module.exports = router;