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
    branch: { type: String, trim: true, default: '' },
    mobile: { type: String, trim: true, default: '' },
    // Newly created staff accounts use the shared SDYY#### generator. Legacy IDs remain valid.
    staffId: { type: String, trim: true, default: '' },
    createdByName: { type: String, trim: true, default: 'System' },
    createdByEmail: { type: String, trim: true, lowercase: true, default: '' },
    canManageAccounts: { type: Boolean, default: false },
    isPrimaryAdmin: { type: Boolean, default: false },
    requirePasswordChange: { type: Boolean, default: false },
    passwordSetupTokenHash: { type: String, select: false, default: undefined },
    passwordSetupExpiresAt: { type: Date, select: false, default: undefined },
    pendingPrimaryAdminTransferTargetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: undefined },
    pendingPrimaryAdminTransferExpiresAt: { type: Date, default: undefined },
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



}, { timestamps: true })



module.exports = mongoose.model('Staff', staffSchema);
