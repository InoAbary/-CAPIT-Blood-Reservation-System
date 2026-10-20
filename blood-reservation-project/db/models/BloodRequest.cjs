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
        hospital: String,
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
    },
    { timestamps: true }
);

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);
