const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  facilityID: { type: mongoose.Schema.Types.ObjectId, ref: 'Facilities', required: true },
  hostName: { type: String, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  venue: { type: String, required: true, trim: true, maxlength: 160 },
  address: { type: String, required: true, trim: true, maxlength: 300 },
  details: { type: String, trim: true, maxlength: 1500 },
  version: { type: Number, default: 0 },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lon: { type: Number, required: true, min: -180, max: 180 },
}, { timestamps: true });

schema.index({ endsAt: 1 });
schema.index({ facilityID: 1, startsAt: -1 });
module.exports = mongoose.model('BloodDrive', schema);
