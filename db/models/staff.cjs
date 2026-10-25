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
    branch: { type: String, trim: true, default: '' },
    mobile: { type: String, trim: true, default: '' },
    staffId: { type: String, trim: true, default: '' },
    createdByName: { type: String, trim: true, default: '' },
    createdByEmail: { type: String, lowercase: true, trim: true, default: '' },
    canManageAccounts: { type: Boolean, default: false },
    isPrimaryAdmin: { type: Boolean, default: false },
    requirePasswordChange: { type: Boolean, default: false },
    passwordSetupTokenHash: { type: String, select: false },
    passwordSetupExpiresAt: { type: Date, select: false },
    isActive: {
        type: Boolean,
        default: true
    },
    password: {
        type: String,
        required: true
    }

    

}, { timestamps: true });

const bcrypt = require('bcryptjs');
staffSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};
staffSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};



module.exports = mongoose.model('Staff', staffSchema);
