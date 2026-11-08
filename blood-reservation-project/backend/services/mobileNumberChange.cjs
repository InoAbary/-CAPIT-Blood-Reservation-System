const crypto = require('node:crypto');
const Donor = require('../../db/models/donor.cjs');
const { normalizeMobile } = require('./semaphore.cjs');
const { sendEmail, mailTemplate } = require('../utils/forgotPasswordEmail.cjs');

const TTL = 15 * 60 * 1000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const invalid = () => Object.assign(new Error('This verification link is invalid or has expired. Request a new link from Change mobile number.'), { status: 400 });
const fail = (status, message) => Object.assign(new Error(message), { status });

function createMobileNumberChangeService({ mailer = sendEmail, env = process.env, now = () => new Date() } = {}) {
    async function request(donorID, input) {
        const number = typeof input === 'string' && input.length <= 40 ? normalizeMobile(input) : null;
        if (!number) throw fail(400, 'Enter a valid Philippine mobile number, such as 09171234567.');
        const donor = await Donor.findById(donorID).select('email mobileNumber password role');
        if (!donor || donor.role !== 'donor') throw fail(404, 'Donor account not found.');
        if (number === normalizeMobile(donor.mobileNumber)) throw fail(400, 'Enter a different mobile number.');
        const origin = new URL(env.FRONTEND_URL || 'http://localhost:5173');
        if (!['http:', 'https:'].includes(origin.protocol) || (env.NODE_ENV === 'production' && origin.protocol !== 'https:')) {
            throw new Error('Invalid frontend URL configuration');
        }
        const time = now();
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = hash(token);
        const pending = { tokenHash, newNumber: number, previousNumber: donor.mobileNumber || '',
            email: donor.email, passwordFingerprint: hash(donor.password), requestedAt: time,
            expiresAt: new Date(time.getTime() + TTL) };
        // One outstanding link; a persisted cooldown also covers simultaneous requests and server instances.
        const updated = await Donor.findOneAndUpdate({
            _id: donor._id, role: 'donor', email: donor.email, password: donor.password,
            mobileNumber: donor.mobileNumber ?? null,
            $or: [{ 'mobileNumberChange.requestedAt': { $exists: false } },
                { 'mobileNumberChange.requestedAt': { $lte: new Date(time.getTime() - 60000) } }]
        }, { $set: { mobileNumberChange: pending } }, { runValidators: true });
        if (!updated) throw fail(429, 'Please wait one minute before requesting another verification email.');
        const link = new URL('/donor/change-number/confirm', origin);
        // Fragment keeps the secret out of HTTP URL logs and referrer headers.
        link.hash = new URLSearchParams({ token }).toString();
        try {
            const content = `Confirm the change of your mobile number to +${number}. Your current number will stay in use until you confirm. This link expires in 15 minutes; only your latest link works. If you did not request this, ignore this email.`;
            await mailer({ email: donor.email, subject: 'CAPIT: Confirm your mobile number change',
                message: mailTemplate(content, link.toString(), 'Confirm mobile number', 'Confirm your mobile number change'),
                text: `${content}\n\nConfirm your mobile number: ${link.toString()}` });
        } catch {
            // A failed earlier attempt must never remove a newer request.
            await Donor.updateOne({ _id: donor._id, 'mobileNumberChange.tokenHash': tokenHash },
                { $unset: { mobileNumberChange: 1 } });
            throw fail(503, 'The verification email could not be sent. Please try again later.');
        }
        return { success: true, message: 'Verification email sent to your registered email. Check your inbox and spam folder. Your mobile number has not changed yet.' };
    }

    async function confirm(token) {
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw invalid();
        const tokenHash = hash(token);
        const donor = await Donor.findOne({ role: 'donor', 'mobileNumberChange.tokenHash': tokenHash,
            'mobileNumberChange.expiresAt': { $gt: now() } }).select('+mobileNumberChange email mobileNumber password');
        const pending = donor?.mobileNumberChange;
        if (!pending || pending.email !== donor.email || pending.passwordFingerprint !== hash(donor.password)
            || pending.previousNumber !== (donor.mobileNumber || '') || !normalizeMobile(pending.newNumber)) throw invalid();
        // Change the number and consume its token atomically, so replay/concurrent confirmation cannot succeed.
        const changed = await Donor.findOneAndUpdate({
            _id: donor._id, role: 'donor', email: donor.email, password: donor.password,
            mobileNumber: donor.mobileNumber ?? null, 'mobileNumberChange.tokenHash': tokenHash,
            'mobileNumberChange.expiresAt': { $gt: now() }
        }, { $set: { mobileNumber: pending.newNumber }, $unset: { mobileNumberChange: 1 } }, { runValidators: true });
        if (!changed) throw invalid();
        return { success: true, message: 'Your mobile number has been updated. Future SMS reminders will use your new number.' };
    }
    return { request, confirm };
}

module.exports = { createMobileNumberChangeService };
