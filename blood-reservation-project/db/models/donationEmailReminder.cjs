const mongoose = require('mongoose');
const SmsReminder = require('./donationReminder.cjs');

// Separate collection preserves existing SMS claims without an index migration.
module.exports = mongoose.model('DonationEmailReminders', SmsReminder.schema.clone());
