const BloodUnits = require('../../db/models/bloodUnits.cjs'); // adjust paths to your model files
const Inventory = require('../../db/models/inventories.cjs');

// Quantity at or below this (but above 0) is reported as "Limited"
const LIMITED_THRESHOLD = 5;

const BLOOD_TYPES = [
    'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'
];

const COMPONENTS = [
    'Packed RBC',
    'Plasma',
    'Platelets',
    'Whole Blood'
];

const statusFor = (qty) => {
    if (qty <= 0) return 'Out of Stock';
    if (qty <= LIMITED_THRESHOLD) return 'Limited';
    return 'Available';
};

const keyOf = (bloodType, component) => `${bloodType}|${component}`;

/**
 * Recount the facility's blood units and bring its inventory entries up to date.
 * Only entries whose quantity or status actually changed are written, so
 * lastUpdated keeps meaning "when the stock last changed".
 * `facility` is a lean Facility document (needs _id and the custom facilityID string).
 */
async function syncInventory(facility) {
    const now = new Date();

    const philippineDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(now);
    
    const startOfToday = new Date(
        `${philippineDate}T00:00:00.000Z`
    );

     /*
     * Automatically mark previously in-stock units as Expired
     * once their expiry date has been reached.
     *
     * Do not touch units already marked Removed.
     */
     await BloodUnits.updateMany(
        {
            facilityID: facility._id.toString(),
            status: 'In-stock',
            expiryDate: { $lt: startOfToday }
        },
        {
            $set: {
                status: 'Expired',
                lastUpdated: now
            }
        }
    );


    // 1. Count in-stock, unexpired units per blood type + component
    const counts = await BloodUnits.aggregate([
        {
            $match: {
                facilityID: facility._id.toString(), // bloodUnits store the custom ID, e.g. 'F00001'
                status: /^In-stock$/i,
                expiryDate: { $gte: startOfToday },
            },
        },
        {
            $group: {
                _id: { bloodType: '$bloodType', component: '$component' },
                count: { $sum: 1 },
            },
        },
    ]);

    const countMap = new Map();

/*
 * Every facility tracks all 8 blood types × 4 components.
 * Start every combination at zero so missing stock is represented
 * as Out of Stock instead of having no inventory record.
 */
BLOOD_TYPES.forEach((bloodType) => {
    COMPONENTS.forEach((component) => {
        countMap.set(
            keyOf(bloodType, component),
            0
        );
    });
});

/*
 * Replace the zero values with the actual counts found
 * in BloodUnits.
 */
counts.forEach((count) => {
    countMap.set(
        keyOf(
            count._id.bloodType,
            count._id.component
        ),
        count.count
    );
});

    // 2. Current inventory entries for this facility
    const existing = await Inventory.find({ facilityID: facility._id })
    .select('bloodType component availQuantity availStatus')
    .lean();

    const existingMap = new Map();
    existing.forEach((e) => {
        if (e.bloodType && e.component) existingMap.set(keyOf(e.bloodType, e.component), e);
    });

        // Entries with no matching units anymore drop to zero
        existingMap.forEach((_, key) => {
            if (!countMap.has(key)) countMap.set(key, 0);
        });

            // 3. Write only what changed (or is new)
            const ops = [];
            countMap.forEach((qty, key) => {
                const status = statusFor(qty);
                const current = existingMap.get(key);

                if (current && current.availQuantity === qty && current.availStatus === status) return;

                const [bloodType, component] = key.split('|');
                ops.push({
                    updateOne: {
                        filter: { facilityID: facility._id, bloodType, component },
                        update: {
                            $set: { availQuantity: qty, availStatus: status, lastUpdated: now } //,
                            //TODO $setOnInsert: { updatedBy: 'SYSTEM' }, only applied when a new entry is created
                        },
                        upsert: true,
                    },
                });
            });

            if (ops.length > 0) await Inventory.bulkWrite(ops);
}

module.exports = syncInventory;
