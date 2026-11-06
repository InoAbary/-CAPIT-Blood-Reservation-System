const mongoose = require('mongoose');

const appointmentSchedSchema = new mongoose.Schema({

    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donors',
        required: true,
        index: true
    },

    assocStaff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
    },

    date: {
        type: Date,
        required: true
    },

    venue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facilities',
        required: true
    }


})

module.exports = mongoose.model('Appointment_Schedules', appointmentSchedSchema)