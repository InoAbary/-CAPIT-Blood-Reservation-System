const express = require('express');
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const Donor = require('../../db/models/donor.cjs');
const Staff = require('../../db/models/staff.cjs');
const AdminAudit = require('../../db/models/adminAudit.cjs');
const facilities = require('../facilityData.cjs');
const router = express.Router();
const { requireAdminSession } = require('./adminAuth.cjs');
router.use(requireAdminSession);

// Mock store for users
let users = [
  {
    id: 'u-owner',
    name: 'Akhisha Babani',
    email: 'akhishapbabani@gmail.com',
    role: 'System Admin',
    branch: 'PRC National Headquarters',
    createdByName: 'Root System',
    status: 'Active',
    createdAt: new Date('2026-08-01T08:00:00Z')
  },
  {
    id: 'u-1',
    name: 'Admin Sandugo',
    email: 'admin@sandugo.gov.ph',
    role: 'System Admin',
    branch: 'PRC National Headquarters',
    createdByName: 'Root System',
    status: 'Active',
    createdAt: new Date('2026-08-01T08:00:00Z')
  },
  {
    id: 'u-2',
    name: 'Dr. Teresa Mendoza',
    email: 'tmendoza@pgh.gov.ph',
    role: 'Hospital Supervisor',
    branch: 'Philippine General Hospital (PGH)',
    createdByName: 'Admin Sandugo',
    status: 'Active',
    createdAt: new Date('2026-08-15T09:30:00Z')
  },
  {
    id: 'u-3',
    name: 'Dr. Manuel Roxas',
    email: 'mroxas@stlukes.com.ph',
    role: 'Hospital Supervisor',
    branch: "St. Luke's Medical Center - Global City",
    createdByName: 'Admin Sandugo',
    status: 'Active',
    createdAt: new Date('2026-08-20T10:15:00Z')
  },
  {
    id: 'u-4',
    name: 'Maria Elena Reyes',
    email: 'elena.reyes@prc.org.ph',
    role: 'BSF Supervisor',
    branch: 'Philippine Red Cross - National Blood Center',
    createdByName: 'Admin Sandugo',
    status: 'Active',
    createdAt: new Date('2026-09-01T11:00:00Z')
  },
  {
    id: 'u-5',
    name: 'Roberto Gomez',
    email: 'rgomez@prc-qc.org.ph',
    role: 'BSF Supervisor',
    branch: 'Philippine Red Cross - Quezon City Chapter',
    createdByName: 'Admin Sandugo',
    status: 'Active',
    createdAt: new Date('2026-09-05T14:20:00Z')
  },
  {
    id: 'u-6',
    name: 'Nurse Clarissa Santos',
    email: 'csantos@pgh.gov.ph',
    role: 'Hospital Staff',
    branch: 'Philippine General Hospital (PGH)',
    createdByName: 'Dr. Teresa Mendoza',
    status: 'Active',
    createdAt: new Date('2026-09-10T16:00:00Z')
  },
  {
    id: 'u-7',
    name: 'Juan Dela Cruz',
    email: 'donor@example.com',
    role: 'Donor',
    branch: 'Metropolitan Manila',
    createdByName: 'Self-Registered',
    status: 'Active',
    createdAt: new Date('2026-09-12T08:30:00Z')
  }
];

// Mock store for audit log events
let auditEvents = [
  {
    _id: 'aud-1',
    createdAt: new Date('2026-10-15T08:12:00Z'),
    action: 'Supervisor Provisioned',
    actor: 'Admin Sandugo',
    actorRole: 'System Admin',
    targetName: 'Dr. Manuel Roxas',
    targetRole: 'Hospital Supervisor',
    branch: "St. Luke's Medical Center - Global City",
    details: 'Invitation token issued with 24-hour expiration'
  },
  {
    _id: 'aud-2',
    createdAt: new Date('2026-10-14T15:45:00Z'),
    action: 'Account Activated',
    actor: 'Admin Sandugo',
    actorRole: 'System Admin',
    targetName: 'Maria Elena Reyes',
    targetRole: 'BSF Supervisor',
    branch: 'Philippine Red Cross - National Blood Center',
    details: 'Credentials verified and active flag toggled'
  },
  {
    _id: 'aud-3',
    createdAt: new Date('2026-10-13T11:20:00Z'),
    action: 'Supervisor Provisioned',
    actor: 'Admin Sandugo',
    actorRole: 'System Admin',
    targetName: 'Dr. Teresa Mendoza',
    targetRole: 'Hospital Supervisor',
    branch: 'Philippine General Hospital (PGH)',
    details: 'PRC License PRC-MD-088921 verified with registry'
  },
  {
    _id: 'aud-4',
    createdAt: new Date('2026-10-12T09:05:00Z'),
    action: 'System Initialized',
    actor: 'Admin Sandugo',
    actorRole: 'System Admin',
    targetName: 'Network Root',
    targetRole: 'System Admin',
    branch: 'PRC National Headquarters',
    details: 'Master registry and access controls initialized'
  }
];

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

