const { sendEmail } = require('../utils/forgotPasswordEmail.cjs');

function normalizeEmail(value) {
    const email = String(value || '').trim();
    // Accept one bare mailbox only, never address lists or header delimiters.
    if (email.length > 254 || !/^[^\s<>(),;:"\\@]+@[^\s<>(),;:"\\@]+\.[^\s<>(),;:"\\@]+$/.test(email)) return null;
    return email;
}

// Email-compatible HTML: table layout, inline CSS and no external images or fonts.
function eligibilityEmailHTML() {
    return `<!doctype html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Thank you for being a blood donor</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#252535;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">Your donation waiting period has passed. You can return for donor screening.</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f7;">
    <tr><td align="center" style="padding:36px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;background-color:#ffffff;border:1px solid #ece8eb;border-radius:18px;overflow:hidden;">
    <tr><td style="background-color:#9e233c;padding:24px 36px;text-align:left;">
    <span style="display:inline-block;vertical-align:middle;width:36px;height:36px;line-height:36px;text-align:center;background-color:#ffffff;border-radius:10px;font-size:25px;font-weight:bold;color:#9e233c;">+</span>
    <span style="display:inline-block;vertical-align:middle;margin-left:10px;color:#ffffff;font-size:12px;font-weight:bold;letter-spacing:1.5px;">CAPIT &nbsp; BLOOD RESERVATION SYSTEM</span>
    </td></tr>
    <tr><td style="padding:38px 36px 14px;">
    <p style="margin:0 0 13px;font-size:12px;font-weight:bold;letter-spacing:1.5px;color:#b32948;">DONOR UPDATE</p>
    <h1 style="margin:0 0 18px;color:#292334;font-size:30px;line-height:1.2;font-weight:bold;">Your next opportunity<br>to give is here.</h1>
    <p style="margin:0 0 18px;color:#5e5a66;font-size:16px;line-height:1.75;">Great news! Your donation waiting period has passed, which means you can visit a blood bank for your next donor screening.</p>
    <p style="margin:0;color:#5e5a66;font-size:16px;line-height:1.75;">Thank you for your generosity and willingness to help save lives. Every donation makes a difference.</p>
    </td></tr>
    <tr><td style="padding:13px 36px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff1f4;border:1px solid #f6d8df;border-radius:12px;">
    <tr><td style="padding:22px 24px;">
    <p style="margin:0 0 7px;color:#92253c;font-size:15px;font-weight:bold;">Ready for your next step?</p>
    <p style="margin:0;color:#514752;font-size:14px;line-height:1.7;">Visit your nearest blood bank or donation center to complete a health screening before donating again.</p>
    </td></tr>
    </table>
    </td></tr>
    <tr><td style="padding:0 36px 37px;">
    <p style="margin:0;padding-top:17px;border-top:1px solid #eee9ee;color:#77717b;font-size:13px;line-height:1.65;"><strong style="color:#554b59;">Please note:</strong> Completing the waiting period does not guarantee eligibility to donate. Blood bank staff will assess your eligibility during screening.</p>
    </td></tr>
    <tr><td style="background-color:#faf8f9;padding:23px 36px;border-top:1px solid #eee9ee;text-align:center;">
    <p style="margin:0 0 5px;color:#84263c;font-weight:bold;font-size:13px;">Thank you for being a lifesaver.</p>
    <p style="margin:0;color:#8b858d;font-size:12px;line-height:1.6;">CAPIT Blood Reservation System<br>This is an automated donation reminder.</p>
    </td></tr>
    </table>
    </td></tr>
    </table>
    </body>
    </html>`;
}

async function sendEligibilityEmail(email, _config, { mailer = sendEmail } = {}) {
    const text = [
        'Your next opportunity to give is here!',
        '',
        'Great news! Your donation waiting period has passed. You may visit your nearest blood bank for donor screening before donating again.',
        '',
        'Final eligibility to donate will be assessed by blood bank staff during screening.',
        '',
        'Thank you for helping save lives.',
        '',
        'CAPIT Blood Reservation System'
    ].join('\n');

    const info = await mailer({
        email,
        subject: 'CAPIT | Your next donation opportunity is here',
        text,
        message: eligibilityEmailHTML()
    });
    if (!info.accepted?.some(address => String(address).toLowerCase() === email.toLowerCase())) {
        throw new Error('Email acceptance was not confirmed');
    }
    return { messageId: info.messageId, providerStatus: 'Accepted' };
}

module.exports = { normalizeEmail, sendEligibilityEmail };
