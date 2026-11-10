const mongoose = require('mongoose');
const { PROFILE_FIELDS, validateProfile } = require('../utils/donorProfile.cjs');
const router = require('express').Router();
const Donor = require('../../db/models/donor.cjs');
const { createDonor } = require('../services/createDonor.cjs');

// Mounted behind staff authentication and the admin role guard.
router.post('/', createDonor);
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 20;
    const filter = {};
    const term = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (term) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      filter.$or = ['firstName', 'lastName', 'email', 'donorID'].map(field => ({ [field]: rx }));
    }
    if (req.query.bloodType) {
      if (!['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(req.query.bloodType)) {
        return res.status(400).json({ error: 'Invalid blood type filter.' });
      }
      filter.bloodType = req.query.bloodType;
    }
    const [donors, total] = await Promise.all([
      Donor.find(filter).select('donorID firstName middleName lastName bloodType email mobileNumber municipality province createdAt')
        .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Donor.countDocuments(filter),
    ]);
    res.json({ donors, pagination: { page, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (err) {
    console.error('admin donor directory error:', err);
    res.status(500).json({ error: 'Failed to load donors.' });
  }
});
const EDITABLE_FIELDS = [...PROFILE_FIELDS, 'email', 'mobileNumber'];
const DONOR_PROJECTION = ['donorID', ...EDITABLE_FIELDS].join(' ');

router.param('id', (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid donor ID.' });
  next();
});

router.get('/:id', async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id).select(DONOR_PROJECTION).lean();
    if (!donor) return res.status(404).json({ error: 'Donor not found.' });
    res.json({ donor });
  } catch (err) {
    console.error('admin donor read error:', err);
    res.status(500).json({ error: 'Failed to load donor.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const body = req.body;
    if (!body || Array.isArray(body) || typeof body !== 'object' || !Object.keys(body).length ||
        Object.keys(body).some(field => !EDITABLE_FIELDS.includes(field))) {
      return res.status(400).json({ error: 'Only donor profile and contact information can be updated.' });
    }
    const profile = Object.fromEntries(PROFILE_FIELDS.filter(field => Object.hasOwn(body, field)).map(field => [field, body[field]]));
    const { errors, values } = Object.keys(profile).length ? validateProfile(profile) : { errors: {}, values: {} };
    for (const field of ['email', 'mobileNumber']) {
      if (!Object.hasOwn(body, field)) continue;
      if (typeof body[field] !== 'string' || body[field].length > 300) {
        errors[field] = 'Enter a valid contact value.';
      } else {
        values[field] = body[field].trim();
      }
    }
    if (values.email) {
      values.email = values.email.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
    }
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Please check the donor details.', errors });
    if (values.email && await Donor.exists({ email: values.email, _id: { $ne: req.params.id } })) {
      return res.status(409).json({ error: 'A donor with this email already exists.', errors: { email: 'Email is already in use.' } });
    }
    const donor = await Donor.findByIdAndUpdate(req.params.id, { $set: values }, { new: true, runValidators: true })
      .select(DONOR_PROJECTION).lean();
    if (!donor) return res.status(404).json({ error: 'Donor not found.' });
    res.json({ donor });
  } catch (err) {
    console.error('admin donor update error:', err);
    if (err.name === 'ValidationError') return res.status(400).json({ error: 'Please check the donor details.' });
    res.status(500).json({ error: 'Failed to update donor.' });
  }
});
module.exports = router;
