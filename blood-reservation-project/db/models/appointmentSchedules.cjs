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
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'denied', 'cancelled', 'completed'],
      default: 'pending',
      index: true,
    },
    
    note: {
      type: String, // staff's reason for denying, or donor's cancel note
      trim: true,
    },
    
    decidedAt: {
      type: Date, // when staff approved/denied
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Appointment_Schedules', appointmentSchedSchema)