const express = require('express');
const Facility = require('../../db/models/facilities.cjs');
const Inventory = require('../../db/models/inventories.cjs');
const requireStaff = require('../middleware/requireStaff.cjs');

const router = express.Router();
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['Packed RBC', 'Whole Blood', 'Platelets', 'Plasma', 'Cryoprecipitate'];

const componentKey = (component) => ({
    'Packed RBC': 'prbc',
    'Whole Blood': 'whole',
    Platelets: 'platelet',
    Plasma: 'plasma',
    Cryoprecipitate: 'cryo'
}[component]);

const publicStatus = (item) => {
    if (!item || Number(item.availQuantity) <= 0 || item.availStatus === 'Out of Stock') return 'Unavailable';
    if (item.availStatus === 'Limited' || item.availStatus === 'Critical') return 'Low';
    return 'Available';
};

function formatFacility(facility, inventories) {
    const latitude = facility.lat ?? facility.latitude;
    const longitude = facility.lon ?? facility.longitude;
    const matrix = Object.fromEntries(BLOOD_TYPES.map((bloodType) => [
        bloodType,
        Object.fromEntries(COMPONENTS.map((component) => [
            componentKey(component),
            publicStatus(inventories.find((item) => item.bloodType === bloodType && item.component === component))
        ]))
    ]));

    const lastUpdated = inventories.reduce((latest, item) => {
        const time = item.lastUpdated ? new Date(item.lastUpdated).getTime() : 0;
        return time > latest ? time : latest;
    }, 0);

    return {
        id: String(facility._id),
        facilityID: String(facility._id),
        facilityName: facility.facilityName,
        name: facility.facilityName,
        facilityType: facility.facilityType,
        category: facility.category || (facility.facilityType === 'prc_chapter' ? 'PRC' : 'Hospital BSF'),
        typeLabel: facility.typeLabel || (facility.facilityType === 'prc_chapter' ? 'Philippine Red Cross' : 'Hospital Blood Service Facility'),
        address: facility.address,
        // Google phone numbers/hours are fetched live by the client and never returned from MongoDB.
        contactNumber: facility.googlePlaceId ? '' : (facility.contactNumber || ''),
        phone: facility.googlePlaceId ? '' : (facility.contactNumber || ''),
        hours: facility.googlePlaceId ? '' : (facility.hours || ''),
        googlePlaceId: facility.googlePlaceId || '',
        lat: latitude !== null && latitude !== undefined && latitude !== '' && Number.isFinite(Number(latitude))
            ? Number(latitude)
            : null,
        lon: longitude !== null && longitude !== undefined && longitude !== '' && Number.isFinite(Number(longitude))
            ? Number(longitude)
            : null,
        bbisSyncedMins: lastUpdated ? Math.max(0, Math.floor((Date.now() - lastUpdated) / 60000)) : null,
        isActive: facility.isActive,
        matrix
    };
}

async function listLocatorFacilities() {
    const facilities = await Facility.find({ isActive: true }).sort({ facilityName: 1 }).lean();
    if (facilities.length === 0) return [];
    const inventories = await Inventory.find({
        facilityID: { $in: facilities.map((facility) => facility._id) }
    }).select('facilityID bloodType component availQuantity availStatus lastUpdated').lean();

    return facilities.map((facility) => formatFacility(
        facility,
        inventories.filter((item) => String(item.facilityID) === String(facility._id))
    ));
}

// Public, read-only locator data. Stock facts always come from MongoDB inventory documents.
router.get('/facilities', async (req, res) => {
    try {
        const facilities = await listLocatorFacilities();
        res.json({
            success: true,
            facilities,
            unlocatedCount: facilities.filter((facility) => facility.lat === null || facility.lon === null).length
        });
    } catch (err) {
        console.error('Load locator facilities:', err);
        res.status(500).json({ success: false, message: 'Failed to load blood locator data.' });
    }
});

// Facility creation is mounted behind the existing staff authentication middleware.
router.post('/facilities', requireStaff, async (req, res) => {
    try {
        const {
            facilityName, facilityType, category, typeLabel, address,
            contactNumber, hours, googlePlaceId, lat, lon
        } = req.body;
        const latitude = Number(lat);
        const longitude = Number(lon);
        const validFacilityTypes = ['bsf', 'hospital', 'prc_chapter'];

        if (
            typeof facilityName !== 'string' || !facilityName.trim() ||
            !validFacilityTypes.includes(facilityType) ||
            !['PRC', 'Hospital BSF'].includes(category) ||
            typeof address !== 'string' || !address.trim() ||
            (googlePlaceId !== undefined && typeof googlePlaceId !== 'string') ||
            !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
            !Number.isFinite(longitude) || longitude < -180 || longitude > 180
        ) {
            return res.status(400).json({ success: false, message: 'Provide a branch name, type, category, address, and valid coordinates.' });
        }

        const facility = await Facility.create({
            facilityName: facilityName.trim(),
            facilityType,
            category,
            typeLabel: typeof typeLabel === 'string' && typeLabel.trim()
                ? typeLabel.trim()
                : category === 'PRC' ? 'Philippine Red Cross' : 'Hospital Blood Service Facility',
            address: address.trim(),
            // Places content other than the Place ID must not be persistently stored.
            contactNumber: '',
            hours: '',
            googlePlaceId: typeof googlePlaceId === 'string' ? googlePlaceId.trim() : '',
            lat: latitude,
            lon: longitude,
            isActive: true
        });

        res.status(201).json({ success: true, facility: formatFacility(facility.toObject(), []) });
    } catch (err) {
        console.error('Create locator facility:', err);
        res.status(500).json({ success: false, message: 'Failed to save the facility.' });
    }
});

module.exports = router;
