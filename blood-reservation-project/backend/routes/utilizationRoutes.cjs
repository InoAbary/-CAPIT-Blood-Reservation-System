const express = require('express');
const mongoose = require('mongoose');

const BloodRequest = require('../../db/models/BloodRequest.cjs');
const Staff = require('../../db/models/staff.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const BloodReport = require('../../db/models/bloodReports.cjs');
const Counter = require('../../db/models/counters.cjs');

const router = express.Router();

const REPORT_STATUSES = [
    'Used',
    'Wasted',
    'Expired',
    'Unused'
];

const BSF_FACILITY_TYPES = [
    'bsf',
    'prc_chapter'
];

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const nextReportID = async () => {
    const counter = await Counter.findOneAndUpdate(
        { _id: 'reportID' },
        { $inc: { sequence: 1 } },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return `R${String(counter.sequence).padStart(8, '0')}`;
};

const getUtilizationStaff = async (userID) => {
    if (!userID || !mongoose.Types.ObjectId.isValid(userID)) {
        return null;
    }

    return Staff
        .findById(userID)
        .select('facilityID firstName lastName email role isActive')
        .populate(
            'facilityID',
            'facilityID facilityName facilityType typeLabel isActive'
        );
};

const isActiveAccount = (staff) => {
    return Boolean(
        staff &&
        staff.isActive !== false &&
        staff.facilityID &&
        staff.facilityID.isActive !== false
    );
};

const isHospitalAccount = (staff) => {
    return Boolean(
        isActiveAccount(staff) &&
        staff.role === 'hospital' &&
        staff.facilityID.facilityType === 'hospital'
    );
};

const isBSFAccount = (staff) => {
    return Boolean(
        isActiveAccount(staff) &&
        staff.role !== 'hospital' &&
        BSF_FACILITY_TYPES.includes(
            staff.facilityID.facilityType
        )
    );
};

const getUtilizationSide = (staff) => {
    if (isHospitalAccount(staff)) {
        return 'hospital';
    }

    if (isBSFAccount(staff)) {
        return 'bsf';
    }

    return null;
};

const requireHospitalAccount = async (req, res) => {
    const staff = await getUtilizationStaff(req.user?.id);

    if (!staff) {
        res.status(401).json({
            success: false,
            message: 'Invalid staff account.'
        });

        return null;
    }

    if (!isHospitalAccount(staff)) {
        res.status(403).json({
            success: false,
            message:
                'Only active hospital accounts assigned to a hospital facility can access hospital utilization.'
        });

        return null;
    }

    return staff;
};

const requireBSFAccount = async (req, res) => {
    const staff = await getUtilizationStaff(req.user?.id);

    if (!staff) {
        res.status(401).json({
            success: false,
            message: 'Invalid staff account.'
        });

        return null;
    }

    if (!isBSFAccount(staff)) {
        res.status(403).json({
            success: false,
            message:
                'Only active BSF or PRC accounts can access BSF utilization.'
        });

        return null;
    }

    return staff;
};


/*
 * ============================================================
 * GET /api/utilization/access
 *
 * Determines which utilization interface the logged-in
 * account is allowed to access.
 * ============================================================
 */

router.get('/access', async (req, res) => {
    try {
        const staff = await getUtilizationStaff(req.user?.id);

        if (!staff) {
            return res.status(401).json({
                success: false,
                message: 'Invalid staff account.'
            });
        }

        const side = getUtilizationSide(staff);

        if (!side) {
            return res.status(403).json({
                success: false,
                message:
                    'This account is not assigned to a valid utilization facility.'
            });
        }

        return res.json({
            success: true,
            side,
            staff: {
                _id: staff._id,
                firstName: staff.firstName,
                lastName: staff.lastName,
                email: staff.email,
                role: staff.role,
                facility: {
                    _id: staff.facilityID._id,
                    facilityID:
                        staff.facilityID.facilityID,
                    facilityName:
                        staff.facilityID.facilityName,
                    facilityType:
                        staff.facilityID.facilityType,
                    typeLabel:
                        staff.facilityID.typeLabel
                }
            }
        });
    } catch (error) {
        console.error(
            'Failed to determine utilization access:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Unable to determine utilization access.'
        });
    }
});


/*
 * ============================================================
 * GET /api/utilization/hospital/requests
 *
 * Returns requests belonging to the logged-in hospital.
 * Also indicates whether utilization has already been
 * submitted for each request.
 * ============================================================
 */

router.get('/hospital/requests', async (req, res) => {
    try {
        const staff = await requireHospitalAccount(req, res);

        if (!staff) {
            return;
        }

        const requests = await BloodRequest
            .find({
                hospitalFacilityID:
                    staff.facilityID._id
            })
            .sort({
                createdAt: -1
            })
            .lean();

        const requestIDs = requests.map(
            (request) => request._id
        );

        const units = await BloodUnits
            .find({
                requestID: {
                    $in: requestIDs
                }
            })
            .select('_id requestID')
            .lean();

        const unitIDs = units.map(
            (unit) => unit._id
        );

        const reports = await BloodReport
            .find({
                bloodUnitID: {
                    $in: unitIDs
                }
            })
            .select('bloodUnitID')
            .lean();

        const reportedUnitIDs = new Set(
            reports.map(
                (report) =>
                    String(report.bloodUnitID)
            )
        );

        const requestsWithUtilization =
            requests.map((request) => {
                const requestUnits = units.filter(
                    (unit) =>
                        String(unit.requestID) ===
                        String(request._id)
                );

                const utilizationSubmitted =
                    requestUnits.some(
                        (unit) =>
                            reportedUnitIDs.has(
                                String(unit._id)
                            )
                    );

                return {
                    ...request,
                    utilizationSubmitted
                };
            });

        return res.json({
            success: true,
            requests: requestsWithUtilization
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


/*
 * ============================================================
 * GET /api/utilization/hospital/reports
 *
 * Returns utilization reports belonging to the logged-in
 * hospital.
 * ============================================================
 */

router.get('/hospital/reports', async (req, res) => {
    try {
        const staff = await requireHospitalAccount(req, res);

        if (!staff) {
            return;
        }

        const hospitalRequests = await BloodRequest
            .find({
                hospitalFacilityID:
                    staff.facilityID._id
            })
            .select('_id')
            .lean();

        const requestIDs = hospitalRequests.map(
            (request) => request._id
        );

        const hospitalUnits = await BloodUnits
            .find({
                requestID: {
                    $in: requestIDs
                }
            })
            .select(
                '_id bloodUnitID bloodType component requestID releasedAt'
            )
            .lean();

        const unitIDs = hospitalUnits.map(
            (unit) => unit._id
        );

        const reports = await BloodReport
            .find({
                bloodUnitID: {
                    $in: unitIDs
                }
            })
            .populate(
                'bloodUnitID',
                'bloodUnitID bloodType component requestID releasedAt'
            )
            .populate(
                'reportedBy',
                'firstName lastName email'
            )
            .sort({
                dateCreated: -1
            })
            .lean();

        return res.json({
            success: true,
            reports
        });
    } catch (error) {
        console.error(
            'Failed to load hospital utilization reports:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Unable to load previous utilization reports.'
        });
    }
});


/*
 * ============================================================
 * GET /api/utilization/hospital/requests/:requestId/units
 *
 * Returns released blood units belonging to one request
 * made by the logged-in hospital.
 * ============================================================
 */

router.get(
    '/hospital/requests/:requestId/units',
    async (req, res) => {
        try {
            const { requestId } = req.params;

            if (
                !mongoose.Types.ObjectId.isValid(
                    requestId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid blood request ID.'
                });
            }

            const staff =
                await requireHospitalAccount(
                    req,
                    res
                );

            if (!staff) {
                return;
            }

            const request =
                await BloodRequest.findOne({
                    _id: requestId,
                    hospitalFacilityID:
                        staff.facilityID._id
                }).lean();

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Blood request was not found for this hospital.'
                });
            }

            const units = await BloodUnits
                .find({
                    requestID: request._id,
                    status: 'Released'
                })
                .sort({
                    releasedAt: 1
                })
                .lean();

            return res.json({
                success: true,
                request,
                units
            });
        } catch (error) {
            console.error(
                'Failed to load released blood units:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to load released blood units.'
            });
        }
    }
);