async function getAuditEvents() {
  if (!isDbConnected()) return auditEvents;
  return AdminAudit.find().sort({ createdAt: -1 }).lean();
}

async function recordAudit(event) {
  const auditEvent = { _id: `aud-${Date.now()}-${crypto.randomInt(1000, 10000)}`, createdAt: new Date(), ...event };
  auditEvents.unshift(auditEvent);
  if (isDbConnected()) {
    const { action, actor, actorRole, targetName, targetRole, branch, details } = event;
    await AdminAudit.create({ action, actor, actorRole, targetName, targetRole, branch, details });
  }
}

// GET /api/admin/summary
router.get('/summary', async (req, res, next) => {
  try {
    const registryUsers = await getRegistryUsers(req.admin.email, false);
    const registryAuditEvents = await getAuditEvents();
    const hospitalSupervisors = registryUsers.filter((u) => u.role === 'Hospital Supervisor').length;
    const bsfSupervisors = registryUsers.filter((u) => u.role === 'BSF Supervisor').length;
    const supervisors = hospitalSupervisors + bsfSupervisors;
    const hospitalStaff = registryUsers.filter((u) => u.role === 'Hospital Staff').length;
    const bsfStaff = registryUsers.filter((u) => u.role === 'BSF Staff').length;
    const donors = registryUsers.filter((u) => u.role === 'Donor').length;
    const totalUsers = registryUsers.length;
    const auditCount = registryAuditEvents.length;
    const systemAdmins = registryUsers.filter((u) => u.role === 'System Admin').length;
    const bsfAdmins = registryUsers.filter((u) => u.role === 'BSF Admin').length;
    const prcAdmins = registryUsers.filter((u) => u.role === 'PRC Admin').length;

    res.json({
      supervisors,
      hospitalSupervisors,
      bsfSupervisors,
      donors,
      hospitalStaff,
      bsfStaff,
      totalUsers,
      auditCount,
      systemAdmins,
      bsfAdmins,
      prcAdmins,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    res.json({
      users: await getRegistryUsers(req.admin.email, req.admin.canManageAccounts),
      canManageAccounts: req.admin.canManageAccounts,
      isPrimaryAdmin: req.admin.isPrimaryAdmin,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/facilities', (_req, res) => {
  res.json({
    facilities: facilities.map(({ id, name, type }) => ({ id, name, type })),
  });
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

router.patch('/users/:id/primary-admin', async (req, res, next) => {
  if (!req.admin.isPrimaryAdmin) return res.status(403).json({ error: 'Only the primary System Admin can transfer primary-admin authority.' });
  try {
    const id = req.params.id;
    const authRoutes = isDbConnected() ? null : require('./adminAuth.cjs');
    let target;
    if (isDbConnected()) {
      if (!id.startsWith('staff:')) return res.status(404).json({ error: 'System Admin account not found.' });
      target = await Staff.findById(id.slice('staff:'.length));
      const oldPrimary = await Staff.findOne({ email: req.admin.email, isPrimaryAdmin: true });
      if (!target || target.role !== 'System Admin' || target.isActive === false) return res.status(404).json({ error: 'Choose an active System Admin account.' });
      if (!oldPrimary) return res.status(409).json({ error: 'Primary-admin authority has already changed. Sign in again.' });
      if (String(target._id) === String(oldPrimary._id)) return res.status(409).json({ error: 'This account is already the primary System Admin.' });
      const demoted = await Staff.updateOne({ _id: oldPrimary._id, isPrimaryAdmin: true }, { $set: { isPrimaryAdmin: false, canManageAccounts: false } });
      if (demoted.matchedCount !== 1) return res.status(409).json({ error: 'Primary-admin authority changed in another request. Refresh and try again.' });
      try {
        const promoted = await Staff.updateOne({ _id: target._id, role: 'System Admin', isActive: { $ne: false } }, { $set: { isPrimaryAdmin: true, canManageAccounts: true } });
        if (promoted.matchedCount !== 1) throw new Error('The selected administrator could not be promoted.');
      } catch (error) {
        await Staff.updateOne({ _id: oldPrimary._id }, { $set: { isPrimaryAdmin: true, canManageAccounts: true } });
        throw error;
      }
    } else {
      const user = users.find((entry) => entry.id === id && entry.role === 'System Admin' && entry.status === 'Active');
      const oldAccount = authRoutes.inMemoryStaff.find((entry) => entry.email === req.admin.email && entry.isPrimaryAdmin);
      if (!user) return res.status(404).json({ error: 'Choose an active System Admin account.' });
      if (!oldAccount) return res.status(409).json({ error: 'Primary-admin authority has already changed. Sign in again.' });
      if (oldAccount.email === user.email) return res.status(409).json({ error: 'This account is already the primary System Admin.' });
      oldAccount.isPrimaryAdmin = false;
      oldAccount.canManageAccounts = false;
      target = authRoutes.inMemoryStaff.find((entry) => entry.email === user.email);
      if (target) { target.isPrimaryAdmin = true; target.canManageAccounts = true; }
      user.isPrimaryAdmin = true;
      user.canManageAccounts = true;
    }
    await recordAudit({ action: 'Primary Admin Transferred', actor: req.admin.name, actorRole: 'System Admin', targetName: `${target.firstName || ''} ${target.lastName || ''}`.trim() || target.email, targetRole: 'System Admin', branch: target.branch || '', details: `Primary-admin authority transferred to ${target.email}.` });
    res.json({ success: true, message: `Primary-admin authority transferred to ${target.email}.` });
  } catch (err) { next(err); }
});

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
router.post('/supervisors', async (req, res, next) => {
  if (!req.admin.canManageAccounts) return res.status(403).json({ error: 'The primary System Admin must authorize you before you can create accounts.' });
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const mobile = String(req.body.mobile || '').trim();
  const requestedStaffId = String(req.body.staffId || '').trim();
  const allowedRoles = ['System Admin', 'BSF Admin', 'PRC Admin'];
  const role = allowedRoles.includes(req.body.role) ? req.body.role : 'PRC Admin';
  const branch = String(req.body.branch || '').trim();

  if (!name || !email) {
    return res.status(400).json({ error: 'Account name and email are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid supervisor email address.' });
  }
  const facilityType = role === 'BSF Admin' ? 'Participating_BSF' : 'PRC';
  if (role !== 'System Admin' && !facilities.some((facility) => facility.name === branch && facility.type === facilityType)) {
    return res.status(400).json({ error: `Choose a ${role === 'BSF Admin' ? 'BSF' : 'PRC'} facility from the current facilities list.` });
  }

  try {
    const authRoutes = isDbConnected() ? null : require('./adminAuth.cjs');
    const duplicate = isDbConnected()
      ? await Promise.all([Staff.exists({ email }), Donor.exists({ email })]).then((results) => results.some(Boolean))
      : users.some((user) => user.email.toLowerCase() === email)
        || authRoutes.inMemoryStaff.some((account) => account.email.toLowerCase() === email)
        || authRoutes.inMemoryDonors.some((account) => account.email.toLowerCase() === email);
    if (duplicate) {
      return res.status(409).json({ error: 'An account with this email already exists in the registry.' });
    }

    let staffId = '';
    if (role !== 'System Admin') {
      staffId = requestedStaffId;
      const staffIdExists = async (value) => isDbConnected()
        ? Staff.exists({ staffId: value })
        : users.some((user) => user.staffId === value)
          || authRoutes.inMemoryStaff.some((account) => account.staffId === value);
      if (staffId && await staffIdExists(staffId)) {
        return res.status(409).json({ error: 'That Staff ID is already assigned. Enter a different ID.' });
      }
      if (!staffId) {
        do {
          staffId = `STF-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
        } while (await staffIdExists(staffId));
      }
    }
    const generatedPassword = crypto.randomBytes(18).toString('base64url');
    const [firstName, ...lastNameParts] = name.split(/\s+/);
    let newSupervisor;

    if (isDbConnected()) {
      const staff = new Staff({
        firstName,
        lastName: lastNameParts.join(' ') || firstName,
        email,
        mobile,
        staffId,
        role,
        branch,
        createdByName: req.admin.name,
        createdByEmail: req.admin.email,
        canManageAccounts: false,
        isPrimaryAdmin: false,
        requirePasswordChange: true,
        isActive: true,
        password: bcrypt.hashSync(generatedPassword, 10),
      });
      await staff.save();
      newSupervisor = formatStaffUser(staff.toObject());
      newSupervisor.staffId = staffId;
    } else {
      newSupervisor = {
        id: `u-${crypto.randomUUID()}`,
        staffId,
        name,
        email,
        mobile,
        role,
        branch,
        createdByName: req.admin.name,
        createdByEmail: req.admin.email,
        canManageAccounts: false,
        isPrimaryAdmin: false,
        status: 'Active',
        requirePasswordChange: true,
        isActive: true,
        createdAt: new Date(),
      };
      users.unshift(newSupervisor);

      authRoutes.inMemoryStaff.push({
        _id: newSupervisor.id,
        staffId,
        email,
        firstName,
        lastName: lastNameParts.join(' ') || firstName,
        role,
        branch,
        createdByName: req.admin.name,
        createdByEmail: req.admin.email,
        canManageAccounts: false,
        isPrimaryAdmin: false,
        requirePasswordChange: true,
        isActive: true,
        passwordHash: bcrypt.hashSync(generatedPassword, 10),
      });
    }

    try {
      await recordAudit({
        action: 'Account Provisioned',
        actor: req.admin.name,
        actorRole: 'System Admin',
        targetName: name,
        targetRole: role,
        branch,
        details: `Account created with a generated temporary password${staffId ? ` (Staff ID: ${staffId})` : ''}${role === 'System Admin' ? ' (account-management access requires authorization)' : ''}`,
      });
    } catch (auditError) {
      console.error('Could not record supervisor provision audit event:', auditError);
    }

    res.status(201).json({
      success: true,
      message: `${role} account created. Share the generated password securely.`,
      staffId: staffId || undefined,
      generatedPassword,
      supervisor: newSupervisor,
    });
  } catch (err) {
    next(err);
  }
});

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
