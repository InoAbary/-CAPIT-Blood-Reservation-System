const express = require('express');
const mongoose = require('mongoose');

const syncInventory = require('../services/syncInventory.cjs');

const Facility = require('../../db/models/facilities.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const BloodUnitHistory = require('../../db/models/bloodUnitsHistory.cjs');
const Counter = require('../../db/models/counters.cjs');
const User = require('../../db/models/users.cjs');

const router = express.Router();


const BLOOD_TYPES = [
    'A+',
    'A-',
    'B+',
    'B-',
    'O+',
    'O-',
    'AB+',
    'AB-'
];

const COMPONENTS = [
    'Packed RBC',
    'Plasma',
    'Platelets',
    'Whole Blood'
];

const STATUSES = [
    'In-stock',
    'Expired',
    'Removed'
];

const TRACKED_FIELDS = [
    'donorID',
    'bloodType',
    'component',
    'collectionDate',
    'expiryDate',
    'status'
];


/*
 * Validate the MongoDB facility ID supplied in the URL.
 */
const validateFacilityId = (req, res, next) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

        return res.status(400).json({
            message: 'Invalid facility ID.'
        });
    }

    next();
};


/*
 * Return the authenticated user's ID when authentication
 * is available.
 *
 * TODO: Authentication middleware will eventually populate req.user.
 * Until then, history records may have performedBy = null.
 */
const getActorId = (req) => {

    const id = req.user?._id;

    return id && mongoose.Types.ObjectId.isValid(id)
        ? id
        : null;
};


/*
 * Validate fields supplied when creating or updating
 * a blood unit.
 */
const validatePayload = (body, isCreate = false) => {

    const errors = {};


    if (isCreate || body.donorID !== undefined) {

        if (
            typeof body.donorID !== 'string' ||
            !body.donorID.trim()
        ) {
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
            Number.isNaN(
                Date.parse(
                    `${body.collectionDate}T00:00:00.000Z`
                )
            ) ||
            new Date(
                `${body.collectionDate}T00:00:00.000Z`
            ).toISOString().slice(0, 10) !== body.collectionDate
        ) {
            errors.collectionDate =
                'A valid collection date is required.';
        }
    }


    if (isCreate || body.expiryDate !== undefined) {

        if (
            typeof body.expiryDate !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(body.expiryDate) ||
            Number.isNaN(
                Date.parse(
                    `${body.expiryDate}T00:00:00.000Z`
                )
            ) ||
            new Date(
                `${body.expiryDate}T00:00:00.000Z`
            ).toISOString().slice(0, 10) !== body.expiryDate
        ) {
            errors.expiryDate =
                'A valid expiry date is required.';
        }
    }


    if (
        body.status !== undefined &&
        !STATUSES.includes(body.status)
    ) {
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
        errors.expiryDate =
            'Expiry must be after collection date.';
    }


    return errors;
};


/*
 * Generate the next readable blood-unit ID.
 *
 * Example:
 * BU00000001
 * BU00000002
 */
