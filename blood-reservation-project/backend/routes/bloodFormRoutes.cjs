const express = require('express');
const router = express.Router();

const Donor = require('../../db/models/donor.cjs');
const Staff = require('../../db/models/staff.cjs');
const FormAnswers = require('../../db/models/formAnswers.cjs');
const AppointmentSchedule = require('../../db/models/appointmentSchedules.cjs');
const requireDonor = require('../middleware/requireDonor.cjs');
const requireStaff = require('../middleware/requireStaff.cjs');

const { checkDonationCooldown } = require('../utils/donationCooldown.cjs');

function getTodayRangePH() {
  const now = new Date();

  const phDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const start = new Date(`${phDate}T00:00:00+08:00`);
  const end = new Date(`${phDate}T23:59:59.999+08:00`);

  return { start, end };
}

router.get('/form-today', requireDonor, async (req, res) => {
  try {
    const donorId = req.user.id;
    const { start, end } = getTodayRangePH();

    const submission = await FormAnswers.findOne({
      donor: donorId,
      createdAt: {
        $gte: start,
        $lte: end,
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      submitted: Boolean(submission),
      submission: submission || null,
    });
  } catch (err) {
    console.error('Failed to check today form:', err);

    return res.status(500).json({
      error: 'Could not check today’s prescreening form.',
    });
  }
});

router.get('/form-recent', requireDonor, async(req,res) => {
    try {

        const {id} = req.user

        const donor = await Donor.findById(id).select('_id')
        if (!donor) {
            return res.status(404).json({ error: 'Donor not found.' });
        }

        const { start, end } = getTodayRangePH();

        const recent = await FormAnswers.findOne({
          donor: id,
          createdAt: {
            $gte: start,
            $lte: end,
          },
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
    const donorId = req.user.id;
    const cooldown = await checkDonationCooldown(donorId);
    if (cooldown.blocked) {
      return res.status(403).json({
        error: `You are in a 3-month donation cooldown. Next eligible date: ${cooldown.nextEligibleDate.toDateString()}.`,
        code: 'DONATION_COOLDOWN',
        nextEligibleDate: cooldown.nextEligibleDate,
        lastDonationDate: cooldown.lastDonation.dateTime,
      });
    }
    
    const rawAnswers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const q33 = rawAnswers.find((a) => Number(a.qId) === 33);
    const q33SaysNo = q33 && q33.result === false;

    const DATE_ONLY_QIDS = new Set([34, 37]);

    const answers = rawAnswers
      // Drop Q34 when Q33 was answered "no"
      .filter((a) => !(Number(a.qId) === 34 && q33SaysNo))
      .map((a) => {
        const qId = Number(a.qId);
        if (DATE_ONLY_QIDS.has(qId)) {
          // Dates may be empty — coerce blank/null to undefined.
          return {
            qId,
            date: a.date ? new Date(a.date) : undefined,
          };
        }
        return a;
      });

      const { start, end } = getTodayRangePH();

      const existingSubmission = await FormAnswers.findOne({
        donor: donorId,
        createdAt: {
          $gte: start,
          $lte: end,
        },
      });
      
      if (existingSubmission) {
        return res.status(409).json({
          code: 'FORM_ALREADY_SUBMITTED_TODAY',
          error: 'You have already submitted your prescreening form today.',
          submission: existingSubmission,
        });
      }

      const doc = await FormAnswers.create({
        ...req.body,
        donor: donorId,
        answers,
      });

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
    const { start, end } = getTodayRangePH();

    // 3. Every form submitted today (optionally: only forms from donors who
    //    have *any* appointment at this facility — see note below).
    const forms = await FormAnswers.find({
      createdAt: {
        $gte: start,
        $lte: end,
      },
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
          date: {
            $gte: start,
            $lte: end,
          },
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
    const enriched = forms
      .map((f) => {
        const donorKey = String(f.donor?._id);
        const appt = appointmentByDonor.get(donorKey) || null;

        return {
          ...f,
          appointment: appt,
        };
      })
      .filter((f) => f.appointment);

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

