const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({

    facilityID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facilities'
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        default: "staff"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    password: {
        type: String,
        required: true
    }

    

})



module.exports = mongoose.model('Staff', staffSchema);