const { eligibleStock } = require('../services/fulfillRequest.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');

async function makeInventories(facilities, staff, units, now, { dryRun }) {
    const inventories = [];

    for (const facility of facilities) {
        const facilityUnits = units.filter(unit => unit.facilityID === facility._id.toString());
        const updater = staff.find(account => account.role === 'staff' && account.facilityID.equals(facility._id));
        const counts = dryRun ? facilityUnits.map(unit => ({
            _id: { bloodType: unit.bloodType, component: unit.component }, quantity: 1,
        })) : await BloodUnits.aggregate([
            { $match: eligibleStock(facility._id, now) },
            { $group: { _id: { bloodType: '$bloodType', component: '$component' }, quantity: { $sum: 1 } } },
        ]);
        const byProduct = new Map(counts.map(({ _id, quantity }) => [`${_id.bloodType}|${_id.component}`, quantity]));

        for (const { bloodType, component } of facilityUnits) {
            const availQuantity = byProduct.get(`${bloodType}|${component}`) ?? 0;
            inventories.push({
                facilityID: facility._id,
                bloodType,
                component,
                availQuantity,
                availStatus: availQuantity === 0 ? 'Out of Stock' : availQuantity <= 5 ? 'Limited' : 'Available',
                lastUpdated: now,
                updatedBy: updater._id,
            });
        }
    }
    return inventories;
}

module.exports = makeInventories;
