const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    passwordFingerprint: { type: String, required: true }
}, { _id: false });

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
    },
    passwordReset: {
        type: passwordResetSchema,
        select: false,
        default: undefined
    }



})



module.exports = mongoose.model('Staff', staffSchema);
