const mongoose = require('mongoose');

const bloodReportSchema = new mongoose.Schema({

    bsfFacilityID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facilities',
        required: true
    },
    
    hospitalFacilityID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facilities',
        required: true
    },

    bloodRequestID: {
        type: String,
        default: null
    },

    bloodUnitID: {
        type: String,
        required: true
    },

    bloodType: {
        type: String,
        required: true,
        enum: [
            'A+',
            'A-',
            'B+',
            'B-',
            'O+',
            'O-',
            'AB+',
            'AB-'
        ]
    },

    component: {
        type: String,
        required: true,
        enum: [
            'Packed RBC',
            'Plasma',
            'Platelets',
            'Whole Blood'
        ]
    },

    status: {
        type: String,
        required: true,
        enum: [
            'Used',
            'Wasted',
            'Expired',
            'Unused'
        ]
    },

    utilizationDate: {
        type: Date,
        required: true,
        default: Date.now
    },

    description: {
        type: String,
        trim: true,
        default: ''
    },

    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        default: null

        // TODO: Connect authenticated user once authentication
        // is implemented.
    },

    dateCreated: {
        type: Date,
        default: Date.now
    }
});

bloodReportSchema.index({
    bsfFacilityID: 1,
    utilizationDate: -1
});

bloodReportSchema.index({
    hospitalFacilityID: 1,
    utilizationDate: -1
});

bloodReportSchema.index({
    bloodUnitID: 1,
    utilizationDate: -1
});


module.exports = mongoose.model(
    'Blood_Usage_Reports',
    bloodReportSchema
);