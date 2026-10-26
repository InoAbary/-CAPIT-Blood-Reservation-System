const express = require('express');
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const Donor = require('../../db/models/donor.cjs');
const Staff = require('../../db/models/staff.cjs');

const Facility = require('../../db/models/facilities.cjs');
const router = express.Router();
const requireStaff = require('../middleware/requireStaff.cjs')
const requireRole = require('../middleware/requireRole.cjs');
const { default: facilities } = require('../../db/models/facilities.cjs');
const { default: staff } = require('../../db/models/staff.cjs');



function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function formatStaffUser(staff) {
  const role = ['Blood Services Admin', 'PRC Staff'].includes(staff.role) ? 'BSF Staff' : staff.role || 'Staff';
  return {
    id: `staff:${staff._id}`,
    name: `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email,
    email: staff.email,
    role,
    branch: staff.branch || '',
    staffId: staff.staffId || '',
    createdByName: staff.createdByName || 'System',
    createdByEmail: staff.createdByEmail || '',
    canManageAccounts: staff.canManageAccounts === true,
    isPrimaryAdmin: staff.isPrimaryAdmin === true,
    status: staff.isActive === false
      ? (staff.passwordSetupTokenHash ? 'Pending Setup' : 'Suspended')
      : 'Active',
    createdAt: staff.createdAt,
  };
}

async function getRegistryUsers(creatorEmail, includeAuthorizationQueue) {
  if (!isDbConnected()) {
    const visibleUsers = users.filter((user) => includeAuthorizationQueue || user.createdByEmail === creatorEmail).map((user) => ({
      ...user,
      pendingAuthorization: user.role === 'System Admin' && user.canManageAccounts !== true,
    }));
    return visibleUsers;
  }

  const staffAccounts = await Staff.find(includeAuthorizationQueue ? {} : { createdByEmail: creatorEmail })
    .select('firstName lastName email role branch staffId createdByName createdByEmail canManageAccounts isPrimaryAdmin isActive createdAt +passwordSetupTokenHash')
    .lean();
  return staffAccounts.map((staff) => ({
    ...formatStaffUser(staff),
    pendingAuthorization: staff.role === 'System Admin' && staff.canManageAccounts !== true,
  }));
}

// async function getAuditEvents() {
//   if (!isDbConnected()) return auditEvents;
//   return AdminAudit.find().sort({ createdAt: -1 }).lean();
// }

// async function recordAudit(event) {
//   const auditEvent = { _id: `aud-${Date.now()}-${crypto.randomInt(1000, 10000)}`, createdAt: new Date(), ...event };
//   auditEvents.unshift(auditEvent);
//   if (isDbConnected()) {
//     const { action, actor, actorRole, targetName, targetRole, branch, details } = event;
//     await AdminAudit.create({ action, actor, actorRole, targetName, targetRole, branch, details });
//   }
// }

// GET /api/admin/summary
router.get('/summary', async (req, res) => {
  try {
    
  } catch (err) {
    res.status(400).json({error: 'Failed to get summary.'})
  }
});

// GET /api/admin/users
router.get('/users', requireStaff, requireRole("admin"), async (req, res) => {
  try {
    const branchAdmins = await Staff.find({role: "branch-admin", isActive: true})
    .select('firstName lastName email facilityID role staffId createdAt')
    .lean();

    const facilityIds = branchAdmins
      .map((s) => s.facilityID)
      .filter(Boolean);

    const facilities = facilityIds.length
      ? await Facility.find({ _id: { $in: facilityIds } }).select('facilityName').lean()
      : [];

    const facilityNames = new Map(
      facilities.map((f) => [String(f._id), f.facilityName])
    );


    return res.json({
      success: true,
      users: branchAdmins.map((staff) => ({
        id: `staff:${staff._id}`,
        name: `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email,
        email: staff.email,
        role: staff.role,
        branch: staff.facilityID ? facilityNames.get(String(staff.facilityID)) || '' : '',
        staffId: staff.staffId || '',
        status: 'Active',
        createdAt: staff.createdAt,
      })),
    });
  } catch (err) {
    console.log(err)
    res.status(400).json({error: 'Failed to get summary.'})
  }
});

