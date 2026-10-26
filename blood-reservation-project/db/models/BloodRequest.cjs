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
        hospital: String, // Sending hospital name, derived from the signed-in account.
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
        receivingFacilityID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facilities',
            required: true,
            index: true
        },
        hospitalFacilityID: { // Sending hospital: assigned staff facility, not the blood supplier.
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facilities',
            default: null
        },

        requestedBy: { // Authenticated staff member who submitted the request.



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

        fulfilledUnits: {
            type: Number,
            default: 0,
                min: 0
        },
        fulfilledAt: {
            type: Date,
            default: null
        },

    },
    { timestamps: true }
);

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);
