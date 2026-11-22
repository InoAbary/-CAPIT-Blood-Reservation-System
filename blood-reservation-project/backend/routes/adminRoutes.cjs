const express = require('express');
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const Donor = require('../../db/models/donor.cjs');
const Staff = require('../../db/models/staff.cjs');
const Facility = require('../../db/models/facilities.cjs');
const AdminAudit = require('../../db/models/adminAudit.cjs');
const { recordAdminAudit: recordAudit } = require('../services/adminAudit.cjs');
const { generateStaffId } = require('../utils/staffId.cjs');

const router = express.Router();
const isDbConnected = () => mongoose.connection.readyState === 1;
const staffName = (staff) => `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email;
const normalizedStaffRole = (role) => ({ admin: 'System Admin', 'branch-admin': 'Branch Admin', hospital: 'Hospital Staff', staff: 'Staff' }[role] || role || 'Staff');

function formatStaffUser(staff, facilityName = '') {
  return {
    id: `staff:${staff._id}`,
    name: staffName(staff),
    email: staff.email,
    role: normalizedStaffRole(staff.role),
    branch: facilityName || staff.branch || '',
    staffId: staff.staffId || '',
    createdByName: staff.createdByName || 'System',
    createdByEmail: staff.createdByEmail || '',
    canManageAccounts: staff.canManageAccounts === true,
    isPrimaryAdmin: staff.isPrimaryAdmin === true,
    pendingAuthorization: staff.role === 'admin' && staff.canManageAccounts !== true,
    status: staff.isActive === false ? (staff.requirePasswordChange ? 'Pending Setup' : 'Suspended') : 'Active',
    createdAt: staff.createdAt,
  };
}

async function ensurePrimaryAdmin() {
  const existing = await Staff.findOne({ role: 'admin', isPrimaryAdmin: true }).select('_id').lean();
  if (existing) return;
  const firstAdmin = await Staff.findOne({ role: 'admin', isActive: { $ne: false } }).sort({ createdAt: 1, _id: 1 });
  if (firstAdmin) {
    firstAdmin.isPrimaryAdmin = true;
    firstAdmin.canManageAccounts = true;
    await firstAdmin.save();
  }
}

async function hasPrimaryAdminPassword(password) {
  const primaryAdmin = await Staff.findOne({ role: 'admin', isPrimaryAdmin: true, isActive: { $ne: false } }).select('+password');
  return Boolean(primaryAdmin && password && await bcrypt.compare(String(password), primaryAdmin.password));
}

// The parent mount has verified the signed-in staff role. Load current database
// permissions on every request so a stale JWT cannot retain administrator access.
router.use(async (req, res, next) => {
  try {
    const account = await Staff.findById(req.user.id).select('+password');
    if (!account || account.role !== 'admin' || account.isActive === false) {
      return res.status(403).json({ error: 'An active System Admin account is required.' });
    }
    await ensurePrimaryAdmin();
    if (!account.isPrimaryAdmin) {
      const refreshed = await Staff.findById(account._id).select('+password');
      if (refreshed) req.admin = refreshed;
    } else {
      req.admin = account;
    }
    req.adminName = staffName(req.admin);
    next();
  } catch (error) {
    next(error);
  }
});

router.get('/current', (req, res) => {
  res.json({ admin: {
    id: String(req.admin._id),
    firstName: req.admin.firstName,
    lastName: req.admin.lastName,
    email: req.admin.email,
    role: req.admin.role,
    isPrimaryAdmin: req.admin.isPrimaryAdmin === true,
    canManageAccounts: req.admin.canManageAccounts === true,
  } });
});

router.get('/summary', async (req, res, next) => {
  try {
    const [staffByRole, donors, recipients, facilities, auditCount] = await Promise.all([
      Staff.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Donor.countDocuments({ role: 'donor' }),
      Donor.countDocuments({ role: 'recipient' }),
      Facility.find({ isActive: { $ne: false } }).select('facilityType').lean(),
      AdminAudit.countDocuments(),
    ]);
    const counts = Object.fromEntries(staffByRole.map(({ _id, count }) => [_id, count]));
    const totalStaff = Object.values(counts).reduce((sum, count) => sum + count, 0);
    res.json({
      systemAdmins: counts.admin || 0,
      bsfAdmins: counts['branch-admin'] || 0,
      prcAdmins: counts['prc-admin'] || 0,
      donors,
      recipients,
      hospitalStaff: counts.hospital || 0,
      bsfStaff: counts.staff || 0,
      totalUsers: totalStaff + donors,
      auditCount,
      facilities: facilities.length,
    });
  } catch (error) { next(error); }
});

router.get('/users', async (req, res, next) => {
  try {
    const canManageAccounts = req.admin.canManageAccounts === true;
    const staffFilter = canManageAccounts
      ? {}
      : { $or: [{ _id: req.admin._id }, { createdByEmail: req.admin.email }] };
    const [staffRecords, donorRecords] = await Promise.all([
      Staff.find(staffFilter).select('firstName lastName email role branch facilityID staffId createdByName createdByEmail canManageAccounts isPrimaryAdmin isActive requirePasswordChange createdAt').lean(),
      canManageAccounts ? Donor.find().select('firstName middleName lastName email donorID role isActive createdAt').lean() : [],
    ]);
    const facilityIds = [...new Set(staffRecords.map((item) => String(item.facilityID || '')).filter(Boolean))];
    const facilities = facilityIds.length ? await Facility.find({ _id: { $in: facilityIds } }).select('facilityName').lean() : [];
    const facilityNames = new Map(facilities.map((item) => [String(item._id), item.facilityName]));
    const users = [
      ...staffRecords.map((item) => formatStaffUser(item, facilityNames.get(String(item.facilityID || '')))),
      ...donorRecords.map((item) => ({
        id: `donor:${item._id}`,
        name: [item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ') || item.email,
        email: item.email || '',
        role: item.role === 'recipient' ? 'Recipient' : 'Donor',
        branch: '',
        staffId: item.donorID || '',
        createdByName: 'Self registered',
        canManageAccounts: false,
        isPrimaryAdmin: false,
        status: item.isActive === false ? 'Suspended' : 'Active',
        createdAt: item.createdAt,
      })),
    ].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    res.json({ users, canManageAccounts, isPrimaryAdmin: req.admin.isPrimaryAdmin === true });
  } catch (error) { next(error); }
});

router.get('/facilities', async (req, res, next) => {
  try {
    const facilities = await Facility.find({ isActive: { $ne: false } }).sort({ facilityName: 1 }).lean();
    res.json({ facilities });
  } catch (error) { next(error); }
});

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['Active', 'Suspended'].includes(status)) return res.status(400).json({ error: 'Status must be Active or Suspended.' });
    if (!(await hasPrimaryAdminPassword(req.body?.superadminPassword))) return res.status(401).json({ error: 'The Primary admin password is incorrect.' });
    const [collection, documentId] = req.params.id.split(':', 2);
    if (!['staff', 'donor'].includes(collection) || !mongoose.Types.ObjectId.isValid(documentId)) return res.status(404).json({ error: 'Account not found.' });
    const Model = collection === 'staff' ? Staff : Donor;
    const account = await Model.findById(documentId);
    if (!account) return res.status(404).json({ error: 'Account not found.' });
    if (collection === 'staff' && account.isPrimaryAdmin && status !== 'Active') return res.status(409).json({ error: 'Transfer primary-admin authority before suspending this account.' });
    if (collection === 'staff' && String(account._id) === String(req.admin._id)) return res.status(409).json({ error: 'You cannot suspend your own account.' });
    const oldStatus = account.isActive === false ? 'Suspended' : 'Active';
    account.isActive = status === 'Active';
    await account.save();
    const user = collection === 'staff' ? formatStaffUser(account) : { id: req.params.id, name: staffName(account), email: account.email, role: 'Donor', status };
    await recordAudit({ action: status === 'Active' ? 'Account Activated' : 'Account Suspended', actor: req.adminName, actorRole: 'System Admin', targetName: user.name, targetRole: user.role, branch: user.branch || '', details: `Status changed from ${oldStatus} to ${status}.` });
    res.json({ user });
  } catch (error) { next(error); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    if (!(await hasPrimaryAdminPassword(req.body?.superadminPassword))) return res.status(401).json({ error: 'The Primary admin password is incorrect.' });
    const [collection, documentId] = req.params.id.split(':', 2);
    if (!['staff', 'donor'].includes(collection) || !mongoose.Types.ObjectId.isValid(documentId)) return res.status(404).json({ error: 'Account not found.' });
    const Model = collection === 'staff' ? Staff : Donor;
    const account = await Model.findById(documentId);
    if (!account) return res.status(404).json({ error: 'Account not found.' });
    if (collection === 'staff' && (account.isPrimaryAdmin || String(account._id) === String(req.admin._id))) {
      return res.status(409).json({ error: 'The Primary admin and your own account cannot be deleted here.' });
    }
    const target = collection === 'staff'
      ? formatStaffUser(account)
      : { name: [account.firstName, account.middleName, account.lastName].filter(Boolean).join(' ') || account.email, role: account.role === 'recipient' ? 'Recipient' : 'Donor' };
    await Model.deleteOne({ _id: account._id });
    await recordAudit({ action: 'Account Deleted', actor: req.adminName, actorRole: 'System Admin', targetName: target.name, targetRole: target.role, branch: target.branch || '', details: `The ${target.role} account was deleted after Primary admin password confirmation.` });
    res.json({ message: 'Account deleted.' });
  } catch (error) {
    console.error('Admin account deletion failed:', error);
    if (res.headersSent) return next(error);
    return res.status(500).json({ error: 'Failed to delete the account. Check the backend logs for details.' });
  }
});

router.patch('/users/:id/authorization', async (req, res, next) => {
  try {
    if (!req.admin.isPrimaryAdmin) return res.status(403).json({ error: 'Only the Primary admin can grant account-management access.' });
    const id = req.params.id.startsWith('staff:') ? req.params.id.slice(6) : '';
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: 'System Admin account not found.' });
    const account = await Staff.findOne({ _id: id, role: 'admin' });
    if (!account) return res.status(404).json({ error: 'System Admin account not found.' });
    if (account.canManageAccounts) return res.status(409).json({ error: 'This administrator already has account-management access.' });
    account.canManageAccounts = true;
    await account.save();
    await recordAudit({ action: 'Account Management Authorized', actor: req.adminName, actorRole: 'System Admin', targetName: staffName(account), targetRole: 'System Admin', details: `${account.email} was granted account-management access.` });
    res.json({ message: 'Account-management access authorized.' });
  } catch (error) { next(error); }
});

router.get('/primary-admin-transfer', async (req, res, next) => {
  try {
    const now = new Date();
    if (req.admin.isPrimaryAdmin && req.admin.pendingPrimaryAdminTransferTargetId && req.admin.pendingPrimaryAdminTransferExpiresAt > now) {
      const target = await Staff.findById(req.admin.pendingPrimaryAdminTransferTargetId).select('firstName lastName email').lean();
      if (target) return res.json({ direction: 'outgoing', targetEmail: target.email, targetName: staffName(target), expiresAt: req.admin.pendingPrimaryAdminTransferExpiresAt });
    }
    const owner = await Staff.findOne({ isPrimaryAdmin: true, pendingPrimaryAdminTransferTargetId: req.admin._id, pendingPrimaryAdminTransferExpiresAt: { $gt: now } }).select('firstName lastName email pendingPrimaryAdminTransferExpiresAt').lean();
    if (owner) return res.json({ direction: 'incoming', fromName: staffName(owner), fromEmail: owner.email, expiresAt: owner.pendingPrimaryAdminTransferExpiresAt });
    res.json({ direction: null });
  } catch (error) { next(error); }
});

router.post('/primary-admin-transfer/target/:id', async (req, res, next) => {
  try {
    if (!req.admin.isPrimaryAdmin) return res.status(403).json({ error: 'Only the Primary admin can start a handoff.' });
    const targetId = req.params.id.startsWith('staff:') ? req.params.id.slice(6) : req.params.id;
    const confirmationEmail = String(req.body?.confirmationEmail || '').trim().toLowerCase();
    const currentPassword = String(req.body?.currentPassword || '');
    const [owner, target] = await Promise.all([
      Staff.findById(req.admin._id).select('+password'),
      mongoose.Types.ObjectId.isValid(targetId) ? Staff.findById(targetId) : null,
    ]);
    if (!owner || !(await bcrypt.compare(currentPassword, owner.password))) return res.status(401).json({ error: 'Enter your current password to start the handoff.' });
    if (!target || target.role !== 'admin' || target.isActive === false || String(target._id) === String(owner._id)) return res.status(400).json({ error: 'Choose another active System Admin account.' });
    if (confirmationEmail !== target.email.toLowerCase()) return res.status(400).json({ error: 'The confirmation email must match the selected System Admin.' });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    owner.pendingPrimaryAdminTransferTargetId = target._id;
    owner.pendingPrimaryAdminTransferExpiresAt = expiresAt;
    await owner.save();
    await recordAudit({ action: 'Primary Admin Transfer Started', actor: req.adminName, actorRole: 'System Admin', targetName: staffName(target), targetRole: 'System Admin', details: `A primary-admin handoff request was started for ${target.email}.` });
    res.json({ message: `Handoff request created for ${target.email}. They must accept within 24 hours.` });
  } catch (error) { next(error); }
});

router.post('/primary-admin-transfer/accept', async (req, res, next) => {
  try {
    const target = await Staff.findById(req.admin._id).select('+password');
    if (!target || !(await bcrypt.compare(String(req.body?.currentPassword || ''), target.password))) return res.status(401).json({ error: 'Enter your current password to accept the handoff.' });
    const owner = await Staff.findOne({ isPrimaryAdmin: true, pendingPrimaryAdminTransferTargetId: target._id, pendingPrimaryAdminTransferExpiresAt: { $gt: new Date() } });
    if (!owner) return res.status(404).json({ error: 'There is no active handoff request for your account.' });
    const ownerId = owner._id;
    const expiresAt = owner.pendingPrimaryAdminTransferExpiresAt;
    const demoted = await Staff.updateOne({ _id: ownerId, isPrimaryAdmin: true, pendingPrimaryAdminTransferTargetId: target._id, pendingPrimaryAdminTransferExpiresAt: { $gt: new Date() } }, { $set: { isPrimaryAdmin: false, canManageAccounts: false }, $unset: { pendingPrimaryAdminTransferTargetId: 1, pendingPrimaryAdminTransferExpiresAt: 1 } });
    if (demoted.matchedCount !== 1) return res.status(409).json({ error: 'The handoff changed or expired. Ask the Primary admin to try again.' });
    try {
      const promoted = await Staff.updateOne({ _id: target._id, role: 'admin', isActive: { $ne: false } }, { $set: { isPrimaryAdmin: true, canManageAccounts: true } });
      if (promoted.matchedCount !== 1) throw new Error('The recipient account could not be promoted.');
    } catch (error) {
      await Staff.updateOne({ _id: ownerId }, { $set: { isPrimaryAdmin: true, canManageAccounts: true, pendingPrimaryAdminTransferTargetId: target._id, pendingPrimaryAdminTransferExpiresAt: expiresAt } });
      throw error;
    }
    await recordAudit({ action: 'Primary Admin Transfer Accepted', actor: staffName(target), actorRole: 'System Admin', targetName: staffName(owner), targetRole: 'Former Primary Admin', details: `Primary-admin authority was transferred from ${owner.email} to ${target.email}.` });
    res.json({ message: 'You are now the Primary admin. The former Primary admin no longer has account-management access.' });
  } catch (error) { next(error); }
});

router.delete('/primary-admin-transfer', async (req, res, next) => {
  try {
    if (!req.admin.isPrimaryAdmin) return res.status(403).json({ error: 'Only the Primary admin can cancel this handoff.' });
    req.admin.pendingPrimaryAdminTransferTargetId = undefined;
    req.admin.pendingPrimaryAdminTransferExpiresAt = undefined;
    await req.admin.save();
    await recordAudit({ action: 'Primary Admin Transfer Cancelled', actor: req.adminName, actorRole: 'System Admin', targetName: req.adminName, targetRole: 'System Admin', details: 'The pending primary-admin handoff was cancelled.' });
    res.json({ message: 'Handoff cancelled.' });
  } catch (error) { next(error); }
});

router.post('/system-admins', async (req, res, next) => {
  try {
    if (!req.admin.isPrimaryAdmin) return res.status(403).json({ error: 'Only the Primary admin can create System Admin accounts.' });
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const mobile = String(req.body?.mobile || '').trim();
    const canManageAccounts = req.body?.canManageAccounts === true;
    if (!name || !email || !mobile) return res.status(400).json({ error: 'Account name, email, and mobile number are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (await Staff.exists({ email }) || await Donor.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists.' });
    const staffId = await generateStaffId(Staff);
    const generatedPassword = crypto.randomBytes(18).toString('base64url');
    const [firstName, ...lastNameParts] = name.split(/\s+/);
    const account = await Staff.create({
      firstName,
      lastName: lastNameParts.join(' ') || firstName,
      email,
      mobile,
      staffId,
      role: 'admin',
      createdByName: req.adminName,
      createdByEmail: req.admin.email,
      canManageAccounts,
      isPrimaryAdmin: false,
      requirePasswordChange: true,
      isActive: true,
      password: await bcrypt.hash(generatedPassword, 10),
    });
    await recordAudit({ action: 'System Admin Created', actor: req.adminName, actorRole: 'System Admin', targetName: staffName(account), targetRole: 'System Admin', details: `${account.email} was created with ${canManageAccounts ? 'account-management' : 'standard'} access.` });
    res.status(201).json({ message: 'System Admin account created. Share the generated password securely.', staffId, generatedPassword });
  } catch (error) { next(error); }
});

router.post('/supervisors', async (req, res, next) => {
  try {
    if (!req.admin.canManageAccounts) return res.status(403).json({ error: 'Account manager access is required to create accounts.' });
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const mobile = String(req.body?.mobile || '').trim();
    const facilityId = String(req.body?.facilityId || '').trim();
    if (!name || !email || !mobile) return res.status(400).json({ error: 'Account name, email, and mobile number are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!mongoose.Types.ObjectId.isValid(facilityId)) return res.status(400).json({ error: 'Choose a facility for this Branch Admin.' });
    if (await Staff.exists({ email }) || await Donor.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists.' });
    const facility = await Facility.findOne({ _id: facilityId, isActive: { $ne: false } }).lean();
    if (!facility) return res.status(400).json({ error: 'That facility does not exist or is inactive.' });
    const staffId = await generateStaffId(Staff);
    const generatedPassword = crypto.randomBytes(18).toString('base64url');
    const [firstName, ...lastNameParts] = name.split(/\s+/);
    const account = await Staff.create({ firstName, lastName: lastNameParts.join(' ') || firstName, email, mobile, staffId, role: 'branch-admin', facilityID: facility._id, createdByName: req.adminName, createdByEmail: req.admin.email, canManageAccounts: false, isPrimaryAdmin: false, requirePasswordChange: true, isActive: true, password: await bcrypt.hash(generatedPassword, 10) });
    await recordAudit({ action: 'Branch Admin Created', actor: req.adminName, actorRole: 'System Admin', targetName: staffName(account), targetRole: 'Branch Admin', branch: facility.facilityName, details: `${account.email} was assigned to ${facility.facilityName}.` });
    res.status(201).json({ message: 'Branch Admin account created. Share the generated password securely.', staffId, generatedPassword });
  } catch (error) { next(error); }
});

router.post('/supervisors/:id/generate-password', async (req, res, next) => {
  try {
    if (!req.admin.canManageAccounts) return res.status(403).json({ error: 'Account manager access is required.' });
    const id = req.params.id.startsWith('staff:') ? req.params.id.slice(6) : '';
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: 'Pending account not found.' });
    const account = await Staff.findById(id);
    if (!account) return res.status(404).json({ error: 'Pending account not found.' });
    if (account.isActive !== false || account.requirePasswordChange !== true) return res.status(409).json({ error: 'This account does not have a pending password setup.' });
    const generatedPassword = crypto.randomBytes(18).toString('base64url');
    account.password = await bcrypt.hash(generatedPassword, 10);
    account.isActive = true;
    account.requirePasswordChange = true;
    account.passwordSetupTokenHash = undefined;
    account.passwordSetupExpiresAt = undefined;
    await account.save();
    await recordAudit({ action: 'Supervisor Password Generated', actor: req.adminName, actorRole: 'System Admin', targetName: staffName(account), targetRole: normalizedStaffRole(account.role), branch: account.branch || '', details: `A temporary password was generated for ${account.email}.` });
    res.json({ message: `A temporary password was generated for ${account.email}.`, generatedPassword });
  } catch (error) { next(error); }
});

router.post('/change-password', async (req, res, next) => {
  try {
    const oldPassword = String(req.body?.oldPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (!oldPassword || newPassword.length < 8) return res.status(400).json({ error: 'Enter your current password and a new password of at least 8 characters.' });
    if (!(await bcrypt.compare(oldPassword, req.admin.password))) return res.status(400).json({ error: 'Current password does not match.' });
    req.admin.password = await bcrypt.hash(newPassword, 10);
    req.admin.requirePasswordChange = false;
    await req.admin.save();
    await recordAudit({ action: 'Password Updated', actor: req.adminName, actorRole: 'System Admin', targetName: req.adminName, targetRole: 'System Admin', details: 'The administrator updated their password.' });
    res.json({ message: 'Password updated successfully.' });
  } catch (error) { next(error); }
});

router.get('/audit', async (req, res, next) => {
  try { res.json({ events: await AdminAudit.find().sort({ createdAt: -1 }).limit(1000).lean() }); }
  catch (error) { next(error); }
});

router.get('/audit.csv', async (req, res, next) => {
  try {
    const events = await AdminAudit.find().sort({ createdAt: -1 }).limit(10000).lean();
    const headers = ['Timestamp', 'Action', 'Actor', 'Actor Role', 'Target User', 'Target Role', 'Branch / Facility', 'Audit Details', 'Previous Hash', 'Entry Hash'];
    const cell = (value) => {
      const text = String(value ?? '');
      const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = events.map((event) => [event.createdAt?.toISOString?.() || '', event.action, event.actor, event.actorRole, event.targetName, event.targetRole, event.branch, event.details, event.previousHash, event.entryHash].map(cell).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sandugo-audit-trail.csv"');
    res.send([headers.map(cell).join(','), ...rows].join('\r\n'));
  } catch (error) { next(error); }
});

module.exports = router;
