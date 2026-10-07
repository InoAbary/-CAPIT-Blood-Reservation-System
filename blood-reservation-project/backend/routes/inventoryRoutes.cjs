const express = require('express');



const mongoose = require ('mongoose');
const Inventories = require('../../db/models/inventories.cjs')

const router = express.Router();



// handle reqs to get /api/inventories


router.get('/', async (req, res) => {
    try {
        const inventories = await Inventories.find({}).lean();
        res.json({ success: true, inventories });
    } catch (err) {
        console.error('Error fetching inventories:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch inventories.' });
    }
});



module.exports = router;