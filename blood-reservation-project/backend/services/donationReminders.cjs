const Donation = require('../../db/models/donation.cjs');
const Donor = require('../../db/models/donor.cjs');
const Reminder = require('../../db/models/donationReminder.cjs');
const EmailReminder = require('../../db/models/donationEmailReminder.cjs');
const { normalizeEmail, sendEligibilityEmail } = require('./donationEmail.cjs');
const { normalizeMobile, sendEligibilitySms } = require('./semaphore.cjs');
const { getNotificationPreferences } = require('../utils/notificationPreferences.cjs');

const DAY = 86400000;
const TYPES = {
    'Whole Blood Donation': 'DONATION_WAIT_WHOLE_BLOOD_DAYS',
    'Power Red Donation': 'DONATION_WAIT_POWER_RED_DAYS',
    'Platelet Donation': 'DONATION_WAIT_PLATELET_DAYS',
    'Plasma Donation': 'DONATION_WAIT_PLASMA_DAYS'
};

function readConfig(env = process.env) {
    const waitingDays = {};
    for (const [type, key] of Object.entries(TYPES)) {
        const days = Number(env[key]);
        if (!Number.isSafeInteger(days) || days <= 0 || days > 3650) {
            throw new Error(`Set ${key} to the facility-approved waiting period in days (1–3650)`);
        }
        waitingDays[type] = days;
    }
    const intervalMinutes = Number(env.DONATION_REMINDER_INTERVAL_MINUTES || 60);
    if (!Number.isSafeInteger(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 1440) {
        throw new Error('DONATION_REMINDER_INTERVAL_MINUTES must be between 1 and 1440');
    }
    const smsEnabled = env.DONATION_SMS_REMINDERS_ENABLED !== 'false';
    const emailEnabled = env.DONATION_EMAIL_REMINDERS_ENABLED === 'true';
    if (!smsEnabled && !emailEnabled) throw new Error('Enable at least one donation reminder channel');
    if (smsEnabled && !env.SEMAPHORE_API_KEY?.trim()) throw new Error('SEMAPHORE_API_KEY is required');
    if (emailEnabled && (!env.EMAIL_ID?.trim() || !env.EMAIL_PASSWORD?.trim())) {
        throw new Error('EMAIL_ID and EMAIL_PASSWORD are required for email reminders');
    }
    return { waitingDays, smsEnabled, emailEnabled, intervalMs: intervalMinutes * 60000,
        apiKey: env.SEMAPHORE_API_KEY?.trim(), senderName: env.SEMAPHORE_SENDER_NAME?.trim() };
}

function eligibleAt(donation, waitingDays) {
    const days = waitingDays[donation.donationType];
    const date = new Date(donation.dateTime).getTime();
    if (!days || !Number.isFinite(date) || donation.dateTime == null) return null;
    return new Date(date + days * DAY);
}

async function runReminderCheck(config, { now = new Date(), send = sendEligibilitySms, sendEmail = sendEligibilityEmail } = {}) {
    // Include future records in the grouping so an older donation cannot trigger a reminder.
    const cursor = Donation.aggregate([
        { $sort: { donorID: 1, dateTime: -1, _id: -1 } },
        { $group: { _id: '$donorID', donation: { $first: '$$ROOT' } } }
    ]).cursor({ batchSize: 100 });
    for await (const { donation } of cursor) {
        const due = eligibleAt(donation, config.waitingDays);
        if (!due || due > now) continue;
        const donor = await Donor.findById(donation.donorID).select('mobileNumber email firstName notificationPreferences').lean();
        if (!donor) continue;
        const preferences = getNotificationPreferences(donor);
        const channels = [];
        const number = normalizeMobile(donor.mobileNumber);
        const email = normalizeEmail(donor.email);
        if (config.smsEnabled !== false && preferences.sms && number) {
            channels.push({ name: 'sms', model: Reminder, recipient: number, deliver: send });
        }
        if (config.emailEnabled && preferences.email && email) {
            channels.push({ name: 'email', model: EmailReminder, recipient: email, deliver: sendEmail });
        }
        for (const { name, model, recipient, deliver } of channels) {
            // Check again for each channel: a donation may be recorded during the other send.
            const latest = await Donation.findOne({ donorID: donation.donorID })
                .sort({ dateTime: -1, _id: -1 }).select('_id').lean();
            if (String(latest?._id) !== String(donation._id)) break;
            // Respect opt-outs saved since the donor was first loaded for this check.
            const freshDonor = await Donor.findById(donation.donorID).select('notificationPreferences').lean();
            if (!freshDonor || !getNotificationPreferences(freshDonor)[name]) continue;
            let reminder;
            try {
                // Independent persistent claims allow either channel to succeed on its own.
                reminder = await model.create({ donationID: donation._id, donorID: donation.donorID,
                    eligibleAt: due, status: 'sending' });
            } catch (error) {
                if (error.code === 11000) continue;
                throw error;
            }
            try {
                const current = await Donation.findOne({ donorID: donation.donorID })
                    .sort({ dateTime: -1, _id: -1 }).select('_id').lean();
                if (String(current?._id) !== String(donation._id)) {
                    await model.updateOne({ _id: reminder._id }, { $set: { status: 'cancelled' } });
                    continue;
                }
                const result = await deliver(recipient, {
                    ...config, firstName: donor.firstName, lastDonationDate: donation.dateTime
                });
                await model.updateOne({ _id: reminder._id }, { $set: {
                    status: 'accepted', ...result, acceptedAt: new Date()
                } });
            } catch {
                await model.updateOne({ _id: reminder._id }, { $set: { status: 'review' } });
                console.error(`Donation ${name} reminder ${reminder._id} requires review; automatic retry suppressed`);
            }
            // Stay below Semaphore's 120 requests/minute limit.
            if (name === 'sms') await new Promise(resolve => setTimeout(resolve, 600));
        }
    }
}

async function startDonationReminders(env = process.env) {
    if (env.DONATION_REMINDERS_ENABLED !== 'true') return;
    const config = readConfig(env);
    if (config.smsEnabled) await Reminder.init();
    if (config.emailEnabled) await EmailReminder.init();
    let running = false;
    const tick = async () => {
        if (running) return;
        running = true;
        try { await runReminderCheck(config); }
        catch { console.error('Donation reminder check failed; it will run again at the next interval'); }
        finally { running = false; }
    };
    void tick();
    const timer = setInterval(tick, config.intervalMs);
    timer.unref();
    console.log('Donation reminders enabled:', [config.smsEnabled && 'SMS', config.emailEnabled && 'email'].filter(Boolean).join(', '));
    return () => clearInterval(timer);
}

module.exports = { readConfig, eligibleAt, runReminderCheck, startDonationReminders };
