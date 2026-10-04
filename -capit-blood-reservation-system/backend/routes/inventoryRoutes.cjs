const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const router = express.Router();

function getMockInventories() {
    try {
        const filePath = path.resolve(__dirname, '../../db/collections/inventories.json');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [parsed];
        }
    } catch (e) {
        console.warn('Error reading mock inventories.json:', e.message);
    }
    return [
        {
            _id: { $oid: "6ab1f665c1737b61e3f4b4eb" },
            inventoryID: "I00001",
            facilityID: "F00001",
            bloodType: "O+",
            component: "Packed RBC",
            availQuantity: 18,
            availStatus: "Available",
            lastUpdated: { $date: new Date().toISOString() },
            updatedBy: "U00001"
        }
    ];
}

// handle reqs to get /api/inventories
router.get('/', async (req, res) => {
    try {
        if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
            const collection = mongoose.connection.db.collection('inventories');
            const inventories = await collection.find({}).toArray();
            return res.json({
                success: true,
                inventories: inventories
            });
        }
    } catch (err) {
        console.warn('DB query failed, falling back to mock inventories:', err.message);
    }

    // Fallback to in-memory / JSON mock inventories
    const mockData = getMockInventories();
    res.json({
        success: true,
        inventories: mockData
    });
});

module.exports = router;