/*
 * ============================================================
 * POST /api/utilization/hospital/requests/:requestId/reports
 *
 * Submits utilization for ALL released blood units belonging
 * to one fulfilled request.
 *
 * One request can only be submitted once.
 * One BloodReport document is created per physical blood unit.
 * ============================================================
 */

router.post(
    '/hospital/requests/:requestId/reports',
    async (req, res) => {
        try {
            const { requestId } = req.params;
            const { reports } = req.body;

            if (
                !mongoose.Types.ObjectId.isValid(
                    requestId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid blood request ID.'
                });
            }

            if (
                !Array.isArray(reports) ||
                reports.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'At least one utilization report is required.'
                });
            }

            const staff =
                await requireHospitalAccount(
                    req,
                    res
                );

            if (!staff) {
                return;
            }

            const request =
                await BloodRequest.findOne({
                    _id: requestId,
                    hospitalFacilityID:
                        staff.facilityID._id
                });

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Blood request was not found for this hospital.'
                });
            }

            if (
                request.requestStatus !==
                'Fulfilled'
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Utilization can only be submitted after the request has been fully fulfilled.'
                });
            }

            const releasedUnits =
                await BloodUnits.find({
                    requestID: request._id,
                    status: 'Released'
                });

            if (releasedUnits.length === 0) {
                return res.status(400).json({
                    success: false,
                    message:
                        'No released blood units were found for this request.'
                });
            }

            const releasedUnitIDs =
                releasedUnits.map(
                    (unit) => unit._id
                );

            const existingReport =
                await BloodReport.findOne({
                    bloodUnitID: {
                        $in: releasedUnitIDs
                    }
                });

            if (existingReport) {
                return res.status(409).json({
                    success: false,
                    message:
                        'Utilization has already been submitted for this blood request.'
                });
            }

            if (
                reports.length !==
                releasedUnits.length
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'A utilization status must be submitted for every released blood unit in this request.'
                });
            }

            const releasedUnitMap = new Map(
                releasedUnits.map(
                    (unit) => [
                        String(unit._id),
                        unit
                    ]
                )
            );

            const submittedUnitIDs = new Set();
            const validatedReports = [];

            for (const item of reports) {
                if (
                    !item.bloodUnitID ||
                    !mongoose.Types.ObjectId.isValid(
                        item.bloodUnitID
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'A valid blood unit ID is required.'
                    });
                }

                const unitID =
                    String(item.bloodUnitID);

                if (
                    submittedUnitIDs.has(unitID)
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'The same blood unit cannot be reported more than once.'
                    });
                }

                submittedUnitIDs.add(unitID);

                const unit =
                    releasedUnitMap.get(unitID);

                if (!unit) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'One or more blood units do not belong to this released request.'
                    });
                }

                if (
                    !REPORT_STATUSES.includes(
                        item.status
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'Invalid utilization status.'
                    });
                }

                validatedReports.push({
                    unit,
                    status: item.status,
                    description:
                        typeof item.description ===
                        'string'
                            ? item.description.trim()
                            : ''
                });
            }

            if (
                submittedUnitIDs.size !==
                releasedUnitIDs.length
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Every released blood unit must have a utilization status.'
                });
            }

            const savedReports = [];

            for (
                const item of validatedReports
            ) {
                const reportID =
                    await nextReportID();

                const report =
                    await BloodReport.create({
                        reportID,
                        bloodUnitID:
                            item.unit._id,
                        status:
                            item.status,
                        description:
                            item.description,
                        reportSource:
                            'Hospital',
                        isAssumed:
                            false,
                        reportedBy:
                            staff._id,
                        dateCreated:
                            new Date()
                    });

                savedReports.push(report);
            }

            return res.status(201).json({
                success: true,
                message:
                    'Utilization report submitted successfully.',
                reports: savedReports
            });
        } catch (error) {
            console.error(
                'Failed to submit utilization report:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to submit utilization report.'
            });
        }
    }
);


