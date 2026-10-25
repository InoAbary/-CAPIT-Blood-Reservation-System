
const mongoose = require('mongoose');

const bloodReportSchema = new mongoose.Schema({

    reportID: {
        type: String,
        required: true,
        unique: true
    },
    bloodUnitID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BloodUnits',
        required: true
    },
    dateCreated: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        required: true,
        enum: ["Used", "Wasted", "Expired", "Unused"]
    },
    reportSource: {
        type: String,
        required: true,
        enum: ["Hospital", "System"],
        default: "Hospital"
    },
    
    isAssumed: {
        type: Boolean,
        default: false
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        default: null
    },
    description: {
        type: String
    }
    

})

module.exports = mongoose.model('Blood_Usage_Reports', bloodReportSchema)