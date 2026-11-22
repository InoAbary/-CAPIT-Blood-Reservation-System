const crypto = require('node:crypto');
const AdminAudit = require('../../db/models/adminAudit.cjs');

let pendingWrite = Promise.resolve();

async function recordAdminAudit(event) {
  const write = pendingWrite.then(async () => {
    const previous = await AdminAudit.findOne().sort({ createdAt: -1, _id: -1 }).select('entryHash').lean();
    const payload = { ...event, createdAt: new Date(), previousHash: previous?.entryHash || '' };
    payload.entryHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return AdminAudit.create(payload);
  });
  pendingWrite = write.catch(() => undefined);
  return write;
}

module.exports = { recordAdminAudit };