const nextBloodUnitID = async () => {

    const counter = await Counter.findOneAndUpdate(
        {
            _id: 'bloodUnitID'
        },
        {
            $inc: {
                sequence: 1
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return `BU${String(counter.sequence).padStart(8, '0')}`;
};


/*
 * Find a facility using MongoDB's built-in _id.
 */
const getFacility = async (facilityId) => {

    return Facility.findById(facilityId);
};


/*
 * GET /api/facilities/:id/blood-units
 *
 * Return all blood units belonging to the selected facility.
 */
router.get(
    '/:id/blood-units',
    validateFacilityId,
    async (req, res) => {

        try {

            const facility = await getFacility(req.params.id);


            if (!facility) {

                return res.status(404).json({
                    message: 'Facility not found.'
                });
            }


            const units = await BloodUnits.find({
                facilityID: facility._id
            })
                .sort({
                    dateAdded: -1
                })
                .lean();


            res.json(units);

        } catch (err) {

            console.error(
                'List blood units:',
                err
            );

            res.status(500).json({
                message: 'Failed to load blood units.'
            });
        }
    }
);


/*
 * GET /api/facilities/:id/blood-unit-history
 *
 * Return the audit history for blood units belonging
 * to the selected facility.
 */
router.get(
    '/:id/blood-unit-history',
    validateFacilityId,
    async (req, res) => {

        try {

            const facility = await getFacility(req.params.id);


            if (!facility) {

                return res.status(404).json({
                    message: 'Facility not found.'
                });
            }


            const history = await BloodUnitHistory
                .find({
                    facilityID: facility._id
                })
                .populate(
                    'performedBy',
                    'firstName lastName email role'
                )
                .sort({
                    date: -1
                })
                .lean();


            res.json(history);

        } catch (err) {

            console.error(
                'Load blood unit history:',
                err
            );

            res.status(500).json({
                message:
                    'Failed to load blood unit history.'
            });
        }
    }
);


/*
 * POST /api/facilities/:id/blood-units
 *
 * Create a new blood unit.
 */
router.post(
    '/:id/blood-units',
    validateFacilityId,
    async (req, res) => {

        try {

            const performedBy = getActorId(req);


            const facility = await getFacility(req.params.id);


            if (!facility) {

                return res.status(404).json({
                    message: 'Facility not found.'
                });
            }


            const errors = validatePayload(
                req.body,
                true
            );


            if (Object.keys(errors).length) {

                return res.status(400).json({
                    message: 'Invalid blood-unit data.',
                    errors
                });
            }


            const bloodUnitID = await nextBloodUnitID();


            const unit = new BloodUnits({

                bloodUnitID,

                donorID:
                    req.body.donorID.trim(),

                facilityID:
                    facility._id,

                bloodType:
                    req.body.bloodType,

                component:
                    req.body.component,

                collectionDate:
                    new Date(
                        `${req.body.collectionDate}T00:00:00.000Z`
                    ),

                expiryDate:
                    new Date(
                        `${req.body.expiryDate}T00:00:00.000Z`
                    ),

                status:
                    req.body.status || 'In-stock'
            });


            await unit.save();


            try {

                await BloodUnitHistory.logCreate(
                    unit,
                    {
                        facilityID:
                            facility._id,

                        performedBy
                    }
                );

            } catch (historyError) {

                /*
                 * If the audit record cannot be created,
                 * remove the blood unit so that the main
                 * record and audit trail do not disagree.
                 */
                await BloodUnits.deleteOne({
                    _id: unit._id
                });

                throw historyError;
            }


            /*
             * BloodUnits is the source of truth.
             * Recalculate Inventory after the unit is created.
             */
            await syncInventory(facility);


            res.status(201).json(unit);

        } catch (err) {

            console.error(
                'Create blood unit:',
                err
            );


            if (err.code === 11000) {

                return res.status(409).json({
                    message:
                        'Blood-unit ID already exists.'
                });
            }


            res.status(500).json({
                message:
                    'Failed to create blood unit.'
            });
        }
    }
);


/*
 * PUT /api/facilities/:id/blood-units/:bloodUnitID
 *
 * Update an existing blood unit.
 */
router.put(
    '/:id/blood-units/:bloodUnitID',
    validateFacilityId,
    async (req, res) => {

        try {

            const performedBy = getActorId(req);


            const facility = await getFacility(
                req.params.id
            );


            if (!facility) {

                return res.status(404).json({
                    message: 'Facility not found.'
                });
            }


            /*
             * These fields are managed by the server and
             * must never be modified directly by clients.
             */
            const forbiddenFields = [
                'bloodUnitID',
                'facilityID',
                '_id',
                'dateAdded',
                'lastUpdated',
                'date',
                'performedBy'
            ];


            if (
                forbiddenFields.some(
                    (field) =>
                        Object.prototype
                            .hasOwnProperty
                            .call(
                                req.body,
                                field
                            )
                )
            ) {

                return res.status(400).json({
                    message:
                        'System-managed fields cannot be changed.'
                });
            }


            const errors = validatePayload(
                req.body
            );


            if (Object.keys(errors).length) {

                return res.status(400).json({
                    message:
                        'Invalid blood-unit data.',
                    errors
                });
            }


            const unit = await BloodUnits.findOne({
                bloodUnitID:
                    req.params.bloodUnitID,

                facilityID:
                    facility._id
            });


            if (!unit) {

                return res.status(404).json({
                    message:
                        'Blood unit not found in this facility.'
                });
            }


            /*
             * Save the original state for the audit log.
             */
            const before = unit.toObject();


            /*
             * Only fields explicitly allowed in
             * TRACKED_FIELDS can be changed.
             */
            for (const field of TRACKED_FIELDS) {

                if (req.body[field] !== undefined) {

                    if (field === 'donorID') {

                        unit[field] =
                            req.body[field].trim();

                    } else if (
                        field === 'collectionDate' ||
                        field === 'expiryDate'
                    ) {

                        unit[field] =
                            new Date(
                                `${req.body[field]}T00:00:00.000Z`
                            );

                    } else {

                        unit[field] =
                            req.body[field];
                    }
                }
            }


            /*
             * Revalidate collection and expiry dates after
             * applying partial updates.
             *
             * This catches cases such as changing only the
             * collection date so that it becomes later than
             * the existing expiry date.
             */
            const dateErrors = validatePayload({

                collectionDate:
                    unit.collectionDate
                        .toISOString()
                        .slice(0, 10),

                expiryDate:
                    unit.expiryDate
                        .toISOString()
                        .slice(0, 10)
            });


            if (Object.keys(dateErrors).length) {

                return res.status(400).json({
                    message:
                        'Invalid blood-unit dates.',

                    errors:
                        dateErrors
                });
            }


            await unit.save();


            /*
             * logUpdate automatically skips creating a
             * history record if nothing actually changed.
             */
            await BloodUnitHistory.logUpdate(
                before,
                unit,
                {
                    facilityID:
                        facility._id,

                    performedBy
                }
            );


            /*
             * Recalculate Inventory because edits to blood
             * type, component, expiry date, or status may
             * change stock totals.
             */
            await syncInventory(facility);


            res.json(unit);

        } catch (err) {

            console.error(
                'Update blood unit:',
                err
            );

            res.status(500).json({
                message:
                    'Failed to update blood unit.'
            });
        }
    }
);


/*
 * DELETE /api/facilities/:id/blood-units/:bloodUnitID
 *
 * Permanently delete an incorrectly entered blood-unit
 * database record.
 *
 * Routine stock removal should use status = "Removed"
 * instead of deleting the record.
 */
router.delete(
    '/:id/blood-units/:bloodUnitID',
    validateFacilityId,
    async (req, res) => {

        try {

            const performedBy = getActorId(req);


            const facility = await getFacility(
                req.params.id
            );


            if (!facility) {

                return res.status(404).json({
                    message: 'Facility not found.'
                });
            }


            const unit = await BloodUnits.findOne({

                bloodUnitID:
                    req.params.bloodUnitID,

                facilityID:
                    facility._id
            });


            if (!unit) {

                return res.status(404).json({
                    message:
                        'Blood unit not found in this facility.'
                });
            }


            /*
             * Preserve the blood-unit snapshot in the
             * audit history before deleting the record.
             */
            await BloodUnitHistory.logDelete(
                unit,
                {
                    facilityID:
                        facility._id,

                    performedBy
                }
            );


            await unit.deleteOne();


            /*
             * Recalculate Inventory after deletion.
             */
            await syncInventory(facility);


            res.json({
                message:
                    'Blood unit deleted successfully.',

                bloodUnitID:
                    unit.bloodUnitID
            });

        } catch (err) {

            console.error(
                'Delete blood unit:',
                err
            );

            res.status(500).json({
                message:
                    'Failed to delete blood unit.'
            });
        }
    }
);


module.exports = router;