
const PROFILE_FIELDS = [
    'firstName', 'middleName', 'lastName', 'birthDate', 'civilStatus', 'sex', 'bloodType',
    'houseNumber', 'street', 'barangay', 'municipality', 'province', 'zipCode',
    'officeAddress', 'nationality', 'religion', 'education', 'occupation',
    'telephoneNumber', 'schoolID', 'companyID', 'prcID',
    'driverID', 'govID', 'otherID'
];
const REQUIRED = new Set(['firstName', 'lastName', 'birthDate', 'civilStatus', 'bloodType',
    'houseNumber', 'street', 'barangay', 'nationality', 'education']);

function validateProfile(body, now = new Date()) {
    const errors = {};
    const values = {};
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) {
        return { errors: { form: 'Provide the information you want to update.' }, values };
    }
    if (Object.keys(body).some(key => !PROFILE_FIELDS.includes(key))) {
        errors.form = 'Only personal, contact, address and identification information can be updated here.';
    }
    for (const field of PROFILE_FIELDS) {
        if (!Object.hasOwn(body, field)) continue;
        if (typeof body[field] !== 'string') {
            errors[field] = 'Enter a text value.';
            continue;
        }
        const value = body[field].trim();
        if (REQUIRED.has(field) && !value) errors[field] = 'This field is required.';
        if (value.length > 300) errors[field] = 'This value is too long.';
        values[field] = value;
    }
    if (values.bloodType && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(values.bloodType)) {
        errors.bloodType = 'Select a valid blood type.';
    }
    if (values.sex && !['Male', 'Female'].includes(values.sex)) errors.sex = 'Select a valid sex.';
    if (values.birthDate) {
        const birth = new Date(`${values.birthDate}T00:00:00.000Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate) || !Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== values.birthDate) {
            errors.birthDate = 'Enter a valid birth date.';
        } else {
            const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
            const [year, month, day] = today.split('-').map(Number);
            let age = year - birth.getUTCFullYear();
            if (month < birth.getUTCMonth() + 1 || (month === birth.getUTCMonth() + 1 && day < birth.getUTCDate())) age--;
            if (age < 16 || age > 65) errors.birthDate = 'Your birth date must meet the account age range of 16–65.';
            values.age = age;
            values.birthDate = birth;
        }
    }
    return { errors, values };
}

module.exports = { PROFILE_FIELDS, validateProfile };
