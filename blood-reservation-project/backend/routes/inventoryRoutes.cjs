const express = require('express');

const Inventory = require('../../db/models/inventories.cjs');

const router = express.Router();


/*
 * GET /api/inventories
 *
 * Return inventory summary records.
 *
 * Inventory is derived from BloodUnits and should not be
 * manually edited through this route.
 */
router.get('/', async (req, res) => {

    try {

        const inventories = await Inventory
            .find()
            .sort({
                facilityID: 1,
                component: 1,
                bloodType: 1
            })
            .lean();


        res.json({
            success: true,
            inventories
        });

    } catch (err) {

        console.error(
            'Error fetching inventories:',
            err
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventories.'
        });
    }
});


module.exports = router;