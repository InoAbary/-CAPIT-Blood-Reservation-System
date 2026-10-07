const mongoose = require('mongoose');

const bloodReportSchema = new mongoose.Schema({

    inventoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'inventories'
    },
    dateCreated: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ["Used", "Wasted", "Expired", "Unused"]
    },
    description: {
        type: String
    }
    

})

module.exports = mongoose.model('Blood_Usage_Reports', bloodReportSchema)