const Donor = require('../../db/models/donor.cjs');
const Counter = require('../../db/models/counters.cjs');
const { PROFILE_FIELDS, validateProfile } = require('../utils/donorProfile.cjs');

async function createDonor(req, res) {
  try {
    const body = req.body || {};
    const profile = Object.fromEntries(PROFILE_FIELDS.map(field => [field, body[field] ?? '']));
    const { errors, values } = validateProfile(profile);
    for (const field of ['email', 'mobileNumber']) {
      if (body[field] !== undefined && (typeof body[field] !== 'string' || body[field].length > 300)) {
        errors[field] = 'Enter a valid contact value.';
      }
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const mobileNumber = typeof body.mobileNumber === 'string' ? body.mobileNumber.trim() : '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (Object.keys(errors).length) {
      return res.status(400).json({ error: 'Please check the donor details.', errors });
    }
    if (email && await Donor.exists({ email })) {
      return res.status(409).json({ error: 'A donor with this email already exists. Search for the existing donor.' });
    }
    const counter = await Counter.findOneAndUpdate(
      { _id: 'donorID' }, { $inc: { sequence: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const donor = await Donor.create({
      ...values, email, mobileNumber,
      donorID: `D${String(counter.sequence).padStart(8, '0')}`,
      role: 'donor',
    });
    res.status(201).json({ donor: {
      _id: donor._id, donorID: donor.donorID, firstName: donor.firstName,
      lastName: donor.lastName, email: donor.email, bloodType: donor.bloodType,
    } });
  } catch (err) {
    console.error('staff donor creation error:', err);
    if (err.name === 'ValidationError') return res.status(400).json({ error: 'Please check the donor details.' });
    res.status(500).json({ error: 'Failed to add donor.' });
  }
}

module.exports = { createDonor };
