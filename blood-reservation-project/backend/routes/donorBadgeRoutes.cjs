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



router.get('/history', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const donorID = req.user.id;
    const { before } = req.query;
    const filter = { donorID, dateTime: { $type: 'date', $lte: new Date() } };
    if (before !== undefined) {
      if (typeof before !== 'string' || !/^[a-f0-9]{24}$/i.test(before)) {
        return res.status(400).json({ error: 'Invalid donation history cursor.' });
      }
      const cursor = await Donation.findOne({ _id: before, donorID }).select('dateTime').lean();
      if (!cursor?.dateTime) return res.status(404).json({ error: 'Donation history cursor is unavailable.' });
      filter.$or = [
        { dateTime: { $lt: cursor.dateTime } },
        { dateTime: cursor.dateTime, _id: { $lt: cursor._id } },
      ];
    }
    const pageSize = 10;
    const results = await Donation.find(filter)
      .select('dateTime donationType facilityID').populate('facilityID', 'facilityName address')
      .sort({ dateTime: -1, _id: -1 }).limit(pageSize + 1).lean();
    const page = results.slice(0, pageSize);
    res.json({
      items: page.map(item => ({
        id: String(item._id), dateTime: item.dateTime, donationType: item.donationType,
        facility: item.facilityID?.facilityName, address: item.facilityID?.address,
      })),
      before: results.length > pageSize ? String(page.at(-1)._id) : null,
    });
  } catch (error) {
    console.error('Donor donation history failed:', error.message);
    res.status(500).json({ error: 'Could not load donation history.' });
  }
});

module.exports = router;