const mongoose = require('mongoose');

const adminAuditSchema = new mongoose.Schema({
  action: { type: String, required: true, trim: true },
  actor: { type: String, required: true, trim: true },
  actorRole: { type: String, required: true, trim: true },
  targetName: { type: String, required: true, trim: true },
  targetRole: { type: String, required: true, trim: true },
  branch: { type: String, default: '', trim: true },
  details: { type: String, default: '', trim: true },
}, { timestamps: true });

module.exports = mongoose.model('AdminAudit', adminAuditSchema);
