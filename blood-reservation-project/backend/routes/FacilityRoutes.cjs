const express = require('express');
const mongoose = require('mongoose');

const Facility = require('../../db/models/facilities.cjs');
const Inventory = require('../../db/models/inventories.cjs');
const syncInventory = require('../services/syncInventory.cjs');

const router = express.Router();


const validateId = (req, res, next) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

        return res.status(400).json({
            message: 'Invalid facility id.'
        });
    }

    next();
};


// GET /api/facilities
// Return active facilities for the facility dropdown.
router.get('/', async (req, res) => {

    try {

        const facilities = await Facility
            .find({
                isActive: true
            })
            .select('facilityName')
            .sort({
                facilityName: 1
            })
            .lean();


        res.json(facilities);

    } catch (err) {

        console.error(
            'Load facilities:',
            err
        );

        res.status(500).json({
            message: 'Failed to load facilities.'
        });
    }
});


// GET /api/facilities/:id
// Return the full details of one facility.
router.get(
    '/:id',
    validateId,
    async (req, res) => {

        try {

            const facility = await Facility
                .findById(req.params.id)
                .lean();


            if (!facility) {

                return res.status(404).json({
                    message: 'Facility not found.'
                });
            }


            res.json(facility);

        } catch (err) {

            console.error(
                'Load facility:',
                err
            );

            res.status(500).json({
                message: 'Failed to load facility.'
            });
        }
    }
);


// GET /api/facilities/:id/inventory
// Recount the facility's blood units, update its inventory
// summary, then return the inventory rows.
router.get(
    '/:id/inventory',
    validateId,
    async (req, res) => {

        try {

            const facility = await Facility
                .findById(req.params.id)
                .lean();


            if (!facility) {

                return res.status(404).json({
                    message: 'Facility not found.'
                });
            }


            await syncInventory(facility);


            const items = await Inventory
                .find({
                    facilityID: facility._id
                })
                .select(
                    'bloodType component availQuantity availStatus lastUpdated'
                )
                .sort({
                    component: 1,
                    bloodType: 1
                })
                .lean();


            res.json(items);

        } catch (err) {

            console.error(
                'Load inventory:',
                err
            );

            res.status(500).json({
                message: 'Failed to load inventory.'
            });
        }
    }
);


module.exports = router;