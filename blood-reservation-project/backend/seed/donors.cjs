const { Types } = require('mongoose');
const BloodUnits = require('../../db/models/bloodUnits.cjs');

const bloodTypes = BloodUnits.schema.path('bloodType').enumValues;

function makeDonors(password, year) {
    return bloodTypes.map((bloodType, index) => ({
        _id: new Types.ObjectId(`5eedd000000000000000000${index + 1}`),
        donorID: `SEED-DONOR-${index + 1}`,
        firstName: ['Amihan', 'Bayani', 'Dalisay', 'Habagat', 'Hiraya', 'Liyag', 'Mayumi', 'Sinta'][index],
        lastName: 'Demo',
        birthDate: new Date(Date.UTC(1996, 0, 1)),
        age: year - 1996,
        civilStatus: 'Single',
        sex: index % 2 ? 'Male' : 'Female',
        bloodType,
        houseNumber: '1',
        street: 'Demo Street',
        barangay: 'Demo Barangay',
        municipality: 'Quezon City',
        nationality: 'Filipino',
        education: 'College',
        email: `donor-${index + 1}@sandugo.example`,
        notificationPreferences: { sms: false, email: false },
        password,
    }));
}

module.exports = makeDonors;
