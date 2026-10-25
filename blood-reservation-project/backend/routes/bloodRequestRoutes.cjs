const express = require("express");
const BloodRequest = require("../../db/models/BloodRequest.cjs");

const Staff = require("../../db/models/staff.cjs");

const requireStaff = require("../middleware/requireStaff.cjs");

const router = express.Router();

router.post("/", requireStaff, async (req, res) => {
    try {
        const staff = await Staff.findById(req.user.id).select("facilityID role");

        if(!staff){
            return res.status(401).json({
                message: "Invalid staff account."
            });
        }

        if (staff.role !== "hospital"){
            return res.status(403).json({
                message: "Only hospital staff can create blood requests."
            });
        }

        if (!staff.facilityID){
            return res.status(400).json({
                message: "Hospital staff account is not assigned to a hospital/facility."
            });
        }

        // system assigned fields
        const {
            hospitalFacilityID,
            requestedBy,
            requestStatus,
            fulfilledAt,
            ...requestData
        } = req.body;

        const request = await BloodRequest.create({
            ...requestData,

            hospitalFacilityID: staff.facilityID,
            requestedBy: staff._id,

            requestStatus: "Pending",
            fulfilledAt: null
        });

        return res.status(201).json({
            message: "Blood request successfully saved.",

            bloodRequest: request
        })
    } catch (error) {
        console.error("Failed to save blood request:", error);
        return res.status(500).json({ message: "Unable to save blood request." });
    }
});

module.exports = router;