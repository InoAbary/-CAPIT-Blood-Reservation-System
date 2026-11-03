require('dotenv').config();
const nodemailer = require('nodemailer');
let transporter;

async function sendEmail(option) {
    if (!process.env.EMAIL_ID || !process.env.EMAIL_PASSWORD) {
        throw new Error('EMAIL_ID and EMAIL_PASSWORD must be configured on the backend.');
    }
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_ID, pass: process.env.EMAIL_PASSWORD },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 20000
        });
    }
    // Promise form: SMTP failures reject and are handled by the route.
    const info = await transporter.sendMail({
        from: process.env.EMAIL_ID,
        to: option.email,
        subject: option.subject,
        html: option.message,
        text: option.text
    });
    if (info.rejected?.length && !info.accepted?.length) throw new Error('Email recipient was rejected.');
    return info;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
}

function mailTemplate(content, buttonUrl, buttonText = 'Reset Password') {
    const url = new URL(buttonUrl);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid reset link protocol.');
    const link = escapeHTML(url.toString());
    return `<!doctype html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin:0;padding:28px 16px;background:#f7f5f6;font-family:Arial,sans-serif;color:#29262b">
    <div style="max-width:460px;margin:auto;background:white;padding:30px;border-radius:12px">
    <h2 style="color:#a51f3a">Donor password reset</h2>
    <p style="line-height:1.7">${escapeHTML(content)}</p>
    <p style="margin:28px 0"><a href="${link}" style="display:inline-block;background:#a51f3a;color:#ffffff;padding:13px 22px;border-radius:7px;text-decoration:none;font-weight:bold">${escapeHTML(buttonText)}</a></p>
    <p style="font-size:13px;line-height:1.6">If the button does not open, copy and paste this link into your browser:</p>
    <p style="font-size:12px;overflow-wrap:anywhere"><a href="${link}">${link}</a></p>
    <p style="font-size:12px;color:#776d74">This link is for your donor account only and can be used once.</p>
    </div></body></html>`;
}
module.exports = { sendEmail, mailTemplate };
