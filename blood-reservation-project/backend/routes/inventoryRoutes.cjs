const express = require('express');

const Inventories = require('../../db/models/inventories.cjs');

const router = express.Router();

// GET /api/inventories
router.get('/', async (req, res) => {
    try{
        const inventories = await Inventories.find();
        res.json({
            success: true,
            inventories: inventories
        });
    } catch (err) {
        console.error('Error fetching inventories:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch inventories.'});

    }

});

// PATCH /api/inventories for updating inventory records
router.patch('/:id', async (req, res) => {
    try {
        const { availQuantity } = req.body;

        // for testing. update later after asking prc for threshold
            let availStatus;
            if (availQuantity === 0) {
                availStatus = 'Out of Stock';
            } else if (availQuantity <= 5) {
                availStatus = 'Limited';
            } else {
                availStatus = 'Available';
            }

        const inventory = await Inventories.findByIdAndUpdate(
            req.params.id,
            {
                availQuantity: availQuantity,
                availStatus: availStatus,
                lastUpdated: new Date()
            },
            { new: true }
        );

        res.json({
            success: true,
            inventory: inventory
        });

    } catch (err) {
        console.error('Error updating inventory:', err);

        res.status(500).json({
            success: false,
            message: 'Failed to update inventory.'
        });
    }
});


module.exports = router;