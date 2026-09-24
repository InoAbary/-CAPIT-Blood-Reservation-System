const express = require('express');

const mongoose = require ('mongoose');

const router = express.Router();

// handle reqs to get /api/inventories
router.get('/', async (req, res) => {
    try{
        const collection = mongoose.connection.db.collection('inventories');
        const inventories = await collection.find({}).toArray();
        res.json(inventories);
    } catch (err) {
        console.error('Error fetching inventories:', err);
        res.status(500).json({ message: 'Failed to fetch inventories.'});

    }

});

module.exports = router;