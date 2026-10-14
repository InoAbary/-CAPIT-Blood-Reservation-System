const mongoose = require('mongoose');
const Inventories = require('../db/models/inventories.cjs')
const BloodUnits = require('../db/models/bloodUnits.cjs');
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

const bUnitData = [
    // ---- A+ ----
    {
        bloodUnitID: "B0001",
        donorID: "D0001",
        facilityID: "F0001",
        bloodType: "A+",
        component: "Packed RBC",
        collectionDate: new Date('2026-09-24'),
        expiryDate: new Date('2026-09-30'),
        status: "In-stock",
        dateAdded: new Date('2026-10-02'),
    },
    {
        bloodUnitID: "B0002",
        donorID: "D0002",
        facilityID: "F0001",
        bloodType: "A+",
        component: "Plasma",
        collectionDate: new Date('2026-09-10'),
        expiryDate: new Date('2027-03-10'),
        status: "In-stock",
        dateAdded: new Date('2026-09-11'),
    },
    {
        bloodUnitID: "B0003",
        donorID: "D0003",
        facilityID: "F0002",
        bloodType: "A+",
        component: "Platelets",
        collectionDate: new Date('2026-09-28'),
        expiryDate: new Date('2026-10-05'),
        status: "Expired",
        dateAdded: new Date('2026-09-28'),
    },

    // ---- A- ----
    {
        bloodUnitID: "B0004",
        donorID: "D0004",
        facilityID: "F0002",
        bloodType: "A-",
        component: "Packed RBC",
        collectionDate: new Date('2026-09-15'),
        expiryDate: new Date('2026-10-13'),
        status: "In-stock",
        dateAdded: new Date('2026-09-16'),
    },
    {
        bloodUnitID: "B0005",
        donorID: "D0005",
        facilityID: "F0003",
        bloodType: "A-",
        component: "Whole Blood",
        collectionDate: new Date('2026-08-20'),
        expiryDate: new Date('2026-09-17'),
        status: "Removed",
        dateAdded: new Date('2026-08-20'),
    },

    // ---- B+ ----
    {
        bloodUnitID: "B0006",
        donorID: "D0006",
        facilityID: "F0001",
        bloodType: "B+",
        component: "Packed RBC",
        collectionDate: new Date('2026-10-01'),
        expiryDate: new Date('2026-10-29'),
        status: "In-stock",
        dateAdded: new Date('2026-10-01'),
    },
    {
        bloodUnitID: "B0007",
        donorID: "D0007",
        facilityID: "F0002",
        bloodType: "B+",
        component: "Plasma",
        collectionDate: new Date('2026-07-05'),
        expiryDate: new Date('2027-01-05'),
        status: "In-stock",
        dateAdded: new Date('2026-07-06'),
    },
    {
        bloodUnitID: "B0008",
        donorID: "D0008",
        facilityID: "F0003",
        bloodType: "B+",
        component: "Platelets",
        collectionDate: new Date('2026-09-20'),
        expiryDate: new Date('2026-09-27'),
        status: "Expired",
        dateAdded: new Date('2026-09-20'),
    },

    // ---- B- ----
    {
        bloodUnitID: "B0009",
        donorID: "D0009",
        facilityID: "F0001",
        bloodType: "B-",
        component: "Packed RBC",
        collectionDate: new Date('2026-09-30'),
        expiryDate: new Date('2026-10-28'),
        status: "In-stock",
        dateAdded: new Date('2026-09-30'),
    },
    {
        bloodUnitID: "B0010",
        donorID: "D0010",
        facilityID: "F0002",
        bloodType: "B-",
        component: "Whole Blood",
        collectionDate: new Date('2026-06-15'),
        expiryDate: new Date('2026-07-13'),
        status: "Removed",
        dateAdded: new Date('2026-06-15'),
    },

    // ---- O+ ----
    {
        bloodUnitID: "B0011",
        donorID: "D0011",
        facilityID: "F0001",
        bloodType: "O+",
        component: "Packed RBC",
        collectionDate: new Date('2026-10-03'),
        expiryDate: new Date('2026-10-31'),
        status: "In-stock",
        dateAdded: new Date('2026-10-03'),
    },
    {
        bloodUnitID: "B0012",
        donorID: "D0012",
        facilityID: "F0003",
        bloodType: "O+",
        component: "Plasma",
        collectionDate: new Date('2026-09-01'),
        expiryDate: new Date('2027-03-01'),
        status: "In-stock",
        dateAdded: new Date('2026-09-02'),
    },
    {
        bloodUnitID: "B0013",
        donorID: "D0013",
        facilityID: "F0002",
        bloodType: "O+",
        component: "Platelets",
        collectionDate: new Date('2026-09-25'),
        expiryDate: new Date('2026-10-02'),
        status: "Expired",
        dateAdded: new Date('2026-09-25'),
    },

    // ---- O- ----
    {
        bloodUnitID: "B0014",
        donorID: "D0014",
        facilityID: "F0001",
        bloodType: "O-",
        component: "Packed RBC",
        collectionDate: new Date('2026-09-28'),
        expiryDate: new Date('2026-10-26'),
        status: "In-stock",
        dateAdded: new Date('2026-09-29'),
    },
    {
        bloodUnitID: "B0015",
        donorID: "D0015",
        facilityID: "F0003",
        bloodType: "O-",
        component: "Whole Blood",
        collectionDate: new Date('2026-08-01'),
        expiryDate: new Date('2026-08-29'),
        status: "Removed",
        dateAdded: new Date('2026-08-01'),
    },

    // ---- AB+ ----
    {
        bloodUnitID: "B0016",
        donorID: "D0016",
        facilityID: "F0002",
        bloodType: "AB+",
        component: "Packed RBC",
        collectionDate: new Date('2026-10-04'),
        expiryDate: new Date('2026-11-01'),
        status: "In-stock",
        dateAdded: new Date('2026-10-04'),
    },
    {
        bloodUnitID: "B0017",
        donorID: "D0017",
        facilityID: "F0001",
        bloodType: "AB+",
        component: "Plasma",
        collectionDate: new Date('2026-05-20'),
        expiryDate: new Date('2026-11-20'),
        status: "In-stock",
        dateAdded: new Date('2026-05-21'),
    },

    // ---- AB- ----
    {
        bloodUnitID: "B0018",
        donorID: "D0018",
        facilityID: "F0003",
        bloodType: "AB-",
        component: "Packed RBC",
        collectionDate: new Date('2026-09-12'),
        expiryDate: new Date('2026-10-10'),
        status: "In-stock",
        dateAdded: new Date('2026-09-13'),
    },
    {
        bloodUnitID: "B0019",
        donorID: "D0019",
        facilityID: "F0002",
        bloodType: "AB-",
        component: "Platelets",
        collectionDate: new Date('2026-09-15'),
        expiryDate: new Date('2026-09-22'),
        status: "Expired",
        dateAdded: new Date('2026-09-15'),
    },

    // ---- Additional recent units for time-filter testing ----
    {
        bloodUnitID: "B0020",
        donorID: "D0020",
        facilityID: "F0001",
        bloodType: "O+",
        component: "Packed RBC",
        collectionDate: new Date('2026-10-08'),
        expiryDate: new Date('2026-11-05'),
        status: "In-stock",
        dateAdded: new Date('2026-10-09'),
    },
    {
        bloodUnitID: "B0021",
        donorID: "D0021",
        facilityID: "F0002",
        bloodType: "A+",
        component: "Whole Blood",
        collectionDate: new Date('2026-10-09'),
        expiryDate: new Date('2026-11-06'),
        status: "In-stock",
        dateAdded: new Date('2026-10-09'),
    },
    {
        bloodUnitID: "B0022",
        donorID: "D0022",
        facilityID: "F0003",
        bloodType: "B+",
        component: "Packed RBC",
        collectionDate: new Date('2025-12-15'),
        expiryDate: new Date('2026-01-12'),
        status: "Removed",
        dateAdded: new Date('2025-12-15'),
    },
    {
        bloodUnitID: "B0023",
        donorID: "D0023",
        facilityID: "F0001",
        bloodType: "O-",
        component: "Plasma",
        collectionDate: new Date('2025-11-01'),
        expiryDate: new Date('2026-05-01'),
        status: "Removed",
        dateAdded: new Date('2025-11-02'),
    },
    {
        bloodUnitID: "B0024",
        donorID: "D0024",
        facilityID: "F0002",
        bloodType: "AB+",
        component: "Platelets",
        collectionDate: new Date('2026-03-10'),
        expiryDate: new Date('2026-03-17'),
        status: "Removed",
        dateAdded: new Date('2026-03-10'),
    }
];
async function seed() {

    await mongoose.connect(uri);

    await Inventories.deleteMany({});
    await Inventories.insertMany(sampleData);

    await BloodUnits.deleteMany({});
    await BloodUnits.insertMany(bUnitData);

    await mongoose.disconnect()
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
})