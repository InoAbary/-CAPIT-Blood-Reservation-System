const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({

    donorID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donors',
        required: true
    },
    dateTime: {
        type: Date,
        default: Date.now
    },
    facilityID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Facilities'
    },
    donationType: {
        type: String,
        enum: ["Whole Blood Donation", "Power Red Donation", "Platelet Donation", "Plasma Donation"],
        required: true
    },
    notes: {
        type: String,
        trim: true
    }
});

module.exports = mongoose.model('donations', donationSchema);
