const Donor = require('../../db/models/donor.cjs');
const { getNotificationPreferences } = require('../utils/notificationPreferences.cjs');
const { normalizeMobile } = require('./semaphore.cjs');
const { normalizeEmail } = require('./donationEmail.cjs');
const { readSmsConfig, sendSms } = require('./smsGate.cjs');
const { sendAppointmentEmail } = require('../utils/appointSchedEmail.cjs');

// Called only after a successful creation or atomic pending -> approved transition.
// Channel failures must never undo a booking or trigger automatic duplicate sends.
async function notifyAppointment(appointment, event, {
    env = process.env, findDonor = id => Donor.findById(id).lean(),
    sms = sendSms, email = sendAppointmentEmail,
} = {}) {
    const donor = await findDonor(appointment.donor?._id || appointment.donor);
    if (!donor) return;
    const preferences = getNotificationPreferences(donor);
    const date = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long' }).format(new Date(appointment.date));
    const venue = appointment.venue?.facilityName || 'your chosen facility';
    const text = `Hi ${donor.firstName || 'Donor'}! Your blood donation appointment at ${venue} on ${date} ${event === 'booked' ? 'has been requested and is awaiting staff approval' : 'has been approved'}. Check your appointments in Sandugo for details.`;
    const tasks = [];
    if (env.SMSGATE_ENABLED === 'true' && preferences.sms && normalizeMobile(donor.mobileNumber)) {
        tasks.push(Promise.resolve().then(() => sms(donor.mobileNumber, text, readSmsConfig(env))));
    }
    // Approval retains its existing detailed email and calendar invite in the route.
    if (event === 'booked' && preferences.email && normalizeEmail(donor.email)) {
        tasks.push(Promise.resolve().then(() => email({ email: donor.email, subject: 'Your donation appointment request was received', text })));
    }
    const results = await Promise.allSettled(tasks);
    if (results.some(result => result.status === 'rejected')) {
        console.error(`Appointment ${appointment._id}: notification failed; check provider logs before retrying`);
    }
}

module.exports = { notifyAppointment };
