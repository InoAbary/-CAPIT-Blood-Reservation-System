const mongoose = require('mongoose');

const REPORT_STATUSES = ['Used', 'Wasted', 'Expired', 'Unused'];
const REPORT_SOURCES = ['Hospital', 'System'];

// For updating the existing report, preserves what was recorded before
const correctionSchema = new mongoose.Schema({
    previousStatus: { type: String, required: true, enum: REPORT_STATUSES },
    previousDescription: { type: String, default: '' },
    previousReportSource: { type: String, required: true, enum: REPORT_SOURCES },
    previousIsAssumed: { type: Boolean, required: true },
    status: { type: String, required: true, enum: REPORT_STATUSES },
    description: { type: String, default: '' },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    correctedAt: { type: Date, default: Date.now }
}, { _id: false });

const bloodReportSchema = new mongoose.Schema({
    reportID: { type: String, required: true, unique: true },
    bloodUnitID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BloodUnits',
        required: true,
        unique: true
    },
    dateCreated: { type: Date, default: Date.now },
    status: { type: String, required: true, enum: REPORT_STATUSES },
    reportSource: { type: String, required: true, enum: REPORT_SOURCES, default: 'Hospital' },
    isAssumed: { type: Boolean, default: false },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
    description: { type: String },
    correctionHistory: { type: [correctionSchema], default: [] }
}, { timestamps: { createdAt: false, updatedAt: true } });

module.exports = mongoose.model('Blood_Usage_Reports', bloodReportSchema);
