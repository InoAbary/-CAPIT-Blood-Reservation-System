const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const donorSchema = new mongoose.Schema({

    // Personal Information
    lastName:       { type: String, required: true, trim: true },
    firstName:      { type: String, required: true, trim: true },
    middleName:     { type: String, trim: true },
    birthDate:      { type: Date,   required: true },
    age:            { type: Number, required: true, min: 16, max: 65 },
    civilStatus:    { type: String, required: true, trim: true },
    sex:            {   type: String, trim: true, enum: ["Male", "Female"]},

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

    // IDs
    schoolID:       { type: String, trim: true },
    companyID:      { type: String, trim: true },
    prcID:          { type: String, trim: true },
    driverID:       { type: String, trim: true },
    govID:          { type: String, trim: true },
    otherID:        { type: String, trim: true },
    
    password:       { type: String, required: true}

}, { timestamps: true })

donorSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10))
}

donorSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password)
}

module.exports = mongoose.model('Donors', donorSchema)