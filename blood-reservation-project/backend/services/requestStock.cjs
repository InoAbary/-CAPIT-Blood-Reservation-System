const BloodRequest = require('../../db/models/BloodRequest.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const { eligibleStock } = require('./fulfillRequest.cjs');

const stockKey = (facilityID, bloodType, component) => `${facilityID}|${bloodType}|${component}`;

async function getStockBalances(facilityIDs, { bloodType, components } = {}) {
    if (facilityIDs.length === 0) return new Map();

    const products = {
        ...(bloodType ? { bloodType } : {}),
        ...(components ? { component: { $in: components } } : {}),
    };

    const [stock, allocations] = await Promise.all([
        BloodUnits.aggregate([
            {
                $match: {
                    ...eligibleStock(null),
                    facilityID: { $in: facilityIDs.map(String) },
                    ...products,
                },
            },
            {
                $group: {
                    _id: { facilityID: '$facilityID', bloodType: '$bloodType', component: '$component' },
                    units: { $sum: 1 },
                },
            },
        ]),
        BloodRequest.find({
            receivingFacilityID: { $in: facilityIDs },
            ...products,
            $or: [
                { requestStatus: 'Allocated' },
                { requestStatus: 'Partially Fulfilled', requestGroupID: { $type: 'string' } },
            ],
        }).select('receivingFacilityID bloodType component units fulfilledUnits').lean(),
    ]);

    const balances = new Map(stock.map(({ _id, units }) => [
        stockKey(_id.facilityID, _id.bloodType, _id.component),
        { inStockUnits: units, allocatedUnits: 0 },
    ]));

    for (const row of allocations) {
        const key = stockKey(row.receivingFacilityID, row.bloodType, row.component);
        const balance = balances.get(key) ?? { inStockUnits: 0, allocatedUnits: 0 };
        balance.allocatedUnits += Math.max(0, (row.units ?? 0) - (row.fulfilledUnits ?? 0));
        balances.set(key, balance);
    }

    for (const balance of balances.values()) {
        balance.availableUnits = Math.max(0, balance.inStockUnits - balance.allocatedUnits);
    }

    return balances;
}

module.exports = { getStockBalances, stockKey };
