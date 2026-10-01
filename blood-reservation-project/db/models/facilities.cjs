const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({

    facilityName: {
        type: String,
        required: true
    },
    facilityType: {
        type: String,
        required: true,
        enum: ['bsf', 'hospital', 'blood bank', 'donation center']
    },
    address: {
        type: String,
        required: true
    },
    contactNumber: {       
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
    

})

module.exports = mongoose.model('Facilities', facilitySchema);