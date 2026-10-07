const express = require('express');

const Inventories = require('../../db/models/inventories.cjs');

const router = express.Router();

// update once the official thresholds are confirmed
function getInventoryStatus(quantity) {
    if (quantity === 0) {
        return 'Out of Stock';
    }

    if (quantity <= 5) {
        return 'Limited';
    }

    return 'Available';
}

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
// updates multiple inventory records in one request
router.patch('/batch', async (req, res) => {
    try {
        const { updates } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one inventory update is required.'
            });
        }

        // validate all updates before changing any records.
        for (const update of updates) {
            const quantity = Number(update.availQuantity);

            if (
                !update.id ||
                !Number.isInteger(quantity) ||
                quantity < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Each update must have a valid ID and a non-negative whole-number quantity.'
                });
            }
        }

        const updatedRecords = [];

        for (const update of updates) {
            const quantity = Number(update.availQuantity);
            const availStatus = getInventoryStatus(quantity);

            const inventory = await Inventories.findByIdAndUpdate(
                update.id,
                {
                    availQuantity: quantity,
                    availStatus: availStatus,
                    lastUpdated: new Date()
                },
                { new: true }
            );

            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: `Inventory record ${update.id} was not found.`
                });
            }

            updatedRecords.push(inventory);
        }

        res.json({
            success: true,
            inventories: updatedRecords
        });

    } catch (err) {
        console.error('Error updating inventory batch:', err);

        res.status(500).json({
            success: false,
            message: 'Failed to update inventory.'
        });
    }
});

// PATCH /api/inventories/:id
// Updates one inventory record.
router.patch('/:id', async (req, res) => {
    try {
        const quantity =
            Number(req.body.availQuantity);


        if (
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Quantity must be a non-negative whole number.'
            });
        }


        const availStatus =
            getInventoryStatus(quantity);


        const inventory =
            await Inventories.findByIdAndUpdate(
                req.params.id,
                {
                    availQuantity: quantity,
                    availStatus: availStatus,
                    lastUpdated: new Date()
                },
                {
                    returnDocument: 'after'
                }
            );


        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory record was not found.'
            });
        }


        res.json({
            success: true,
            inventory: inventory
        });

    } catch (err) {
        console.error(
            'Error updating inventory:',
            err
        );

        res.status(500).json({
            success: false,
            message: 'Failed to update inventory.'
        });
    }
});



module.exports = router;