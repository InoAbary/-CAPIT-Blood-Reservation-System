const mongoose = require('mongoose');

const bloodUnitsSchema = new mongoose.Schema({

    bloodUnitID: {
        type: String,
        required: true
    },
    donorID: {
        type: String,
        required: true
    },
    facilityID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facilities',
        required: true
    },
    bloodType: {
        type: String,
        required: true,
        enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
    },
    component: {
        type: String,
        required: true,
        enum: ["Packed RBC", "Plasma", "Platelets", "Whole Blood"]
    },
    collectionDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    expiryDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum: ["In-stock", "Expired", "Removed"],
        default: "In-stock"
    },
    dateAdded: {
        type: Date,
        required: true,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        required: true,
        default: Date.now
    }

})

bloodUnitsSchema.index(
    { bloodUnitID: 1 },
    { unique: true }
);


bloodUnitsSchema.pre('save', function () {
    if (!this.isNew) {
        this.lastUpdated = new Date();
    }
});


module.exports = mongoose.model(
    'BloodUnits',
    bloodUnitsSchema
);