/*
 * ============================================================
 * GET /api/utilization/bsf/reports
 *
 * Returns utilization reports for blood units belonging to
 * the logged-in BSF / PRC facility.
 *
 * Hospital-submitted reports and future system-generated
 * reports are read from the same BloodReport collection.
 * ============================================================
 */

router.get('/bsf/reports', async (req, res) => {
    try {
        const staff =
            await requireBSFAccount(
                req,
                res
            );

        if (!staff) {
            return;
        }

        /*
         * BloodUnits.facilityID uses the custom facilityID string,
         * while Staff.facilityID references the Facilities document.
         */
        const facilityCode =
            staff.facilityID.facilityID;

        const facilityUnits =
            await BloodUnits
                .find({
                    facilityID: facilityCode
                })
                .select('_id')
                .lean();

        const unitIDs =
            facilityUnits.map(
                (unit) => unit._id
            );

        const reports =
            await BloodReport
                .find({
                    bloodUnitID: {
                        $in: unitIDs
                    }
                })
                .populate({
                    path: 'bloodUnitID',
                    select:
                        'bloodUnitID bloodType component requestID releasedAt facilityID',
                    populate: {
                        path: 'requestID',
                        select:
                            'requestID hospital hospitalFacilityID requestStatus fulfilledAt',
                        populate: {
                            path:
                                'hospitalFacilityID',
                            select:
                                'facilityID facilityName facilityType typeLabel'
                        }
                    }
                })
                .populate({
                    path: 'reportedBy',
                    select:
                        'firstName lastName email role facilityID',
                    populate: {
                        path: 'facilityID',
                        select:
                            'facilityID facilityName facilityType typeLabel'
                    }
                })
                .sort({
                    dateCreated: -1
                })
                .lean();

        return res.json({
            success: true,
            facility: {
                _id:
                    staff.facilityID._id,
                facilityID:
                    staff.facilityID.facilityID,
                facilityName:
                    staff.facilityID.facilityName,
                facilityType:
                    staff.facilityID.facilityType
            },
            reports
        });
    } catch (error) {
        console.error(
            'Failed to load BSF utilization reports:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Unable to load BSF utilization reports.'
        });
    }
});


module.exports = router;