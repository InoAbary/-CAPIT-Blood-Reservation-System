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
        fulfillmentMethod: { type: String, enum: ['Pickup', 'Delivery'], required: true },
        confirmedFulfillmentMethod: { type: String, enum: ['Pickup', 'Delivery'], default: null },
        fulfillmentMethodNote: { type: String, trim: true, maxlength: 1000, default: '' },
        fulfillmentStatus: { type: String, enum: ['Preparing', 'On the Way', 'Delivered', 'Ready for Pickup', 'Picked Up'], default: null },
        fulfillmentDetails: {
            pickupLocation: { type: String, trim: true, maxlength: 300, default: '' },
            staffContactName: { type: String, trim: true, maxlength: 150, default: '' },
        },
        fulfillmentEvents: [{
            status: { type: String, required: true },
            note: { type: String, trim: true, maxlength: 1000, default: '' },
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
            updatedAt: { type: Date, default: Date.now },
        }],
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
                'Awaiting Hospital Confirmation',
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
