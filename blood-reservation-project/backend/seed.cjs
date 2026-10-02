const mongoose = require('mongoose');
const Inventories = require('../db/models/inventories.cjs')
require('dotenv').config();
const uri = process.env.MONGODB_LINK

const sampleData = [
    {
        facilityID: new mongoose.Types.ObjectId('6ab1f013c1737b61e3f4b4e6'),
        bloodType: 'O+',
        component: 'Packed RBC',
        availQuantity: 1,
        availStatus: 'Limited',
        lastUpdated: new Date('2026-09-22T03:30:45.441Z'),
        updatedBy: new mongoose.Types.ObjectId('6ab1f310c1737b61e3f4b4e8')
    }
]
async function seed() {

    await mongoose.connect(uri);

    await Inventories.deleteMany({});
    await Inventories.insertMany(sampleData);

    await mongoose.disconnect()
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
})