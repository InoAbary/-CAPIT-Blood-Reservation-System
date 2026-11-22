const mongoose = require('mongoose');

const adminAuditSchema = new mongoose.Schema({
  action: { type: String, required: true, trim: true },
  actor: { type: String, required: true, trim: true },
  actorRole: { type: String, required: true, trim: true },
  targetName: { type: String, default: '', trim: true },
  targetRole: { type: String, default: '', trim: true },
  branch: { type: String, default: '', trim: true },
  details: { type: String, default: '', trim: true },
  previousHash: { type: String, default: '' },
  entryHash: { type: String, required: true, unique: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

adminAuditSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AdminAudit || mongoose.model('AdminAudit', adminAuditSchema);
