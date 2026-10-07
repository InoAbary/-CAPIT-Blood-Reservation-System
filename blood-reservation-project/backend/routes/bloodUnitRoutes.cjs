
const express = require('express');
const mongoose = require('mongoose');

const Facility = require('../../db/models/facilities.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const BloodUnitHistory = require('../../db/models/bloodUnitsHistory.cjs');
const Counter = require('../../db/models/counters.cjs');

const router = express.Router();

const BLOOD_TYPES = [
    'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'
];

const COMPONENTS = [
    'Packed RBC', 'Plasma', 'Platelets', 'Whole Blood'
];

const STATUSES = ['In-stock', 'Expired', 'Removed'];

const TRACKED_FIELDS = [
    'donorID',
'bloodType',
'component',
'collectionDate',
'expiryDate',
'status'
];

const validateFacilityId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
            message: 'Invalid facility ID.'
        });
    }

    next();
};

const getActorId = (req) => {
    const id = req.user?._id;

    return id && mongoose.Types.ObjectId.isValid(id)
    ? id
    : null;
};

const validatePayload = (body, isCreate = false) => {
    const errors = {};

    if (isCreate || body.donorID !== undefined) {
        if (typeof body.donorID !== 'string' || !body.donorID.trim()) {
            errors.donorID = 'Donor ID is required.';
        }
    }

    if (isCreate || body.bloodType !== undefined) {
        if (!BLOOD_TYPES.includes(body.bloodType)) {
            errors.bloodType = 'Invalid blood type.';
        }
    }

    if (isCreate || body.component !== undefined) {
        if (!COMPONENTS.includes(body.component)) {
            errors.component = 'Invalid blood component.';
        }
    }

    if (isCreate || body.collectionDate !== undefined) {
        if (
            typeof body.collectionDate !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(body.collectionDate) ||
            Number.isNaN(Date.parse(`${body.collectionDate}T00:00:00.000Z`)) ||
            new Date(`${body.collectionDate}T00:00:00.000Z`)
            .toISOString().slice(0, 10) !== body.collectionDate
        ) {
            errors.collectionDate = 'A valid collection date is required.';
        }
    }

    if (isCreate || body.expiryDate !== undefined) {
        if (
            typeof body.expiryDate !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(body.expiryDate) ||
            Number.isNaN(Date.parse(`${body.expiryDate}T00:00:00.000Z`)) ||
            new Date(`${body.expiryDate}T00:00:00.000Z`)
            .toISOString().slice(0, 10) !== body.expiryDate
        ) {
            errors.expiryDate = 'A valid expiry date is required.';
        }
    }

    if (body.status !== undefined && !STATUSES.includes(body.status)) {
        errors.status = 'Invalid blood-unit status.';
    }

    const collectionDate = body.collectionDate;
    const expiryDate = body.expiryDate;

    if (
        collectionDate &&
        expiryDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(collectionDate) &&
        /^\d{4}-\d{2}-\d{2}$/.test(expiryDate) &&
        expiryDate <= collectionDate
    ) {
        errors.expiryDate = 'Expiry must be after collection date.';
    }

    return errors;
};

