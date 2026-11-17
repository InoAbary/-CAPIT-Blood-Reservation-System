const express = require('express')

const router = express.Router();

const Donor = require('../../db/models/donor.cjs')
const Appointment = require('../../db/models/appointmentSchedules.cjs')
const Facility = require('../../db/models/facilities.cjs')
const Staff = require('../../db/models/staff.cjs')
const FormAnswers = require('../../db/models/formAnswers.cjs');

const {sendAppointmentEmail} = require('../utils/appointSchedEmail.cjs')
const { notifyAppointment } = require('../services/appointmentNotifications.cjs');
const { getNotificationPreferences } = require('../utils/notificationPreferences.cjs');

const requireDonor = require('../middleware/requireDonor.cjs');
const requireStaff = require('../middleware/requireStaff.cjs');

const { checkDonationCooldown } = require('../utils/donationCooldown.cjs');
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

router.get('/donation-eligibility', requireDonor, async (req, res) => {
  try {
    const donorId = req.user?.id || req.user?._id || req.user?.sub;
    if (!donorId) return res.status(401).json({ error: 'Donor authentication required.' });

    const result = await checkDonationCooldown(donorId);

    return res.json({
      eligible: !result.blocked,
      lastDonationDate: result.lastDonation?.dateTime ?? null,
      nextEligibleDate: result.nextEligibleDate ?? null,
    });
  } catch (err) {
    console.error('GET /donation-eligibility failed:', err);
    return res.status(500).json({ error: 'Unable to check donation eligibility.' });
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

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);

    const cooldown = await checkDonationCooldown(donorId);
    if (cooldown.blocked) {
      return res.status(403).json({
        error: `You donated blood on ${cooldown.lastDonation.dateTime.toDateString()}. ` +
              `You are eligible to donate again on ${cooldown.nextEligibleDate.toDateString()}.`,
        code: 'DONATION_COOLDOWN',
        nextEligibleDate: cooldown.nextEligibleDate,
        lastDonationDate: cooldown.lastDonation.dateTime,
      });
    }

    const recentForm = await FormAnswers.exists({
      donor: donorId,
      createdAt: { $gte: cutoff },
    });

    if (!recentForm) {
      return res.status(403).json({
        error: 'Please complete the donor assessment form before booking. Your submission must be within the last day.',
      });
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
    void notifyAppointment(populated, 'booked').catch(() => console.error('Appointment booking notification failed'));
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

    const note = typeof req.body?.note === 'string'
    ? req.body.note.trim() : '';

    if (!note || note.length > 1000){
      return res.status(400).json({
        error: 'Enter a cancellation reason of 1-1000 characters.',
      });
    }

    const appt = await Appointment.findOne({ _id: id, donor: donorId });
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
    if (!['pending', 'approved'].includes(appt.status)) {
      return res.status(409).json({ error: 'Only open appointments can be cancelled.' });
    }

    appt.status = 'cancelled';
    appt.note = note;
    await appt.save();
    await appt.populate([
      { path: 'venue', select: 'facilityName' },
      { path: 'assocStaff', select: 'firstName lastName email' },
    ]);

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

    const changes = { status: action === 'approve' ? 'approved' : 'denied', assocStaff: staffId, decidedAt: new Date() };
    if (action === 'deny' && note) changes.note = note;
    const decided = await Appointment.findOneAndUpdate(
      { _id: id, venue: facilityId, status: 'pending' },
      { $set: changes }, { new: true, runValidators: true }
    );
    if (!decided) return res.status(409).json({ error: 'Only pending appointments can be decided.' });


    const populated = await decided.populate([
      { path: 'donor', select: 'firstName lastName email notificationPreferences' },
      { path: 'venue', select: 'facilityName address' },
    ]);

    const staff = await Staff.findById(staffId)
      .select('firstName lastName')
      .lean();

      
    res.json({ appointment: populated });

    if (action === 'approve') {
      void notifyAppointment(populated, 'approved').catch(() => console.error('Appointment approval SMS failed'));
      // Lazy-require to avoid circular deps and to keep module load fast
  

      // NOTE: date-only appointment → default to 9:00–10:00 AM.
      // If your Appointment schema has a real time field, use that instead.
      const startTime = new Date(populated.date);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(10, 0, 0, 0);

      // Make sure we have what we need before sending
      const latestDonor = await Donor.findById(populated.donor?._id).select('email notificationPreferences').lean();
      if (latestDonor?.email && getNotificationPreferences(latestDonor).email) {
        const reminders = [
          'Stay hydrated. Drink plenty of water before your donation.',
          'Eat iron-rich foods, such as lean meat, beans, and leafy green vegetables, in the days before your donation.',
          'Get enough sleep (7-9 hours) the night before your donation.',
          'Eat a healthy meal 1-3 hours before your donation. Avoid fatty foods and do not arrive on an empty stomach.',
          'Bring a valid ID for registration and verification.',
          'Ensure that you have answered and submitted the donor application form.',
          'Avoid alcohol before your donation and on the day of your appointment.',
          'Wear comfortable clothing with sleeves that can be raised above your elbow.',
          'Bring a list of any medicines you take and discuss them with the screening staff. Do not stop prescribed medicines on your own.',
          'If you feel unwell or develop a fever, contact the donation facility before attending to discuss rescheduling.',
          'Allow time for registration and donor screening, and follow any additional instructions from your donation facility.',
        ];

        const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        })[character]);
        const donorName = populated.donor.firstName || 'Donor';
        const facilityName = populated.venue?.facilityName || 'the facility';
        const staffName = [staff?.firstName, staff?.lastName].filter(Boolean).join(' ') || 'Donation team';

        sendAppointmentEmail({
          email: latestDonor.email,
          subject: 'Your Blood Donation Appointment is Confirmed',
          message: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Your donation appointment is confirmed</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f6f3f4;font-family:Arial,Helvetica,sans-serif;color:#30262a;">
              <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Your appointment is confirmed. Here is everything you need to prepare for your donation.</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f6f3f4;">
                <tr><td align="center" style="padding:32px 12px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #eadfe3;border-radius:16px;overflow:hidden;">
                    <tr><td style="padding:32px 28px;background-color:#991b3b;color:#ffffff;">
                      <p style="margin:0 0 20px;font-size:13px;font-weight:bold;letter-spacing:3px;">SANDUGO</p>
                      <p style="margin:0 0 10px;font-size:12px;font-weight:bold;letter-spacing:1px;color:#ffe0e8;">APPOINTMENT CONFIRMED</p>
                      <h1 style="margin:0;font-size:30px;line-height:1.2;">Your next act of kindness<br>is on the calendar.</h1>
                    </td></tr>
                    <tr><td style="padding:28px;">
                      <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(donorName)},</p>
                      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#63545a;">Your blood donation appointment has been approved. Thank you for making time to help save lives.</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fcf4f6;border:1px solid #f1dce3;border-radius:12px;">
                        <tr><td style="padding:20px;">
                          <h2 style="margin:0 0 16px;font-size:18px;color:#991b3b;">Your appointment</h2>
                          <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#78636b;">DATE</p>
                          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(startTime.toDateString())}</p>
                          <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#78636b;">DONATION FACILITY</p>
                          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(facilityName)}</p>
                          <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#78636b;">APPROVED BY</p>
                          <p style="margin:0;font-size:16px;line-height:1.5;">${escapeHtml(staffName)}</p>
                        </td></tr>
                      </table>
                      <h2 style="margin:28px 0 8px;font-size:22px;">A little preparation goes a long way</h2>
                      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#63545a;">Your pre-donation checklist for a comfortable visit.</p>
                      <ol style="margin:0;padding:0 0 0 24px;color:#991b3b;">
                        ${reminders.map(reminder => `<li style="padding:0 0 14px 6px;font-size:15px;line-height:1.6;"><span style="color:#493d42;">${escapeHtml(reminder)}</span></li>`).join('\n')}
                      </ol>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:12px;background-color:#f5f5f7;border-radius:10px;">
                        <tr><td style="padding:18px 20px;">
                          <p style="margin:0 0 6px;font-size:15px;font-weight:bold;">Save the date</p>
                          <p style="margin:0;font-size:14px;line-height:1.6;color:#63545a;">Open the attached calendar invite to add this appointment to your calendar.</p>
                        </td></tr>
                      </table>
                      <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">We look forward to welcoming you.<br><strong style="color:#991b3b;">The Sandugo Team</strong></p>
                    </td></tr>
                    <tr><td align="center" style="padding:20px 28px;border-top:1px solid #eee5e8;">
                      <p style="margin:0;font-size:12px;line-height:1.6;color:#78636b;">Every donation is a chance to make a difference.</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
          `,
          text:
            `Your appointment at ${populated.venue?.facilityName || 'the facility'} ` +
            `has been approved for ${startTime.toDateString()}.\n\n` +
            `Pre-donation reminders:\n` +
            reminders.map((reminder, index) => `${index + 1}. ${reminder}`).join('\n') +
            '\n\nPlease add your appointment to your calendar using the attached invite.',
          event: {
            start: startTime,
            end: endTime,
            summary: 'Blood Donation Appointment',
            location: populated.venue?.address || populated.venue?.facilityName || '',
            description: `Appointment ID: ${populated._id}`,
          },
        }).catch((emailErr) => {
          console.error('Failed to send appointment confirmation email:', emailErr);
        });
      } else if (!latestDonor?.email) {
        console.warn(
          `Appointment ${populated._id} approved but donor has no email address.`
        );
      }
    }
  } catch (err) {
    console.error('PATCH /staff-appointments/:id failed:', err);
    // Only reached if the DB update threw before res.json was called
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Unable to update that appointment.' });
    }
  }
});


module.exports = router;
