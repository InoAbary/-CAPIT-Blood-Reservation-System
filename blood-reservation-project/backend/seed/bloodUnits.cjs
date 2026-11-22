const BloodUnits = require('../../db/models/bloodUnits.cjs');
const { expiryCutoff } = require('../services/fulfillRequest.cjs');

const components = BloodUnits.schema.path('component').enumValues;
const shelfDays = { 'Packed RBC': 35, Plasma: 365, Platelets: 5, 'Whole Blood': 35 };

function makeBloodUnits(facilities, donors, now) {
    const collectionDate = expiryCutoff(now);
    return facilities.flatMap(facility => donors.flatMap((donor, donorIndex) =>
        components.map((component, componentIndex) => {
            const expiryDate = new Date(collectionDate);
            expiryDate.setUTCDate(expiryDate.getUTCDate() + shelfDays[component]);
            return {
                bloodUnitID: `${facility.facilityID}-BAG-${donorIndex + 1}-${componentIndex + 1}`,
                donorID: donor._id,
                facilityID: facility._id.toString(),
                bloodType: donor.bloodType,
                component,
                collectionDate,
                expiryDate,
                dateAdded: now,
                lastUpdated: now,
                status: 'In-stock',
            };
        })
    ));
}

module.exports = makeBloodUnits;
