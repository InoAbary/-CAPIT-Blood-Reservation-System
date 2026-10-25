const express = require('express');

const BloodRequest =
    require('../../db/models/BloodRequest.cjs');

const Staff =
    require('../../db/models/staff.cjs');

const router = express.Router();


/*
 * GET /api/utilization/hospital/requests
 *
 * Returns blood requests belonging to
 * the currently logged-in hospital.
 */
router.get('/hospital/requests', async (req, res) => {
    try {

        const staff = await Staff
            .findById(req.user.id)
            .select('facilityID role');

        if (!staff) {
            return res.status(401).json({
                message: 'Invalid staff account.'
            });
        }

        if (staff.role !== 'hospital') {
            return res.status(403).json({
                message:
                    'Only hospital staff can access hospital utilization requests.'
            });
        }

        if (!staff.facilityID) {
            return res.status(400).json({
                message:
                    'Hospital staff account is not assigned to a hospital/facility.'
            });
        }

        const requests = await BloodRequest
            .find({
                hospitalFacilityID: staff.facilityID
            })
            .sort({
                createdAt: -1
            })
            .lean();

        return res.json({
            success: true,
            requests
        });

    } catch (error) {

        console.error(
            'Failed to load hospital utilization requests:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Unable to load hospital blood requests.'
        });
    }
});


module.exports = router;