const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    donationID: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'donations' },
    donorID: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Donors' },
    eligibleAt: { type: Date, required: true },
    status: { type: String, enum: ['sending', 'accepted', 'review', 'cancelled'], required: true },
    messageId: String,
    providerStatus: String,
    acceptedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('DonationReminders', schema);
