const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

// Hidden from normal donor queries, including the /me profile response.
const passwordResetSchema = new mongoose.Schema({
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    passwordFingerprint: { type: String, required: true }
}, { _id: false });

const mobileNumberChangeSchema = new mongoose.Schema({
    tokenHash: { type: String, required: true },
    newNumber: { type: String, required: true },
    previousNumber: { type: String, default: '' },
    email: { type: String, required: true },
    passwordFingerprint: { type: String, required: true },
    requestedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true }
}, { _id: false });

const donorSchema = new mongoose.Schema({

    // Personal Information
    donorID:        { type: String, required: true},
    lastName:       { type: String, required: true, trim: true },
    firstName:      { type: String, required: true, trim: true },
    middleName:     { type: String, trim: true },
    birthDate:      { type: Date,   required: true },
    age:            { type: Number, required: true, min: 16, max: 65 },
    civilStatus:    { type: String, required: true, trim: true },
    sex:            {   type: String, trim: true, enum: ["Male", "Female"]},
    bloodType:      { type: String,
        required: true,
        enum: ["A+" , "A-", "B+" , "B-", "O+" , "O-", "AB+" , "AB-"]
    },

    // Address
    houseNumber:    { type: String, required: true, trim: true },
    street:         { type: String, required: true, trim: true },
    barangay:       { type: String, required: true, trim: true },
    municipality:   { type: String, trim: true },
    province:       { type: String, trim: true },
    zipCode:        { type: String, trim: true },

    // Work
    officeAddress:  { type: String, trim: true },

    // Demographics
    nationality:    { type: String, required: true, trim: true },
    religion:       { type: String, trim: true },
    education:      { type: String, required: true, trim: true },
    occupation:     { type: String, trim: true },

    // Contact
    telephoneNumber:{ type: String, trim: true },
    mobileNumber:   { type: String, trim: true },
    email:          { type: String, required: true, trim: true, lowercase: true },
    notificationPreferences: {
        sms: { type: Boolean, default: true },
        email: { type: Boolean, default: true }
    },

    // IDs
    schoolID:       { type: String, trim: true },
    companyID:      { type: String, trim: true },
    prcID:          { type: String, trim: true },
    driverID:       { type: String, trim: true },
    govID:          { type: String, trim: true },
    otherID:        { type: String, trim: true },

    password:       { type: String, required: true},
    role:           { type: String, enum: ['donor', 'recipient'], default: "donor"},
    passwordReset: {
        type: passwordResetSchema,
        select: false,
        default: undefined
    },
    mobileNumberChange: {
        type: mobileNumberChangeSchema,
        select: false,
        default: undefined
    },
    badges: [{
        badgeClassId: String,
        assertionId: String,
        issuedOn: Date,
        name: String,
        imageUrl: String
    }]

}, { timestamps: true })



module.exports = mongoose.model('Donors', donorSchema)
