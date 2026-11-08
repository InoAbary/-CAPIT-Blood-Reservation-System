const router = require('express').Router();
const Donor = require('../../db/models/donor.cjs');
const requireDonor = require('../middleware/requireDonor.cjs');
const { getNotificationPreferences, validNotificationPreferences } = require('../utils/notificationPreferences.cjs');

router.use(requireDonor);

router.put('/notification-preferences', async (req, res) => {
    if (!validNotificationPreferences(req.body)) {
        return res.status(400).json({ message: 'Provide SMS and email preferences as true or false.' });
    }
    try {
        const donor = await Donor.findByIdAndUpdate(req.user.id, {
            $set: { 'notificationPreferences.sms': req.body.sms, 'notificationPreferences.email': req.body.email }
        }, { new: true, runValidators: true }).select('notificationPreferences');
        if (!donor) return res.status(404).json({ message: 'Donor account not found.' });
        return res.json({ notificationPreferences: getNotificationPreferences(donor) });
    } catch {
        return res.status(500).json({ message: 'Could not save notification preferences. Please try again.' });
    }
});

module.exports = router;
