const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const Donor = require('../../db/models/donor.cjs');
const History = require('../../db/models/bloodUnitsHistory.cjs');
const { validateDonorReference, normalizeDonorReference } = require('../utils/bloodUnitDonor.cjs');
const { planDonorMigration } = require('../scripts/migrateBloodUnitDonors.cjs');
const unitData = {
    bloodUnitID: 'BU00000001', facilityID: 'facility', bloodType: 'O+', component: 'Whole Blood',
    collectionDate: new Date('2026-11-01'), expiryDate: new Date('2026-12-01'), status: 'In-stock',
};
test('model allows absent donors and casts references, rejecting readable IDs', () => {
    const empty = new BloodUnits(unitData);
    assert.equal(empty.validateSync(), undefined);
    assert.equal(empty.donorID, null);
    const id = new mongoose.Types.ObjectId();
    const linked = new BloodUnits({ ...unitData, donorID: String(id) });
    assert.equal(linked.validateSync(), undefined);
    assert.ok(linked.donorID.equals(id));
    assert.equal(BloodUnits.schema.path('donorID').options.ref, 'Donors');
    assert.ok(new BloodUnits({ ...unitData, donorID: 'D0001' }).validateSync().errors.donorID);
});
test('API accepts clearing and rejects malformed or nonexistent donors', async t => {
    let queries = 0;
    const id = String(new mongoose.Types.ObjectId());
    t.mock.method(Donor, 'exists', async filter => { queries++; return filter._id === id; });
    for (const value of [undefined, null, '', '  ']) {
        assert.equal(await validateDonorReference(value), null);
        assert.equal(normalizeDonorReference(value), null);
    }
    for (const value of ['D0001', {}, [], 123, { _id: id }]) assert.ok(await validateDonorReference(value));
    assert.equal(queries, 0);
    assert.equal(await validateDonorReference(` ${id} `), null);
    assert.ok(await validateDonorReference(String(new mongoose.Types.ObjectId())));
});
test('history preserves nullable and ObjectId donors as string snapshots', async t => {
    const records = [];
    t.mock.method(History, 'create', async record => { records.push(record); return record; });
    const id = new mongoose.Types.ObjectId();
    await History.logCreate(new BloodUnits({ ...unitData, donorID: id }));
    await History.logCreate(new BloodUnits(unitData));
    assert.equal(records[0].donorID, String(id));
    assert.equal(records[1].donorID, null);
    await History.logUpdate({ ...unitData, donorID: id }, { ...unitData, donorID: new mongoose.Types.ObjectId(String(id)) });
    assert.equal(records.length, 2);
    await History.logUpdate({ ...unitData, donorID: id }, { ...unitData, donorID: null });
    assert.equal(records[2].changes[0].newValue, null);
});
test('migration resolves readable and hex IDs and preserves unresolved values', async () => {
    const id = new mongoose.Types.ObjectId();
    const rows = [
        { _id: 1, bloodUnitID: 'BU1', donorID: 'D0001' },
        { _id: 2, bloodUnitID: 'BU2', donorID: '' },
        { _id: 3, bloodUnitID: 'BU3', donorID: 'unknown' },
        { _id: 4, donorID: id }, { _id: 5, donorID: null },
        { _id: 6, donorID: String(id) }, { _id: 7, donorID: 'duplicate' },
    ];
    const collection = { find: () => rows };
    const donors = { find: query => ({ select() { return this; }, limit() { return this; }, async lean() {
        const value = query.$or[0].donorID;
        return value === 'duplicate' ? [{ _id: id }, { _id: new mongoose.Types.ObjectId() }]
            : ['D0001', String(id)].includes(value) ? [{ _id: id }] : [];
    } }) };
    const plan = await planDonorMigration(collection, donors);
    assert.equal(plan.operations.length, 3);
    assert.ok(plan.operations[0].updateOne.update.$set.donorID.equals(id));
    assert.equal(plan.operations[1].updateOne.update.$set.donorID, null);
    assert.equal(plan.operations[2].updateOne.filter.donorID, String(id));
    assert.equal(plan.unresolved.length, 2);
});
