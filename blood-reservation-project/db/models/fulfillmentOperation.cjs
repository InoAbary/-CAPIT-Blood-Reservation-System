const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    requestID: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest', required: true },
    facilityID: { type: mongoose.Schema.Types.ObjectId, ref: 'Facilities', required: true },
    actorID: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    receivingHospitalID: { type: mongoose.Schema.Types.ObjectId, ref: 'Facilities', default: null },
    bloodType: { type: String, required: true }, component: { type: String, required: true },
    units: { type: Number, required: true, min: 1 },
    expectedFulfilledUnits: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    state: { type: String, enum: ['Processing', 'Needs Recovery', 'Completed'], default: 'Processing' },
    lastError: String,
    result: mongoose.Schema.Types.Mixed
}, { timestamps: true });
// Durable request lock, valid across Node processes. Never expires automatically.
schema.index({ requestID: 1 }, { unique: true, partialFilterExpression: { active: true } });
// A retry of the same progress point cannot release another batch.
schema.index({ requestID: 1, expectedFulfilledUnits: 1 }, { unique: true });
module.exports = mongoose.model('FulfillmentOperation', schema);
