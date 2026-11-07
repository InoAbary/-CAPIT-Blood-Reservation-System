require('dotenv').config();
const nodemailer = require('nodemailer');
const {ICalCalendar} = require('ical-generator')

let transporter;

async function sendAppointmentEmail(option){
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

    let icalContent = null;

    if (option.event) {
        const calendar = new ICalCalendar({
            domain: 'sandugo.com',
            prodId: '//Sandugo//Appointment//EN',
            method: 'REQUEST'
        })
        
        calendar.createEvent({
            start: option.event.start,
            end: option.event.end,
            summary: option.event.summary || 'Blood Donation Appointment',
            location: option.event.location || '',
            description: option.event.description || '',
            organizer: {
                name: 'Sandugo',
                email: process.env.EMAIL_ID
            }
        })

        icalContent = calendar.toString();
    }

    const mailOptions = {
        from: process.env.EMAIL_ID,
        to: option.email,
        subject: option.subject,
        html: option.message,
        text: option.text
    };

    if (icalContent) {
        mailOptions.icalEvent = {
            filename: 'appointment.ics',
            method: 'REQUEST',
            content: icalContent
        }
    }
    const info = await transporter.sendMail(mailOptions);

    if(info.rejected?.length && !info.accepted?.length) throw new Error('Email was rejected');
    return info;
}

module.exports = {sendAppointmentEmail}