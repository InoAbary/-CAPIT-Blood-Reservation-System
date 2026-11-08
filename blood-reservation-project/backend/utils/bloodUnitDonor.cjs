const mongoose = require('mongoose');
const Donor = require('../../db/models/donor.cjs');

function normalizeDonorReference(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function validateDonorReference(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') return 'Choose a valid donor.';
    const id = normalizeDonorReference(value);
    if (!id) return null;
    if (!mongoose.isObjectIdOrHexString(id)) return 'Choose a valid donor.';
    if (!await Donor.exists({ _id: id })) return 'The selected donor no longer exists.';
    return null;
}

module.exports = { normalizeDonorReference, validateDonorReference };
