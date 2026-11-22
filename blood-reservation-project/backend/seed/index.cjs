const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Facility = require('../../db/models/facilities.cjs');
const Staff = require('../../db/models/staff.cjs');
const Donor = require('../../db/models/donor.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const Inventory = require('../../db/models/inventories.cjs');
const facilities = require('./facilities.cjs');
const makeStaff = require('./staff.cjs');
const makeDonors = require('./donors.cjs');
const makeBloodUnits = require('./bloodUnits.cjs');
const makeInventories = require('./inventories.cjs');

async function insertMissing(Model, rows, key, now) {
    const timestamps = Model.schema.options.timestamps ? { createdAt: now, updatedAt: now } : {};
    await Model.bulkWrite(rows.map(row => ({
        updateOne: {
            filter: { [key]: row[key] },
            update: { $setOnInsert: { ...row, ...timestamps } },
            upsert: true,
            timestamps: false,
        },
    })));
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const uri = process.env.MONGO_URI;
    if (!dryRun && !uri) {
        throw new Error('Set SEED_MONGODB_URI to a development database.');
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash('password123', 10);
    const staff = makeStaff(facilities, passwordHash);
    const donors = makeDonors(passwordHash, now.getFullYear());
    const units = makeBloodUnits(facilities, donors, now);
    const datasets = [[Facility, facilities, '_id'], [Staff, staff, '_id'],
        [Donor, donors, '_id'], [BloodUnits, units, 'bloodUnitID']];

    for (const [Model, rows] of datasets) {
        for (const row of rows) await new Model(row).validate();
    }

    if (!dryRun) {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        for (const [Model, rows, key] of datasets) await insertMissing(Model, rows, key, now);
    }

    const inventories = await makeInventories(facilities, staff, units, now, { dryRun });
    for (const row of inventories) await new Inventory(row).validate();
    if (!dryRun) {
        await Inventory.bulkWrite(inventories.map(({ facilityID, bloodType, component, ...stock }) => ({
            updateOne: {
                filter: { facilityID, bloodType, component },
                update: { $set: stock },
                upsert: true,
            },
        })));
    }

    console.log(`${dryRun ? 'Validated' : 'Seeded'} ${facilities.length} facilities, ${staff.length} staff accounts, ${donors.length} donors, ${units.length} blood unit records, and ${inventories.length} inventory entries.`);
}

main().catch(error => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
}).finally(() => mongoose.disconnect());
