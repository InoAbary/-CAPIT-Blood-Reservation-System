const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({

    facilityName: {
        type: String,
        required: true
    },
    facilityType: {
        type: String,
        required: true,
        enum: ['bsf', 'hospital', 'prc_chapter']
    },
    category: {
        type: String,
        required: true,
        enum: ['PRC', 'Hospital BSF']
    },
    typeLabel: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    contactNumber: {       
        type: String,
        default: ''
    },
    hours: {
        type: String,
        default: ''
    },
    // Google Place IDs are exempt from Places content storage restrictions.
    googlePlaceId: {
        type: String,
        default: '',
        trim: true
    },
    lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90
    },
    lon: {
        type: Number,
        required: true,
        min: -180,
        max: 180
    },
    isActive: {
        type: Boolean,
        default: true
    }
    

})

module.exports = mongoose.model('Facilities', facilitySchema);
