const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({

    recipientStaffID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
    },
    recipientDonorID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donors'
    },
    notificationType: {
        type: String,
        enum: [
                //staff - bsf
                "blood_request", //new blood request, approved blood request, request fulfilled
                "received_donor_application",
                "appointment", //appointment received from donor
                "blood_stock_update", //for low/no stocks

                //staff - hospital
                "blood_request_status", //blood request status update

                //donors
                "donation_application_approved",
                "waiting_period_elapsed", //90 days has passed after last donation
                "appointment_approved",
                "blood_drive_soon",
                "appointment_reminder",

                //general
                "christmas_greeting",
                "new_year_greeting",
                "valentines_greeting",
              ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String
    },
    readAt: {
        type: Date,
        default: null //unread
    },
    createdAt: {
        type: Date,
        default: Date.now
    },

    //associated records
    bloodRequestID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BloodRequests'
    },
    donorFormID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form_answers'
    },
    appointmentSchedule: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment_Schedules'
    },
    iconPath: { //icon for notification
        type: String,
        required: true
    }
})

module.exports = mongoose.model('Notifications', notificationSchema);