router.get('/facilities', async(req, res) => {
  try {
         
      const facilities = await Facility.find({ isActive: true })
      .sort({ facilityName: 1 })
      .lean();
      res.json({success: true, facilities: facilities});
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to load facilities.' });
  }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (!['Active', 'Suspended'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Active or Suspended.' });
    }
    if (!req.admin.canManageAccounts) {
      return res.status(403).json({ error: 'An administrator must authorize you before you can activate or deactivate accounts.' });
    }

    let user;
    if (!isDbConnected()) {
      user = users.find((entry) => entry.id === id);
    } else if (id.startsWith('staff:')) {
      const [collection, documentId] = id.split(':', 2);
      const record = collection === 'staff'
        ? await Staff.findById(documentId).lean()
        : null;
      if (record) user = formatStaffUser(record);
    }

    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.isPrimaryAdmin && status !== 'Active') {
      return res.status(409).json({ error: 'Transfer primary-admin authority before deactivating this account.' });
    }
    const oldStatus = user.status;
    if (isDbConnected()) {
      const documentId = id.slice('staff:'.length);
      await Staff.findOneAndUpdate(
        { _id: documentId },
        { isActive: status === 'Active' },
        { runValidators: true },
      );
    } else {
      user.status = status;
      const authRoutes = require('./adminAuth.cjs');
      const accountList = user.role === 'Donor' ? authRoutes.inMemoryDonors : authRoutes.inMemoryStaff;
      const account = accountList?.find((entry) => entry.email.toLowerCase() === user.email.toLowerCase());
      if (account) account.isActive = status === 'Active';
    }
    user.status = status;
    await recordAudit({
      action: status === 'Active' ? 'Account Activated' : 'Account Suspended',
      actor: req.admin.name,
      actorRole: 'System Admin',
      targetName: user.name,
      targetRole: user.role,
      branch: user.branch || 'PRC Network',
      details: `Status transitioned from ${oldStatus} to ${status}`,
    });

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// router.get('/primary-admin-transfer', async (req, res, next) => {
//   try {
//     const now = new Date();
//     if (isDbConnected()) {
//       if (req.admin.isPrimaryAdmin) {
//         const owner = await Staff.findOne({ _id: req.admin.id, isPrimaryAdmin: true }).select('pendingPrimaryAdminTransferTargetId pendingPrimaryAdminTransferExpiresAt').lean();
//         if (owner?.pendingPrimaryAdminTransferTargetId && owner.pendingPrimaryAdminTransferExpiresAt > now) {
//           const target = await Staff.findById(owner.pendingPrimaryAdminTransferTargetId).select('firstName lastName email').lean();
//           if (target) return res.json({ direction: 'outgoing', targetEmail: target.email, targetName: `${target.firstName || ''} ${target.lastName || ''}`.trim(), expiresAt: owner.pendingPrimaryAdminTransferExpiresAt });
//         }
//       } else {
//         const owner = await Staff.findOne({ isPrimaryAdmin: true, pendingPrimaryAdminTransferTargetId: req.admin.id, pendingPrimaryAdminTransferExpiresAt: { $gt: now } }).select('firstName lastName email pendingPrimaryAdminTransferExpiresAt').lean();
//         if (owner) return res.json({ direction: 'incoming', fromName: `${owner.firstName || ''} ${owner.lastName || ''}`.trim(), fromEmail: owner.email, expiresAt: owner.pendingPrimaryAdminTransferExpiresAt });
//       }
//     } else {
//       const authRoutes = require('./adminAuth.cjs');
//       const owner = authRoutes.inMemoryStaff.find((account) => account.isPrimaryAdmin && account.pendingPrimaryAdminTransferExpiresAt > now);
//       if (owner && req.admin.isPrimaryAdmin && owner.email === req.admin.email) {
//         return res.json({ direction: 'outgoing', targetEmail: owner.pendingPrimaryAdminTransferTargetEmail, expiresAt: owner.pendingPrimaryAdminTransferExpiresAt });
//       }
//       if (owner && owner.pendingPrimaryAdminTransferTargetEmail === req.admin.email) {
//         return res.json({ direction: 'incoming', fromName: `${owner.firstName || ''} ${owner.lastName || ''}`.trim(), fromEmail: owner.email, expiresAt: owner.pendingPrimaryAdminTransferExpiresAt });
//       }
//     }
//     res.json({ direction: null });
//   } catch (err) { next(err); }
// });

// router.post('/primary-admin-transfer/target/:id', async (req, res, next) => {
//   if (!req.admin.isPrimaryAdmin) return res.status(403).json({ error: 'Only the Primary admin can start a role transfer.' });
//   try {
//     const currentPassword = String(req.body?.currentPassword || '');
//     const confirmationEmail = String(req.body?.confirmationEmail || '').trim().toLowerCase();
//     const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
//     if (isDbConnected()) {
//       const targetId = req.params.id.startsWith('staff:') ? req.params.id.slice('staff:'.length) : req.params.id;
//       if (!mongoose.Types.ObjectId.isValid(targetId)) return res.status(404).json({ error: 'System Admin account not found.' });
//       const [owner, target] = await Promise.all([Staff.findById(req.admin.id), Staff.findById(targetId)]);
//       if (!owner || !owner.isPrimaryAdmin || !(await bcrypt.compare(currentPassword, owner.password))) return res.status(401).json({ error: 'Enter your current password to start the transfer.' });
//       if (!target || target.role !== 'System Admin' || target.isActive === false || String(target._id) === String(owner._id)) return res.status(400).json({ error: 'Choose another active System Admin account.' });
//       if (confirmationEmail !== target.email.toLowerCase()) return res.status(400).json({ error: 'The confirmation email must match the selected System Admin.' });
//       if (owner.pendingPrimaryAdminTransferTargetId && owner.pendingPrimaryAdminTransferExpiresAt > new Date()) return res.status(409).json({ error: 'Cancel the current handoff before starting another.' });
//       owner.pendingPrimaryAdminTransferTargetId = target._id;
//       owner.pendingPrimaryAdminTransferExpiresAt = expiresAt;
//       await owner.save();
//       await recordAudit({ action: 'Primary Admin Transfer Started', actor: req.admin.name, actorRole: 'System Admin', targetName: `${target.firstName || ''} ${target.lastName || ''}`.trim() || target.email, targetRole: target.role, branch: target.branch || '', details: `A primary-admin handoff was requested for ${target.email}; recipient acceptance is pending.` });
//       return res.json({ success: true, message: `Handoff request created for ${target.email}. Ask them to sign in and accept within 24 hours.` });
//     }

//     const authRoutes = require('./adminAuth.cjs');
//     const selected = users.find((user) => user.id === req.params.id && user.role === 'System Admin' && user.status === 'Active');
//     const owner = authRoutes.inMemoryStaff.find((account) => account.email === req.admin.email && account.isPrimaryAdmin);
//     const target = selected && authRoutes.inMemoryStaff.find((account) => account.email === selected.email);
//     if (!owner || !bcrypt.compareSync(currentPassword, owner.passwordHash)) return res.status(401).json({ error: 'Enter your current password to start the transfer.' });
//     if (!selected || !target || target.email === owner.email) return res.status(400).json({ error: 'Choose another active System Admin account.' });
//     if (confirmationEmail !== target.email.toLowerCase()) return res.status(400).json({ error: 'The confirmation email must match the selected System Admin.' });
//     if (owner.pendingPrimaryAdminTransferExpiresAt > new Date()) return res.status(409).json({ error: 'Cancel the current handoff before starting another.' });
//     owner.pendingPrimaryAdminTransferTargetEmail = target.email;
//     owner.pendingPrimaryAdminTransferExpiresAt = expiresAt;
//     await recordAudit({ action: 'Primary Admin Transfer Started', actor: req.admin.name, actorRole: 'System Admin', targetName: `${target.firstName || ''} ${target.lastName || ''}`.trim() || target.email, targetRole: target.role, branch: target.branch || '', details: `A primary-admin handoff was requested for ${target.email}; recipient acceptance is pending.` });
//     res.json({ success: true, message: `Handoff request created for ${target.email}. Ask them to sign in and accept within 24 hours.` });
//   } catch (err) { next(err); }
// });

// router.post('/primary-admin-transfer/accept', async (req, res, next) => {
//   try {
//     const currentPassword = String(req.body?.currentPassword || '');
//     if (isDbConnected()) {
//       const target = await Staff.findById(req.admin.id);
//       if (!target || target.role !== 'System Admin' || target.isActive === false || !(await bcrypt.compare(currentPassword, target.password))) return res.status(401).json({ error: 'Enter your current password to accept the transfer.' });
//       const owner = await Staff.findOne({ isPrimaryAdmin: true, pendingPrimaryAdminTransferTargetId: target._id, pendingPrimaryAdminTransferExpiresAt: { $gt: new Date() } });
//       if (!owner) return res.status(404).json({ error: 'There is no active transfer request for your account.' });
//       const ownerId = owner._id;
//       const ownerName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email;
//       const ownerEmail = owner.email;
//       const expiresAt = owner.pendingPrimaryAdminTransferExpiresAt;
//       const demoted = await Staff.updateOne({ _id: ownerId, isPrimaryAdmin: true, pendingPrimaryAdminTransferTargetId: target._id, pendingPrimaryAdminTransferExpiresAt: { $gt: new Date() } }, { $set: { isPrimaryAdmin: false, canManageAccounts: false }, $unset: { pendingPrimaryAdminTransferTargetId: 1, pendingPrimaryAdminTransferExpiresAt: 1 } });
//       if (demoted.matchedCount !== 1) return res.status(409).json({ error: 'The transfer request changed or expired. Ask the Primary admin to start again.' });
//       try {
//         const promoted = await Staff.updateOne({ _id: target._id, role: 'System Admin', isActive: { $ne: false } }, { $set: { isPrimaryAdmin: true, canManageAccounts: true } });
//         if (promoted.matchedCount !== 1) throw new Error('Your account could not be promoted.');
//       } catch (error) {
//         await Staff.updateOne({ _id: ownerId }, { $set: { isPrimaryAdmin: true, canManageAccounts: true, pendingPrimaryAdminTransferTargetId: target._id, pendingPrimaryAdminTransferExpiresAt: expiresAt } });
//         throw error;
//       }
//       await recordAudit({ action: 'Primary Admin Transfer Accepted', actor: `${target.firstName || ''} ${target.lastName || ''}`.trim() || target.email, actorRole: target.role, targetName: ownerName, targetRole: 'Former Primary Admin', branch: target.branch || '', details: `Primary-admin authority transferred from ${ownerEmail} to ${target.email} after recipient password confirmation.` });
//       return res.json({ success: true, message: 'You are now the Primary admin. The previous Primary admin no longer has account-management access.' });
//     }

//     const authRoutes = require('./adminAuth.cjs');
//     const target = authRoutes.inMemoryStaff.find((account) => account.email === req.admin.email && account.role === 'System Admin');
//     if (!target || !bcrypt.compareSync(currentPassword, target.passwordHash)) return res.status(401).json({ error: 'Enter your current password to accept the transfer.' });
//     const owner = authRoutes.inMemoryStaff.find((account) => account.isPrimaryAdmin && account.pendingPrimaryAdminTransferTargetEmail === target.email && account.pendingPrimaryAdminTransferExpiresAt > new Date());
//     if (!owner) return res.status(404).json({ error: 'There is no active transfer request for your account.' });
//     owner.isPrimaryAdmin = false;
//     owner.canManageAccounts = false;
//     delete owner.pendingPrimaryAdminTransferTargetEmail;
//     delete owner.pendingPrimaryAdminTransferExpiresAt;
//     target.isPrimaryAdmin = true;
//     target.canManageAccounts = true;
//     const ownerUser = users.find((user) => user.email === owner.email);
//     const targetUser = users.find((user) => user.email === target.email);
//     if (ownerUser) { ownerUser.isPrimaryAdmin = false; ownerUser.canManageAccounts = false; }
//     if (targetUser) { targetUser.isPrimaryAdmin = true; targetUser.canManageAccounts = true; }
//     await recordAudit({ action: 'Primary Admin Transfer Accepted', actor: `${target.firstName || ''} ${target.lastName || ''}`.trim() || target.email, actorRole: target.role, targetName: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email, targetRole: 'Former Primary Admin', details: `Primary-admin authority transferred from ${owner.email} to ${target.email} after recipient password confirmation.` });
//     res.json({ success: true, message: 'You are now the Primary admin. The previous Primary admin no longer has account-management access.' });
//   } catch (err) { next(err); }
// });

// router.delete('/primary-admin-transfer', async (req, res, next) => {
//   if (!req.admin.isPrimaryAdmin) return res.status(403).json({ error: 'Only the Primary admin can cancel a transfer request.' });
//   try {
//     if (isDbConnected()) {
//       await Staff.updateOne({ _id: req.admin.id, isPrimaryAdmin: true }, { $unset: { pendingPrimaryAdminTransferTargetId: 1, pendingPrimaryAdminTransferExpiresAt: 1 } });
//     } else {
//       const owner = require('./adminAuth.cjs').inMemoryStaff.find((account) => account.email === req.admin.email && account.isPrimaryAdmin);
//       if (owner) { delete owner.pendingPrimaryAdminTransferTargetEmail; delete owner.pendingPrimaryAdminTransferExpiresAt; }
//     }
//     await recordAudit({ action: 'Primary Admin Transfer Cancelled', actor: req.admin.name, actorRole: 'System Admin', targetName: req.admin.name, targetRole: 'System Admin', details: 'The pending primary-admin transfer request was cancelled.' });
//     res.json({ success: true, message: 'Transfer request cancelled. You remain the Primary admin.' });
//   } catch (err) { next(err); }
// });

router.patch('/users/:id/authorization', async (req, res, next) => {
  if (!req.admin.isPrimaryAdmin) {
    return res.status(403).json({ error: 'Only the primary System Admin can grant account-management access.' });
  }

  try {
    const id = req.params.id;
    let account;
    if (isDbConnected()) {
      if (!id.startsWith('staff:')) return res.status(404).json({ error: 'Administrator account not found.' });
      account = await Staff.findById(id.slice('staff:'.length));
      if (!account || account.role !== 'System Admin') return res.status(404).json({ error: 'Administrator account not found.' });
      if (account.canManageAccounts) return res.status(409).json({ error: 'This administrator is already authorized.' });
      account.canManageAccounts = true;
      await account.save();
    } else {
      const user = users.find((entry) => entry.id === id && entry.role === 'System Admin');
      if (!user) return res.status(404).json({ error: 'Administrator account not found.' });
      if (user.canManageAccounts) return res.status(409).json({ error: 'This administrator is already authorized.' });
      user.canManageAccounts = true;
      account = require('./adminAuth.cjs').inMemoryStaff.find((entry) => entry.email === user.email);
      if (account) account.canManageAccounts = true;
    }

    await recordAudit({
      action: 'Account Management Authorized',
      actor: req.admin.name,
      actorRole: 'System Admin',
      targetName: `${account.firstName || ''} ${account.lastName || ''}`.trim() || account.email,
      targetRole: account.role,
      branch: account.branch || '',
      details: `${account.email} was authorized to activate and deactivate accounts.`,
    });
    res.json({ success: true, message: 'Account-management access authorized.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/supervisors
router.post('/supervisors', async (req, res) => {
  
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const mobile = String(req.body.mobile || '').trim();
  const requestedStaffId = String(req.body.staffId || '').trim();
  const facilityId = String(req.body.facilityId || '').trim();

  if (!name || !email) {
    return res.status(400).json({ error: 'Account name and email are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!mongoose.Types.ObjectId.isValid(facilityId)) {
    return res.status(400).json({ error: 'Choose a facility for this Branch Admin.' });
  }

  try {
    const duplicate = await Promise.all([
      Staff.exists({ email }),
      Donor.exists({ email }),
    ]).then((r) => r.some(Boolean));
    if (duplicate) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const facility = await Facility.findOne({ _id: facilityId, isActive: true }).lean();
    if (!facility) {
      return res.status(400).json({ error: 'That facility does not exist or is inactive.' });
    }

    let staffId = requestedStaffId;
    const staffIdExists = (value) => Staff.exists({ staffId: value });
    if (staffId && await staffIdExists(staffId)) {
      return res.status(409).json({ error: 'That Staff ID is already assigned.' });
    }
    while (!staffId || await staffIdExists(staffId)) {
      staffId = `STF-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    }

    const generatedPassword = crypto.randomBytes(18).toString('base64url');
    const [firstName, ...lastNameParts] = name.split(/\s+/);

    const staff = new Staff({
      firstName,
      lastName: lastNameParts.join(' ') || firstName,
      email,
      mobile,
      staffId,
      role: 'branch-admin',
      facilityID: facility._id,
      createdByName: req.user.name || req.user.email,
      createdByEmail: req.user.email,
      canManageAccounts: false,
      isPrimaryAdmin: false,
      requirePasswordChange: true,
      isActive: true,
      password: bcrypt.hashSync(generatedPassword, 10),
    });
    await staff.save();

    res.status(201).json({
      success: true,
      message: 'Branch Admin account created. Share the generated password securely.',
      staffId,
      generatedPassword,
    });
  } catch (err) {
    res.status(500).status({error: 'Failed to create branch admin account.'})
  }
});

router.post('/change-owner/:id', requireStaff, requireRole('admin'), async (req, res) => {
  try {

    const { currentPassword, firstName, lastName, email } = req.body || {}
    const userID = req.params.id
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const cleanFirst = String(firstName || '').trim();
    const cleanLast = String(lastName || '').trim();

    const curOwner = await Staff.findById(userID).select('+password')
    if (!curOwner || curOwner.isActive === false) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (curOwner.role !== 'admin') {
      return res.status(401).json({ error: 'No authorization to perform admin transfer.' });
    }

    if (!currentPassword) {
      return res.status(400).json({ error: 'Enter your current password to confirm the transfer.' });
    }
    if (!cleanFirst || !normalizedEmail) {
      return res.status(400).json({ error: 'First name and email are required for the new owner.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (normalizedEmail === curOwner.email.toLowerCase()) {
      return res.status(400).json({ error: 'The new owner must be a different account.' });
    }

    const duplicate = await Promise.all([
      Staff.exists({ email }),
      Donor.exists({ email }),
    ]).then((r) => r.some(Boolean));
    if (duplicate) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, curOwner.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const tempPassword = crypto.randomBytes(18).toString('base64url');

    const newOwner = await Staff.create({
      firstName: cleanFirst,
      lastName: cleanLast,
      email: normalizedEmail,
      role: 'admin',
      isActive: true,
      password: await bcrypt.hash(tempPassword, 10),
    });

    curOwner.role = 'staff';

    await curOwner.save();

    return res.status(201).json({
      success: true,
      message: 'Ownership transferred.',
      ownerId: newOwner._id,
      tempPassword,
    })
    


    } catch (err) {
      res.status(400).json({error: 'Failed to transfer ownership.'})
    }
})

router.post('/supervisors/:id/generate-password', async (req, res, next) => {
  try {
    const isMongoUser = req.params.id.startsWith('staff:');
    const staffId = isMongoUser ? req.params.id.slice('staff:'.length) : req.params.id;
    let account;

    if (isDbConnected()) {
      if (!isMongoUser) return res.status(404).json({ error: 'Pending supervisor account not found.' });
      account = await Staff.findById(staffId).select('+passwordSetupTokenHash +passwordSetupExpiresAt');
    } else {
      const authRoutes = require('./adminAuth.cjs');
      account = authRoutes.inMemoryStaff.find((entry) => entry._id === staffId);
    }

    if (!account) return res.status(404).json({ error: 'Pending supervisor account not found.' });
    if (!req.admin.canManageAccounts || account.createdByEmail !== req.admin.email) {
      return res.status(403).json({ error: 'You are not authorized to manage this account.' });
    }
    if (account.isActive !== false || account.requirePasswordChange !== true) {
      return res.status(409).json({ error: 'This account does not have a pending password setup.' });
    }

    const generatedPassword = crypto.randomBytes(18).toString('base64url');
    if (isDbConnected()) {
      account.password = account.generateHash(generatedPassword);
    } else {
      account.passwordHash = bcrypt.hashSync(generatedPassword, 10);
    }
    account.isActive = true;
    account.passwordSetupTokenHash = undefined;
    account.passwordSetupExpiresAt = undefined;
    const name = `${account.firstName || ''} ${account.lastName || ''}`.trim() || account.email;
    if (isDbConnected()) {
      await account.save();
    } else {
      const registryAccount = users.find((user) => user.email.toLowerCase() === account.email.toLowerCase());
      if (registryAccount) registryAccount.status = 'Active';
    }

    try {
      await recordAudit({
        action: 'Supervisor Password Generated',
        actor: 'Admin Sandugo',
        actorRole: 'System Admin',
        targetName: name,
        targetRole: account.role,
        branch: account.branch || '',
        details: `A new temporary password was generated for ${account.email}.`,
      });
    } catch (auditError) {
      console.error('Could not record supervisor password generation audit event:', auditError);
    }

    res.json({
      success: true,
      message: `A new temporary password was generated for ${account.email}.`,
      generatedPassword,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/change-password
router.post('/change-password', async (req, res, next) => {
  const { email, oldPassword, newPassword } = req.body;
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Email, current password, and new password are required.' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  try {
    let staffAcc;
    if (isDbConnected()) {
      staffAcc = await Staff.findOne({ email: email.trim().toLowerCase() });
      if (staffAcc) {
        if (!oldPassword || !staffAcc.validPassword(oldPassword)) {
          return res.status(400).json({ error: 'Current password does not match.' });
        }
        staffAcc.password = staffAcc.generateHash(newPassword);
        staffAcc.requirePasswordChange = false;
        await staffAcc.save();
      }
    } else {
      const authRoutes = require('./adminAuth.cjs');
      staffAcc = authRoutes.inMemoryStaff?.find((s) => s.email.toLowerCase() === email.toLowerCase());
      if (staffAcc) {
        if (!bcrypt.compareSync(oldPassword, staffAcc.passwordHash)) {
          return res.status(400).json({ error: 'Current password does not match.' });
        }
        staffAcc.passwordHash = bcrypt.hashSync(newPassword, 10);
        staffAcc.requirePasswordChange = false;
      }
    }

    if (!staffAcc) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    await recordAudit({
      action: 'Password Updated',
      actor: `${staffAcc.firstName} ${staffAcc.lastName}`.trim(),
      actorRole: staffAcc.role,
      targetName: `${staffAcc.firstName} ${staffAcc.lastName}`.trim(),
      targetRole: staffAcc.role,
      branch: staffAcc.branch || 'PRC Facility',
      details: 'User successfully updated their account password',
    });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});



// GET /api/admin/audit
router.get('/audit', async (req, res, next) => {
  try {
    res.json({ events: await getAuditEvents() });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit.csv
router.get('/audit.csv', async (req, res, next) => {
  let events;
  try {
    events = await getAuditEvents();
  } catch (err) {
    return next(err);
  }
  const headers = ['Timestamp', 'Action', 'Actor', 'Actor Role', 'Target User', 'Target Role', 'Branch / Facility', 'Audit Details'];
  const rows = events.map((e) => [
    new Date(e.createdAt || e.created_at).toISOString(),
    `"${(e.action || '').replace(/"/g, '""')}"`,
    `"${(e.actor || '').replace(/"/g, '""')}"`,
    `"${(e.actorRole || '').replace(/"/g, '""')}"`,
    `"${(e.targetName || '').replace(/"/g, '""')}"`,
    `"${(e.targetRole || '').replace(/"/g, '""')}"`,
    `"${(e.branch || '').replace(/"/g, '""')}"`,
    `"${(e.details || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sandugo-audit-trail.csv"');
  res.send(csvContent);
});

module.exports = router;
