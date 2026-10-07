const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({

    facilityID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facilities',
        required: true
    },
    bloodType: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    component: {
        type: String,
        required: true,
        enum: ['Packed RBC', 'Whole Blood', 'Plasma', 'Platelets']
    },
    availQuantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    availStatus: {
        type: String,
        required: true,
        enum: ['Available', 'Limited', 'Out of Stock']
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    }

    

})

module.exports = mongoose.model('inventories', inventorySchema);
