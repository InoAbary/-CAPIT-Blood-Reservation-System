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
    },
    {
    
        facilityID: new mongoose.Types.ObjectId('6ab1f013c1737b61e3f4b4e6'),
        bloodType: 'A+',
        component: 'Whole Blood',
        availQuantity: 12,
        availStatus: 'Available',
        lastUpdated: new Date('2026-09-23T08:15:20.112Z'),
        updatedBy: new mongoose.Types.ObjectId('6ab1f310c1737b61e3f4b4e8')
    },
    {
        
        facilityID: new mongoose.Types.ObjectId('6ab1f013c1737b61e3f4b4e6'),
        bloodType: 'B-',
        component: 'Plasma',
        availQuantity: 0,
        availStatus: 'Out of Stock',
        lastUpdated: new Date('2026-09-21T14:45:10.900Z'),
        updatedBy: new mongoose.Types.ObjectId('6ab1f310c1737b61e3f4b4e8')
    },
    {
        
        facilityID: new mongoose.Types.ObjectId('6ab1f013c1737b61e3f4b4e6'),
        bloodType: 'AB+',
        component: 'Platelets',
        availQuantity: 5,
        availStatus: 'Available',
        lastUpdated: new Date('2026-09-24T11:05:33.276Z'),
        updatedBy: new mongoose.Types.ObjectId('6ab1f310c1737b61e3f4b4e8')
    },
    {
        
        facilityID: new mongoose.Types.ObjectId('6ab1f013c1737b61e3f4b4e6'),
        bloodType: 'O-',
        component: 'Cryoprecipitate',
        availQuantity: 3,
        availStatus: 'Limited',
        lastUpdated: new Date('2026-09-24T16:22:08.554Z'),
        updatedBy: new mongoose.Types.ObjectId('6ab1f310c1737b61e3f4b4e8')
    }
];
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