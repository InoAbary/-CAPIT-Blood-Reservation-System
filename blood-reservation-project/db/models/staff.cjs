const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

staffSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10))
}

staffSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password)
}

module.exports = mongoose.model('Staff', staffSchema);