const express = require('express');
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const Staff = require('../../db/models/staff.cjs');

const router = express.Router();
const sessions = new Map();
const demoAdmins = [
  { _id: 'demo-admin-owner', email: 'akhishapbabani@gmail.com', firstName: 'Akhisha', lastName: 'Babani', role: 'System Admin', branch: 'PRC National Headquarters', isPrimaryAdmin: true, canManageAccounts: true, passwordHash: bcrypt.hashSync('password123', 10) },
  { _id: 'demo-admin-sandugo', email: 'admin@sandugo.gov.ph', firstName: 'Admin', lastName: 'Sandugo', role: 'System Admin', branch: 'PRC National Headquarters', isPrimaryAdmin: false, canManageAccounts: false, passwordHash: bcrypt.hashSync('password123', 10) },
];

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function isAdminRole(role) {
  return role === 'System Admin' || role === 'admin';
}

async function requireAdminSession(req, res, next) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) sessions.delete(token);
    return res.status(401).json({ error: 'Sign in as an administrator to continue.' });
  }
  try {
    const account = isDbConnected()
      ? await Staff.findOne({ email: session.email }).select('firstName lastName email role branch isActive canManageAccounts isPrimaryAdmin').lean()
      : demoAdmins.find((entry) => entry.email === session.email);
    if (!account || !isAdminRole(account.role) || account.isActive === false) {
      sessions.delete(token);
      return res.status(403).json({ error: 'This administrator account is not active.' });
    }
    req.admin = {
      email: account.email.toLowerCase(),
      name: `${account.firstName || ''} ${account.lastName || ''}`.trim() || account.email,
      canManageAccounts: account.canManageAccounts === true,
      isPrimaryAdmin: account.isPrimaryAdmin === true,
    };
    next();
  } catch (error) {
    next(error);
  }
}

router.post('/login/staff', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  try {
    let account;
    let passwordMatches = false;
    if (isDbConnected()) {
      account = await Staff.findOne({ email });
      passwordMatches = Boolean(account && await bcrypt.compare(password, account.password));
    } else {
      account = demoAdmins.find((entry) => entry.email === email);
      passwordMatches = Boolean(account && bcrypt.compareSync(password, account.passwordHash));
    }
    if (!account || !passwordMatches || !isAdminRole(account.role) || account.isActive === false) {
      return res.status(401).json({ error: 'Invalid administrator email or password.' });
    }
    const accessToken = crypto.randomBytes(32).toString('base64url');
    sessions.set(accessToken, { email, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    return res.json({
      success: true,
      accessToken,
      acc: {
        _id: account._id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role === 'admin' ? 'System Admin' : account.role,
        branch: account.branch || '',
        canManageAccounts: account.canManageAccounts === true,
        isPrimaryAdmin: account.isPrimaryAdmin === true,
      },
    });
  } catch (error) {
    console.error('Admin login failed:', error.message);
    return res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

router.post('/logout', (req, res) => {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  sessions.delete(token);
  res.json({ success: true });
});

module.exports = router;
module.exports.requireAdminSession = requireAdminSession;
module.exports.demoAdmins = demoAdmins;
module.exports.inMemoryStaff = demoAdmins;
module.exports.inMemoryDonors = [];
