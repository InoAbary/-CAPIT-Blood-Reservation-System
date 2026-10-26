const mongoose = require("mongoose");

// These property names match Bloodrequestform(9).jsx.
// Custom field validation is intentionally omitted for this initial version.
const bloodRequestSchema = new mongoose.Schema(
    {
        firstName: String,
        lastName: String,
        middleName: String,
        age: Number,
        sex: String,
        hospital: String, // TODO: change. must reference facility id
        wardRoom: String,
        diagnosis: String,
        hemoglobin: Number,
        platelets: Number,
        priorTransfusion: String,
        priorTransfusionDate: Date,
        priorTransfusionNotes: String,
        bloodType: String,
        component: String,
        units: Number,
        urgency: String,
        hospitalFacilityID: { // TODO: must be automatic based on logged in user's info
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facilities',
            default: null
        },
        
        requestedBy: { //TODO: must be automatic based on logged in user



            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff',
            default: null
        },
        
        requestStatus: {
            type: String,
            enum: [
                'Pending',
                'Approved',
                'Partially Fulfilled',
                'Fulfilled',
                'Rejected',
                'Cancelled'
            ],
            default: 'Pending'
        },
        
        fulfilledAt: {
            type: Date,
            default: null
        },

    },
    { timestamps: true }
);

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);
