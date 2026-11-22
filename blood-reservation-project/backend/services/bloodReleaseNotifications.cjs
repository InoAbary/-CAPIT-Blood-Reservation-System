const Donor = require('../../db/models/donor.cjs');
const { getNotificationPreferences } = require('../utils/notificationPreferences.cjs');
const { sendEmail } = require('../utils/forgotPasswordEmail.cjs');
const { normalizeEmail } = require('./donationEmail.cjs');
const { normalizeMobile } = require('./semaphore.cjs');
const { readSmsConfig, sendSms } = require('./smsGate.cjs');

const SMS_MESSAGE = 'Thank you for donating, you have just saved a life';
const EMAIL_SUBJECT = 'Your blood donation was released';
const EMAIL_HEADING = 'Thank you for giving blood';
const EMAIL_UPDATE = 'A unit from your blood donation has been released for patient care.';
const EMAIL_THANK_YOU = 'Your generosity helps make blood available when someone needs it. Thank you for taking the time to donate.';
const EMAIL_TEXT = [EMAIL_HEADING, EMAIL_UPDATE, EMAIL_THANK_YOU].join('\n\n');
const EMAIL_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${EMAIL_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background-color:#fbf3f4;font-family:Arial,Helvetica,sans-serif;color:#332329;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#fbf3f4">
<tr>
<td align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="560" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
<tr>
<td bgcolor="#851c35" style="padding:30px 24px;background-color:#851c35;border-radius:14px 14px 0 0;">
<h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.25;">${EMAIL_HEADING}</h1>
</td>
</tr>
<tr>
<td bgcolor="#ffffff" style="padding:26px 24px;background-color:#ffffff;border:1px solid #eedde1;border-top:0;border-radius:0 0 14px 14px;">
<p style="margin:0 0 18px;padding:14px 16px;border-left:4px solid #aa2947;background-color:#fcf0f2;color:#692137;font-size:16px;font-weight:bold;line-height:1.5;">${EMAIL_UPDATE}</p>
<p style="margin:0;font-size:16px;line-height:1.6;">${EMAIL_THANK_YOU}</p>
</td>
</tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td>
</tr>
</table>
</body>
</html>`;

async function notifyBloodRelease(donorID, {
    env = process.env,
    findDonor = id => Donor.findById(id).select('email mobileNumber notificationPreferences').lean(),
                                  sms = sendSms,
                                  email = sendEmail,
} = {}) {
    if (!donorID) return;
    const donor = await findDonor(donorID);
    if (!donor) return;

    const preferences = getNotificationPreferences(donor);
    const address = normalizeEmail(donor.email);
    const mobile = normalizeMobile(donor.mobileNumber);
    const tasks = [];

    if (preferences.email && address) {
        tasks.push(Promise.resolve().then(() => email({
            email: address,
            subject: EMAIL_SUBJECT,
            message: EMAIL_HTML,
            text: EMAIL_TEXT,
        })));
    }
    if (env.SMSGATE_ENABLED === 'true' && preferences.sms && mobile) {
        tasks.push(Promise.resolve().then(() => sms(mobile, SMS_MESSAGE, readSmsConfig(env))));
    }

    const results = await Promise.allSettled(tasks);
    if (results.some(result => result.status === 'rejected')) {
        throw new Error('A blood release notification could not be sent');
    }
}

module.exports = { notifyBloodRelease };
