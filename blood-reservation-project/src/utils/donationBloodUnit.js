const COMPONENT_BY_DONATION = {
  'Whole Blood Donation': 'Whole Blood',
  'Power Red Donation': 'Packed RBC',
  'Platelet Donation': 'Platelets',
  'Plasma Donation': 'Plasma',
};

export function donationBloodUnit(donation) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(donation.dateTime));
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    donorID: donation.donorID,
    bloodType: donation.donorID.bloodType,
    component: COMPONENT_BY_DONATION[donation.donationType] || '',
    collectionDate: `${date.year}-${date.month}-${date.day}`,
  };
}
