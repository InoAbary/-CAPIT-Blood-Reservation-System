const router = require('express').Router();
const Donation = require('../../db/models/donation.cjs');

router.get('/', async (req, res) => {
  try {
    const donorID = req.user.id;

    const [totalDonations, latestDonation] = await Promise.all([
      Donation.countDocuments({ donorID }),
      Donation.findOne({ donorID })
        .select('dateTime')
        .sort({ dateTime: -1 })
        .lean(),
    ]);

    const formatter = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const donatedToday = Boolean(
      latestDonation &&
      formatter.format(new Date(latestDonation.dateTime)) ===
        formatter.format(new Date())
    );

    res.json({
      totalDonations,
      donatedToday,
    });
  } catch (error) {
    console.error('Donor badges error:', error);
    res.status(500).json({
      message: 'Could not load donor badges.',
    });
  }
});

module.exports = router;