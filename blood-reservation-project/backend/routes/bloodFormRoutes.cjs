const express = require('express');
const router = express.Router();

const Donor = require('../../db/models/donor.cjs');
const Staff = require('../../db/models/staff.cjs');
const FormAnswers = require('../../db/models/formAnswers.cjs');
const AppointmentSchedule = require('../../db/models/appointmentSchedules.cjs');
const requireDonor = require('../middleware/requireDonor.cjs');
const requireStaff = require('../middleware/requireStaff.cjs');

const { checkDonationCooldown } = require('../utils/donationCooldown.cjs');


router.get('/form-recent', requireDonor, async(req,res) => {
    try {

        const {id} = req.user

        const donor = await Donor.findById(id).select('_id')
        if (!donor) {
            return res.status(404).json({ error: 'Donor not found.' });
        }

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 1);

        const recent = await FormAnswers.findOne({
            donor: id,
            createdAt: { $gte: cutoff },
        })
            .sort({ createdAt: -1 })
            .select('_id createdAt');

        if (!recent) {
            return res.json({
                hasRecentForm: false,
                validDays: 1,
            });
        }

        return res.json({
            hasRecentForm: true,
            submissionId: recent._id,
            submittedAt: recent.createdAt,
            validDays: 1,
        });

    } catch (err) {
        console.log(err)
        res.status(400).json({ error: 'Failed to get recent answer form.' })
    }
})


router.post('/form-answers', requireDonor, async (req, res) => {
  try {
    const cooldown = await checkDonationCooldown(req.user.id);
    if (cooldown.blocked) {
      return res.status(403).json({
        error: `You are in a 3-month donation cooldown. Next eligible date: ${cooldown.nextEligibleDate.toDateString()}.`,
        code: 'DONATION_COOLDOWN',
        nextEligibleDate: cooldown.nextEligibleDate,
        lastDonationDate: cooldown.lastDonation.dateTime,
      });
    }
    const doc = await FormAnswers.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
});



router.get('/donor-forms-today', requireStaff, async (req, res) => {
  try {
    // 1. Which facility does this staff member belong to?
    const staff = await Staff.findById(req.user.id).select('facilityID');
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found.' });
    }
    if (!staff.facilityID) {
      return res.status(400).json({ error: 'Staff is not assigned to a facility.' });
    }

    // 2. Define "today" in the server's local timezone.
    //    $gte start-of-day, $lt start-of-tomorrow — half-open range avoids
    //    the classic "23:59:59.999" gap.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfDay);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // 3. Every form submitted today (optionally: only forms from donors who
    //    have *any* appointment at this facility — see note below).
    const forms = await FormAnswers.find({
      createdAt: { $gte: startOfDay, $lt: startOfTomorrow },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'donor',
        select: 'firstName lastName donorID bloodType sex mobileNumber email',
      })
      .lean();

    if (forms.length === 0) {
      return res.json({ facilityId: staff.facilityID, count: 0, forms: [] });
    }

    // 4. Look up the most recent non-cancelled/non-denied appointment for
    //    each donor at this facility, created on or before each form.
    //    Done in one aggregation rather than N queries.
    const donorIds = forms.map((f) => f.donor?._id).filter(Boolean);

    const appointments = await AppointmentSchedule.aggregate([
      {
        $match: {
          donor: { $in: donorIds },
          venue: staff.facilityID,
          status: { $in: ['pending', 'approved', 'completed'] },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$donor',
          latest: { $first: '$$ROOT' },
        },
      },
    ]);

    const appointmentByDonor = new Map(
      appointments.map((a) => [String(a._id), a.latest])
    );

    // 5. Attach the matching appointment (or null) to each form.
    const enriched = forms.map((f) => {
      const donorKey = String(f.donor?._id);
      const appt = appointmentByDonor.get(donorKey) || null;
      // Only attach if the appointment existed when the form was submitted.
      const apptWasBeforeForm =
        appt && new Date(appt.createdAt) <= new Date(f.createdAt);
      return {
        ...f,
        appointment: apptWasBeforeForm ? appt : null,
      };
    });

    return res.json({
      facilityId: staff.facilityID,
      count: enriched.length,
      forms: enriched,
    });
  } catch (err) {
    console.error('GET /donor-forms-today failed:', err);
    return res.status(500).json({ error: 'Failed to load donor forms for today.' });
  }
});

module.exports = router;

