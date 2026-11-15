
const Donation = require('../../db/models/donation.cjs')

const COOLDOWN_MONTHS = 3;


async function checkDonationCooldown(donorId) {
  const lastDonation = await Donation.findOne({ donorID: donorId })
    .sort({ dateTime: -1 })
    .select('dateTime facilityID donationType')
    .lean();

  if (!lastDonation) {
    return { blocked: false };
  }

  const nextEligible = new Date(lastDonation.dateTime);
  nextEligible.setMonth(nextEligible.getMonth() + COOLDOWN_MONTHS);

  if (Date.now() < nextEligible.getTime()) {
    return {
      blocked: true,
      nextEligibleDate: nextEligible,
      lastDonation,
    };
  }
  return { blocked: false, lastDonation };
}

module.exports = { checkDonationCooldown, COOLDOWN_MONTHS };