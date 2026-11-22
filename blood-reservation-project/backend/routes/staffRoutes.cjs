const express = require('express');
const Staff = require('../../db/models/staff.cjs');
const Facility = require('../../db/models/facilities.cjs');
const BloodRequest = require('../../db/models/BloodRequest.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const Appointment = require('../../db/models/appointmentSchedules.cjs');

const router = express.Router();

async function getStaffContext(req, res) {
  const user = await Staff.findOne({ _id: req.user.id, isActive: true })
    .select('facilityID firstName lastName email role').lean();
  if (!user) return res.status(401).json({ error: 'Your staff account is unavailable.' }), null;
  if (!user.facilityID) return res.status(409).json({ error: 'Your account is not assigned to a facility.' }), null;
  const facility = await Facility.findById(user.facilityID).lean();
  if (!facility) return res.status(409).json({ error: 'Your assigned facility could not be found.' }), null;
  return { user, facility };
}

router.get('/dashboard', async (req, res) => {
  try {
    const ctx = await getStaffContext(req, res);
    if (!ctx) return;
    const { facility, user } = ctx;

    const isProvider = ['bsf', 'prc_chapter', 'hospital_bsf'].includes(facility.facilityType);
    const isHospital = ['hospital', 'hospital_bsf'].includes(facility.facilityType);

    const [pendingBloodRequests, totalBloodRequests] = isProvider
      ? await Promise.all([
          BloodRequest.countDocuments({ receivingFacilityID: facility._id, requestStatus: { $in: ['Pending', 'Allocated', 'Partially Fulfilled'] } }),
          BloodRequest.countDocuments({ receivingFacilityID: facility._id }),
        ])
      : [0, 0];

    const hospitalRequestIds = isHospital
      ? await BloodRequest.find({ hospitalFacilityID: facility._id }).select('_id').lean()
      : [];

      const [openRequests, totalRequests] = isHospital
      ? await Promise.all([
          BloodRequest.countDocuments({ hospitalFacilityID: facility._id, requestStatus: { $in: ['Pending', 'Allocated','Approved', 'Partially Fulfilled'] } }),
          BloodRequest.countDocuments({ hospitalFacilityID: facility._id }),
        ])
      : [0, 0];

      const [hospitalReleasedUnits, bsfReleasedUnits] = await Promise.all([
        isHospital
          ? BloodUnits.countDocuments({
              requestID: { $in: hospitalRequestIds.map(request => request._id) },
              status: 'Released',
            })
          : 0,
        isProvider
          ? BloodUnits.countDocuments({
              facilityID: { $in: [String(facility._id), facility.facilityID] },
              status: 'Released',
            })
          : 0,
      ]);

    return res.json({
      staff: {
        id: String(user._id),
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        role: user.role,
      },
      facility: {
        id: String(facility._id),
        code: facility.facilityID,
        name: facility.facilityName,
        facilityType: facility.facilityType,
        typeLabel: facility.typeLabel,
        address: facility.address,
        isActive: facility.isActive !== false,
      },
      summary: {
        pendingBloodRequests,
        totalBloodRequests,
        openRequests,
        totalRequests,
        releasedUnits: isHospital ? hospitalReleasedUnits : bsfReleasedUnits,
        hospitalReleasedUnits,
        bsfReleasedUnits,
        // reportedUnits: count from BloodReport if you want it; omitted here
      },
    });
  } catch (error) {
    console.error('Staff dashboard failed:', error);
    return res.status(500).json({ error: 'Failed to load your staff dashboard.' });
  }
});

router.get('/pending-counts', async (req, res) => {
  res.set('Cache-Control', 'no-store');

  try {
    const ctx = await getStaffContext(req, res);
    if (!ctx) return;

    const { user, facility } = ctx;

    const isHybridFacility = facility.facilityType === 'hospital_bsf';
    const isProvider = ['bsf', 'prc_chapter', 'hospital_bsf'].includes(facility.facilityType);
    const canViewPendingCounts =
      ['staff', 'branch-admin'].includes(user.role) ||
      (isHybridFacility && user.role === 'hospital');

      if (!canViewPendingCounts || !isProvider || facility.isActive === false) {
        return res.status(403).json({
          error: 'Pending counts are available to active BSF/PRC staff.',
        });
      }

    const [bloodRequests, appointments] = await Promise.all([
      BloodRequest.countDocuments({
        receivingFacilityID: facility._id,
        requestStatus: { $in: ['Pending', 'Allocated', 'Partially Fulfilled'] },
      }),
      Appointment.countDocuments({
        venue: facility._id,
        status: 'pending',
      }),
    ]);

    return res.json({
      'branch-requests': bloodRequests,
      appointments,
    });
  } catch (error) {
    console.error('Pending counts failed:', error.message);
    return res.status(500).json({
      error: 'Could not load pending counts.',
    });
  }
});

module.exports = router;