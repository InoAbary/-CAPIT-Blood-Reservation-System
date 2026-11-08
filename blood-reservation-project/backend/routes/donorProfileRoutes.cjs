const router = require('express').Router();
const Donor = require('../../db/models/donor.cjs');
const requireDonor = require('../middleware/requireDonor.cjs');
const { PROFILE_FIELDS, validateProfile } = require('../utils/donorProfile.cjs');

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