const nextBloodUnitID = async () => {
    const counter = await Counter.findOneAndUpdate(
        { _id: 'bloodUnitID' },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return `BU${String(counter.sequence).padStart(8, '0')}`;
};

const getFacility = async (facilityId) => {
    return Facility.findById(facilityId);
};

// GET /api/facilities/:id/blood-units
router.get('/:id/blood-units', validateFacilityId, async (req, res) => {
    try {
        const facility = await getFacility(req.params.id);

        if (!facility) {
            return res.status(404).json({
                message: 'Facility not found.'
            });
        }

        const units = await BloodUnits.find({
            facilityID: facility._id.toString()
        })
        .sort({ dateAdded: -1 })
        .lean();

        res.json(units);
    } catch (err) {
        console.error('List blood units:', err);
        res.status(500).json({
            message: 'Failed to load blood units.'
        });
    }
});

// POST /api/facilities/:id/blood-units
router.post('/:id/blood-units', validateFacilityId, async (req, res) => {
    try {
        // const performedBy = null; TODO: get the user ID

        /*
        if (!performedBy) {
            return res.status(401).json({
                message: 'Authentication is required to create a blood unit.'
            });
        } */

        const facility = await getFacility(req.params.id);

        if (!facility) {
            return res.status(404).json({
                message: 'Facility not found.'
            });
        }

        const errors = validatePayload(req.body, true);

        if (Object.keys(errors).length) {
            return res.status(400).json({
                message: 'Invalid blood-unit data.',
                errors
            });
        }

        const bloodUnitID = await nextBloodUnitID();

        const unit = new BloodUnits({
            bloodUnitID,
            donorID: req.body.donorID.trim(),
                                    facilityID: facility._id.toString(),
                                    bloodType: req.body.bloodType,
                                    component: req.body.component,
                                    collectionDate: new Date(
                                        `${req.body.collectionDate}T00:00:00.000Z`
                                    ),
                                    expiryDate: new Date(
                                        `${req.body.expiryDate}T00:00:00.000Z`
                                    ),
                                    status: req.body.status || 'In-stock'
        });

        await unit.save();

        try {
            await BloodUnitHistory.logCreate(unit, {
                facilityID: facility._id
                // TODO: performedBy
            });
        } catch (historyError) {
            await BloodUnits.deleteOne({ _id: unit._id });
            throw historyError;
        }

        res.status(201).json(unit);
    } catch (err) {
        console.error('Create blood unit:', err);

        if (err.code === 11000) {
            return res.status(409).json({
                message: 'Blood-unit ID already exists.'
            });
        }

        res.status(500).json({
            message: 'Failed to create blood unit.'
        });
    }
});

// PUT /api/facilities/:id/blood-units/:bloodUnitID
router.put(
    '/:id/blood-units/:bloodUnitID',
    validateFacilityId,
    async (req, res) => {
        try {
            const performedBy = null // getActorId(req);
            /*
            if (!performedBy) {
                return res.status(401).json({
                    message: 'Authentication is required to update a blood unit.'
                });
            } */

            const facility = await getFacility(req.params.id);

            if (!facility) {
                return res.status(404).json({
                    message: 'Facility not found.'
                });
            }

            // Never allow clients to move a unit to another facility,
            // replace its generated ID, or overwrite audit metadata.
            const forbiddenFields = [
                'bloodUnitID',
                'facilityID',
                '_id',
                'dateAdded',
                'lastUpdated',
                'date',
                'performedBy'
            ];

            if (forbiddenFields.some((field) =>
                Object.prototype.hasOwnProperty.call(req.body, field)
            )) {
                return res.status(400).json({
                    message: 'System-managed fields cannot be changed.'
                });
            }

            const errors = validatePayload(req.body);

            if (Object.keys(errors).length) {
                return res.status(400).json({
                    message: 'Invalid blood-unit data.',
                    errors
                });
            }

            const unit = await BloodUnits.findOne({
                bloodUnitID: req.params.bloodUnitID,
                facilityID: facility._id.toString()
            });

            if (!unit) {
                return res.status(404).json({
                    message: 'Blood unit not found in this facility.'
                });
            }

            const before = unit.toObject();

            for (const field of TRACKED_FIELDS) {
                if (req.body[field] !== undefined) {
                    if (field === 'donorID') {
                        unit[field] = req.body[field].trim();
                    } else if (
                        field === 'collectionDate' ||
                        field === 'expiryDate'
                    ) {
                        unit[field] = new Date(
                            `${req.body[field]}T00:00:00.000Z`
                        );
                    } else {
                        unit[field] = req.body[field];
                    }
                }
            }

            const dateErrors = validatePayload({
                collectionDate: unit.collectionDate.toISOString().slice(0, 10),
                                               expiryDate: unit.expiryDate.toISOString().slice(0, 10)
            });

            if (Object.keys(dateErrors).length) {
                return res.status(400).json({
                    message: 'Invalid blood-unit dates.',
                    errors: dateErrors
                });
            }

            await unit.save();

            await BloodUnitHistory.logUpdate(before, unit, {
                facilityID: facility._id,
                performedBy
            });

            res.json(unit);
        } catch (err) {
            console.error('Update blood unit:', err);
            res.status(500).json({
                message: 'Failed to update blood unit.'
            });
        }
    }
);

// DELETE /api/facilities/:id/blood-units/:bloodUnitID
router.delete(
    '/:id/blood-units/:bloodUnitID',
    validateFacilityId,
    async (req, res) => {
        try {
            //TODO: const performedBy = getActorId(req);

            /*
            if (!performedBy) {
                return res.status(401).json({
                    message: 'Authentication is required to delete a blood unit.'
                });
            }*/

            const facility = await getFacility(req.params.id);

            if (!facility) {
                return res.status(404).json({
                    message: 'Facility not found.'
                });
            }

            const unit = await BloodUnits.findOne({
                bloodUnitID: req.params.bloodUnitID,
                facilityID: facility._id.toString()
            });

            if (!unit) {
                return res.status(404).json({
                    message: 'Blood unit not found in this facility.'
                });
            }

            await BloodUnitHistory.logDelete(unit, {
                facilityID: facility._id,
                performedBy
            });

            await unit.deleteOne();

            res.json({
                message: 'Blood unit deleted successfully.',
                bloodUnitID: unit.bloodUnitID
            });
        } catch (err) {
            console.error('Delete blood unit:', err);
            res.status(500).json({
                message: 'Failed to delete blood unit.'
            });
        }
    }
);

module.exports = router;
