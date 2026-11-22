const { FormulaType } = require('exceljs');
const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({

    facilityID: {
        type: String,
        required: true
    },
    facilityName: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['PRC', 'Hospital BSF'],
        default: 'Hospital BSF'
    },
    facilityType: {
        type: String,
        required: true,
        enum: ['prc_chapter', 'bsf', 'hospital', 'hospital_bsf']
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
    operatingHours: {
        type: new mongoose.Schema({
            daysOpen: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
            is24Hours: { type: Boolean, default: false },
            opensAt: { type: String, default: '' },
            closesAt: { type: String, default: '' },
            source: { type: String, enum: ['placeholder', 'branch_admin'], default: 'placeholder' },
            placeholderText: { type: String, default: '' },
            updatedAt: { type: Date },
        }, { _id: false }),
        default: undefined,
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
