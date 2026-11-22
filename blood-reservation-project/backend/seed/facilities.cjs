const { Types } = require('mongoose');

module.exports = [
    ['QC-BSF', 'Quezon City', 'bsf', 'Blood Supply Facility', 14.6500, 121.0490],
    ['PASIG-BSF', 'Pasig', 'hospital_bsf', 'Hospital Blood Service Facility', 14.5764, 121.0851],
    ['QC-HOSP', 'Quezon City', 'hospital', 'Hospital', 14.6318, 121.0475],
    ['PASIG-HOSP', 'Pasig', 'hospital', 'Hospital', 14.5590, 121.0790],
].map(([code, city, facilityType, typeLabel, lat, lon], index) => ({
    _id: new Types.ObjectId(`5eedf000000000000000000${index + 1}`),
    facilityID: `SEED-${code}`,
    facilityName: `Demo ${city} ${typeLabel}`,
    facilityType,
    typeLabel,
    category: 'Hospital BSF',
    address: `Demo site, ${city}, Metro Manila`,
    contactNumber: 'N/A (demo facility)',
    hours: 'Monday–Friday, 8:00 AM–5:00 PM',
    lat,
    lon,
}));
