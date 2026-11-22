const { Types } = require('mongoose');

function makeStaff(facilities, password) {
    const staff = facilities.flatMap(facility => {
        const code = facility.facilityID.toLowerCase().replace(/^seed-/, '');
        const facilityRole = facility.facilityType === 'hospital' ? 'hospital' : 'branch-admin';

        return ['staff', facilityRole].map(role => ({
            facilityID: facility._id,
            branch: facility.facilityName,
            firstName: { staff: 'Staff', hospital: 'Hospital', 'branch-admin': 'Branch Admin' }[role],
            lastName: 'Demo',
            email: `${code}-${role}@sandugo.example`,
            role,
        }));
    });
    staff.push({
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@sandugo.example',
        role: 'admin',
        canManageAccounts: true,
    });
    return staff.map((account, index) => ({
        ...account,
        _id: new Types.ObjectId(`5eeda000000000000000000${index + 1}`),
        staffId: `SEED-STAFF-${index + 1}`,
        password,
    }));
}

module.exports = makeStaff;
