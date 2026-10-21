const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({
    facilityID: {
        type: String,
        default: () => 'F' + Math.floor(10000 + Math.random() * 90000)
    },
    facilityName: {
        type: String,
        required: true
    },
    facilityType: {
        type: String,
        required: true,
        enum: ['bsf', 'hospital', 'blood bank', 'donation center'],
        default: 'bsf'
    },
    category: {
        type: String,
        default: 'Hospital BSF'
    },
    typeLabel: {
        type: String,
        default: 'Blood Service Facility'
    },
    address: {
        type: String,
        required: true
    },
    contactNumber: {       
        type: String,
        required: true
    },
    contactNuber: {
        type: String
    },
    phone: {
        type: String
    },
    lat: {
        type: Number,
        default: 14.5995
    },
    lon: {
        type: Number,
        default: 120.9842
    },
    hours: {
        type: String,
        default: '8:00 AM - 5:00 PM'
    },
    matrix: {
        type: Object,
        default: {}
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Pre-save hook to ensure aliases are kept in sync
facilitySchema.pre('save', function (next) {
    if (this.contactNumber && !this.contactNuber) {
        this.contactNuber = this.contactNumber;
    }
    if (this.contactNumber && !this.phone) {
        this.phone = this.contactNumber;
    }
    next();
});

module.exports = mongoose.model('Facilities', facilitySchema);
