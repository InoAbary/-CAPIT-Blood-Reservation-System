const router = require('express').Router();
const Donation = require('../../db/models/donation.cjs');

router.get('/', async (req, res) => {
  try {
    const donorID = req.user.id;

    const donations = await Donation.find({ donorID })
      .select('_id dateTime')
      .sort({ dateTime: -1, _id: -1 })
      .lean();

    const totalDonations = donations.length;
    const latestDonation = donations[0];

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
      donationBadges: donations.map(donation => ({
        id: String(donation._id),
        donatedAt: donation.dateTime,
      })),
    });
  } catch (error) {
    console.error('Donor badges error:', error);
    res.status(500).json({
      message: 'Could not load donor badges.',
    });
  }
});


module.exports = router;