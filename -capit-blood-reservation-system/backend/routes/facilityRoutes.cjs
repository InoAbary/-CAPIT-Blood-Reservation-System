const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Facilities = require('../../db/models/facilities.cjs');

const router = express.Router();
const jsonFilePath = path.resolve(__dirname, '../../db/collections/facilities.json');

function getMockFacilities() {
    try {
        if (fs.existsSync(jsonFilePath)) {
            const data = fs.readFileSync(jsonFilePath, 'utf-8');
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [parsed];
        }
    } catch (e) {
        console.warn('Error reading mock facilities.json:', e.message);
    }
    return [];
}

function saveMockFacilities(facilitiesList) {
    try {
        fs.writeFileSync(jsonFilePath, JSON.stringify(facilitiesList, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.warn('Error writing facilities.json:', e.message);
        return false;
    }
}

// GET /api/facilities
router.get('/', async (req, res) => {
    try {
        if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
            const collection = mongoose.connection.db.collection('facilities');
            const mongoFacilities = await collection.find({}).toArray();
            if (mongoFacilities && mongoFacilities.length > 0) {
                return res.json({
                    success: true,
                    source: 'mongodb',
                    facilities: mongoFacilities
                });
            }
        }
    } catch (err) {
        console.warn('MongoDB query failed, falling back to JSON mock:', err.message);
    }

    const mockData = getMockFacilities();
    res.json({
        success: true,
        source: 'json-store',
        facilities: mockData
    });
});

// POST /api/facilities
router.post('/', async (req, res) => {
    try {
        const {
            facilityName,
            facilityType = 'bsf',
            category = 'Hospital BSF',
            typeLabel = 'Blood Service Facility',
            address,
            contactNumber,
            lat = 14.5995,
            lon = 120.9842,
            hours = '8:00 AM - 5:00 PM',
            matrix = {}
        } = req.body;

        if (!facilityName || !address) {
            return res.status(400).json({
                success: false,
                error: 'facilityName and address are required'
            });
        }

        const facilityID = 'F' + String(Date.now()).slice(-5);
        const newRecord = {
            facilityID,
            facilityName: facilityName.trim(),
            facilityType: ['bsf', 'hospital', 'blood bank', 'donation center'].includes(facilityType) ? facilityType : 'bsf',
            category: category || (facilityName.toLowerCase().includes('red cross') ? 'PRC' : 'Hospital BSF'),
            typeLabel: typeLabel || (facilityName.toLowerCase().includes('red cross') ? 'Philippine Red Cross' : 'Hospital Blood Service Facility'),
            address: address.trim(),
            contactNumber: contactNumber || '(02) 8527-2195',
            contactNuber: contactNumber || '(02) 8527-2195',
            phone: contactNumber || '(02) 8527-2195',
            lat: Number(lat),
            lon: Number(lon),
            hours: hours || '8:00 AM - 5:00 PM',
            matrix: matrix || {},
            isActive: true,
            createdAt: new Date().toISOString()
        };

        let mongoResult = null;
        // Try saving to MongoDB if connected
        if (mongoose.connection && mongoose.connection.readyState === 1) {
            try {
                const facilityDoc = new Facilities(newRecord);
                mongoResult = await facilityDoc.save();
                console.log(`[MongoDB] Successfully logged new branch "${facilityName}" into MongoDB with ID: ${mongoResult._id}`);
                newRecord._id = mongoResult._id;
            } catch (mongoErr) {
                console.warn('[MongoDB] Save error, falling back to git JSON store:', mongoErr.message);
            }
        }

        // Always also persist to db/collections/facilities.json for git sync
        const currentList = getMockFacilities();
        const existingIndex = currentList.findIndex(f => f.facilityID === facilityID || f.facilityName.toLowerCase() === facilityName.toLowerCase());
        if (existingIndex >= 0) {
            currentList[existingIndex] = { ...currentList[existingIndex], ...newRecord };
        } else {
            currentList.push({
                _id: mongoResult?._id ? { $oid: String(mongoResult._id) } : { $oid: 'local_' + Date.now() },
                ...newRecord
            });
        }
        saveMockFacilities(currentList);

        res.status(201).json({
            success: true,
            message: mongoResult ? 'Branch saved to MongoDB and logged to git' : 'Branch logged to local database and git',
            facility: newRecord,
            savedToMongo: Boolean(mongoResult)
        });
    } catch (err) {
        console.error('Error creating facility:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;
