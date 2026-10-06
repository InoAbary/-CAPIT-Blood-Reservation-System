const BloodUnits = require('../models/BloodUnits'); // adjust paths to your model files
const Inventory = require('../models/Inventory');

// Quantity at or below this (but above 0) is reported as "Limited"
const LIMITED_THRESHOLD = 5;

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

    // 1. Count in-stock, unexpired units per blood type + component
    const counts = await BloodUnits.aggregate([
        {
            $match: {
                facilityID: facility.facilityID, // bloodUnits store the custom ID, e.g. 'F00001'
                status: /^in-stock$/i,
                expiryDate: { $gt: now },
            },
        },
        {
            $group: {
                _id: { bloodType: '$bloodType', component: '$component' },
                count: { $sum: 1 },
            },
        },
    ]);

    const countMap = new Map(
        counts.map((c) => [keyOf(c._id.bloodType, c._id.component), c.count])
    );

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
                            $set: { availQuantity: qty, availStatus: status, lastUpdated: now },
                            $setOnInsert: { updatedBy: 'SYSTEM' }, // only applied when a new entry is created
                        },
                        upsert: true,
                    },
                });
            });

            if (ops.length > 0) await Inventory.bulkWrite(ops);
}

module.exports = syncInventory;
