const { getNotificationPreferences } = require('../utils/notificationPreferences.cjs');
const { sendEmail } = require('../utils/forgotPasswordEmail.cjs');
const { normalizeEmail } = require('./donationEmail.cjs');
const { normalizeMobile } = require('./semaphore.cjs');
const { readSmsConfig, sendSms } = require('./smsGate.cjs');

const reminders = [
    'Use a cold compress on the needle site for 10 to 15 minutes to help reduce bruising.',
    'For 24 hours after donating, skip heavy lifting and intense exercise. Drink extra water or juice and avoid caffeine.',
    'If you feel dizzy, lie down and raise your feet.',
];
const subject = 'Taking care of yourself after donating blood';
const text = ['Thank you for donating blood!', '', ...reminders.map(reminder => `- ${reminder}`)].join('\n');
const smsText = `Sandugo: Thanks for donating! ${reminders.join(' ')}`;

async function notifyPostDonation(donor, { env = process.env, email = sendEmail, sms = sendSms } = {}) {
    const preferences = getNotificationPreferences(donor);
    const address = normalizeEmail(donor.email);
    const mobile = normalizeMobile(donor.mobileNumber);
    const tasks = [];

    if (preferences.email && address) {
        tasks.push(Promise.resolve().then(() => email({ email: address, subject, text })));
    }
    if (env.SMSGATE_ENABLED === 'true' && preferences.sms && mobile) {
        tasks.push(Promise.resolve().then(() => sms(mobile, smsText, readSmsConfig(env))));
    }

    const results = await Promise.allSettled(tasks);
    if (results.some(result => result.status === 'rejected')) {
        throw new Error('A post-donation notification could not be sent');
    }
}

module.exports = { notifyPostDonation };
