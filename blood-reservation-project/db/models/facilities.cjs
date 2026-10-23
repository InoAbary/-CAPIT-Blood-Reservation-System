const { FormulaType } = require('exceljs');
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
    typeLabel: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true
    },
    contactNumber: {       
        type: String,
        required: true
    },
    hours: {       
        type: String,
        required: true
    },
    lat: {       
        type: Number,
        required: true
    },
    lon: {       
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
    

})

module.exports = mongoose.model('Facilities', facilitySchema);