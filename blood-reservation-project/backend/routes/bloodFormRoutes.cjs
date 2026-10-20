const express = require("express");
const BloodRequest = require("../../db/models/BloodRequest.cjs");

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        // Create one MongoDB document from the submitted form values.
        // No custom validation or business-rule checks at this stage.
        const request = await BloodRequest.create(req.body);
        return res.status(201).json({
            message: "Blood request saved successfully.",
            bloodRequest: request,
        });
    } catch (error) {
        console.error("Failed to save blood request:", error);
        return res.status(500).json({ message: "Unable to save blood request." });
    }
});

module.exports = router;
