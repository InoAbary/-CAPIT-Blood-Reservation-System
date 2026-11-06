const express = require('express');
const Staff = require('../../db/models/staff.cjs');
const Facility = require('../../db/models/facilities.cjs');
const BloodRequest = require('../../db/models/BloodRequest.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');

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

    const isProvider = ['bsf', 'prc_chapter'].includes(facility.facilityType);

    const [pendingBloodRequests, totalBloodRequests] = isProvider
      ? await Promise.all([
          BloodRequest.countDocuments({ receivingFacilityID: facility._id, requestStatus: 'Pending' }),
          BloodRequest.countDocuments({ receivingFacilityID: facility._id }),
        ])
      : [0, 0];

    const hospitalRequestIds = facility.facilityType === 'hospital'
      ? await BloodRequest.find({ hospitalFacilityID: facility._id }).select('_id').lean()
      : [];

    const [openRequests, totalRequests] = facility.facilityType === 'hospital'
      ? await Promise.all([
          BloodRequest.countDocuments({ hospitalFacilityID: facility._id, requestStatus: { $in: ['Pending', 'Approved', 'Partially Fulfilled'] } }),
          BloodRequest.countDocuments({ hospitalFacilityID: facility._id }),
        ])
      : [0, 0];

    const releasedUnits = facility.facilityType === 'hospital'
      ? await BloodUnits.countDocuments({
          requestID: { $in: hospitalRequestIds.map((r) => r._id) },
          status: 'Released',
        })
      : await BloodUnits.countDocuments({ facilityID: facility.facilityID, status: 'Released' });

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
        releasedUnits,
        // reportedUnits: count from BloodReport if you want it; omitted here
      },
    });
  } catch (error) {
    console.error('Staff dashboard failed:', error);
    return res.status(500).json({ error: 'Failed to load your staff dashboard.' });
  }
});


module.exports = router;