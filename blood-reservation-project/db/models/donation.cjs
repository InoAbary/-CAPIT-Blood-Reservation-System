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
    screener: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    extractor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    notes: { type: String, trim: true },
    encoder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',

    }
});

donationSchema.index({ donorID: 1, dateTime: -1, _id: -1 });

module.exports = mongoose.model('donations', donationSchema);
