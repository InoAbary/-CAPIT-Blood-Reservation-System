require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const Staff = require('../../db/models/staff.cjs');
const { sendEmail, mailTemplate } = require('../utils/forgotPasswordEmail.cjs');

const router = express.Router();
const TTL_MS = 15 * 60 * 1000;
const GENERIC_MESSAGE = 'If an active staff account exists for this email, you will receive a password reset link. Check your inbox and spam folder.';
const INVALID_MESSAGE = 'This reset link is invalid, expired, or already used. Please request another.';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const limit = (max) => rateLimit({
  windowMs: TTL_MS,
  limit: max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' }
});

// Public: POST /api/staff-recovery/forgotpassword
router.post('/forgotpassword', limit(10), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  let issued = null;
  try {
    const staff = await Staff.findOne({ email, isActive: true }).select('+password');
    if (!staff || !staff.password) return res.json({ success: true, message: GENERIC_MESSAGE });

    const frontendURL = new URL(process.env.FRONTEND_URL || 'http://localhost:5173');
    if (!['http:', 'https:'].includes(frontendURL.protocol) ||
      (process.env.NODE_ENV === 'production' && frontendURL.protocol !== 'https:')) {
      throw new Error('Invalid FRONTEND_URL for reset link');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(token);
    const updated = await Staff.findOneAndUpdate(
      { _id: staff._id, isActive: true, password: staff.password },
      { $set: { passwordReset: {
        tokenHash,
        expiresAt: new Date(Date.now() + TTL_MS),
        passwordFingerprint: sha256(staff.password)
      } } },
      { runValidators: true }
    );
    if (!updated) return res.json({ success: true, message: GENERIC_MESSAGE });
    issued = { staffId: staff._id, tokenHash };
    const link = new URL('/ResetPassword/Staff', frontendURL);
    link.searchParams.set('token', token);

    await sendEmail({
      email: staff.email,
      subject: 'Staff password reset - Blood Reservation System',
      message: mailTemplate(
        'You requested to reset your staff account password. This link is valid for 15 minutes and can be used once. If this was not you, ignore this email.',
        link.toString(), 'Reset staff password'
      ),
      text: `Reset your staff password: ${link.toString()}\nThis link expires in 15 minutes. If you did not request it, ignore this email.`
    });
    return res.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    if (issued) {
      try {
        await Staff.updateOne(
          { _id: issued.staffId, 'passwordReset.tokenHash': issued.tokenHash },
          { $unset: { passwordReset: 1 } }
        );
      } catch { console.error('Could not revoke unsent staff reset token.'); }
    }
    console.error('Staff reset email error:', error.code || error.name);
    return res.status(503).json({ success: false, message: 'Password recovery is unavailable. Please try again later.' });
  }
});

// Public: POST /api/staff-recovery/resetpassword
router.post('/resetpassword', limit(20), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ success: false, message: INVALID_MESSAGE });
  }
  if (typeof password !== 'string' || password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72 || !password.trim()) {
    return res.status(400).json({ success: false, message: 'Use 8 or more characters, at most 72 UTF-8 bytes.' });
  }
  try {
    const tokenHash = sha256(token);
    const staff = await Staff.findOne({
      isActive: true,
      'passwordReset.tokenHash': tokenHash,
      'passwordReset.expiresAt': { $gt: new Date() }
    }).select('+passwordReset +password');
    if (!staff || !staff.passwordReset ||
        staff.passwordReset.passwordFingerprint !== sha256(staff.password)) {
      return res.status(400).json({ success: false, message: INVALID_MESSAGE });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    // A single-document atomic update: works with standalone MongoDB, no transactions.
    const updated = await Staff.findOneAndUpdate(
      { _id: staff._id, isActive: true, password: staff.password,
        'passwordReset.tokenHash': tokenHash,
        'passwordReset.expiresAt': { $gt: new Date() } },
      { $set: { password: passwordHash }, $unset: { passwordReset: 1 } },
      { runValidators: true }
    );
    if (!updated) return res.status(400).json({ success: false, message: INVALID_MESSAGE });
    res.clearCookie('staffToken', {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/'
    });
    return res.json({ success: true, message: 'Your staff password was changed. Sign in with the new password.' });
  } catch (error) {
    console.error('Staff password reset error:', error.code || error.name);
    return res.status(500).json({ success: false, message: 'Could not change the password. Please try again later.' });
  }
});
module.exports = router;
