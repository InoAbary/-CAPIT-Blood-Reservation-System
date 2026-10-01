const express = require('express');

const Inventories = require('../../db/models/inventories.cjs');

const router = express.Router();

// handle reqs to get /api/inventories
router.get('/', async (req, res) => {
    try{
<<<<<<< Updated upstream
        const collection = mongoose.connection.db.collection('inventories');
        const inventories = await collection.find({}).toArray();
        res.json(inventories);
=======
        const inventories = await Inventories.find();
        res.json({
            success: true,
            inventories: inventories
        });
>>>>>>> Stashed changes
    } catch (err) {
        console.error('Error fetching inventories:', err);
        res.status(500).json({ message: 'Failed to fetch inventories.'});

    }

});

module.exports = router;