const router = require('express').Router();
const Donor = require('../../db/models/donor.cjs');
const requireDonor = require('../middleware/requireDonor.cjs');
const { PROFILE_FIELDS, validateProfile } = require('../utils/donorProfile.cjs');

router.get('/role', requireDonor, async (req, res) => {
    const { id } = req.user;
    try {
        const donor = await Donor.findById(id).select('roles');
        if (!donor) return res.status(404).json({ message: 'Donor not found' });

        return res.json({
            roles: donor.roles?.length ? donor.roles : ['donor'],
        });
    } catch (err) {
        console.error('GET /role error:', err);
        return res.status(500).json({ message: 'Failed to fetch role' });
    }
});

/* ── POST /role — update the active role ── */
router.post('/role', requireDonor, async (req, res) => {
    const { id } = req.user;
    const { roles } = req.body;
    

    const ALLOWED = ['donor', 'recipient'];
    if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ message: 'roles must be a non-empty array' });
    }
    if (!roles.every(r => ALLOWED.includes(r))) {
        return res.status(400).json({ message: 'Invalid role in roles array' });
    }
    // de-dup
    const unique = [...new Set(roles)];

    try {
        const donor = await Donor.findByIdAndUpdate(
            id,
            { roles: unique },
            { new: true, select: 'roles' }
        );
        if (!donor) return res.status(404).json({ message: 'Donor not found' });
        return res.json({ roles: donor.roles });
    } catch (err) {
        console.error('POST /role error:', err);
        return res.status(500).json({ message: 'Failed to update role' });
    }
});

router.patch('/profile', requireDonor, async (req, res) => {
    const { errors, values } = validateProfile(req.body);
    if (Object.keys(errors).length) {
        return res.status(400).json({ message: 'Please check the highlighted fields.', errors });
    }
    try {
        const update = { $set: values };
        if (values.sex === '') {
            delete values.sex;
            update.$unset = { sex: 1 };
        }
        const user = await Donor.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true })
            .select([...PROFILE_FIELDS, 'age', 'donorID', 'role'].join(' '));
        if (!user) return res.status(404).json({ message: 'Donor account not found.' });
        return res.json({ user });
    } catch (error) {
        if (error.name === 'ValidationError') return res.status(400).json({ message: 'Please check your profile information.' });
        return res.status(500).json({ message: 'Could not save your profile. Please try again.' });
    }
});

module.exports = router;
