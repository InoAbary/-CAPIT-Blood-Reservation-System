const express = require('express');

const mongoose = require('mongoose');
const router = express.Router();

const Donor = require('../../db/models/donor.cjs')
const FormAnswers = require('../../db/models/formAnswers.cjs')
const requireDonor = require("../middleware/requireDonor.cjs");


router.get('/form-recent', requireDonor, async(req,res) => {
    try {

        const {id} = req.user

        const donor = await Donor.findById(id).select('_id')
        if (!donor) {
            return res.status(404).json({ error: 'Donor not found.' });
        }

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 1);

        const recent = await FormAnswers.findOne({
            donor: id,
            createdAt: { $gte: cutoff },
        })
            .sort({ createdAt: -1 })
            .select('_id createdAt');

        if (!recent) {
            return res.json({
                hasRecentForm: false,
                validDays: 1,
            });
        }

        return res.json({
            hasRecentForm: true,
            submissionId: recent._id,
            submittedAt: recent.createdAt,
            validDays: 1,
        });

    } catch (err) {
        console.log(err)
        res.status(400).json({ error: 'Failed to get recent answer form.' })
    }
})


router.post('/form-answers', requireDonor, async(req,res) => {

    try {
        const doc = await FormAnswers.create(req.body)
        res.status(201).json(doc)

    } catch(err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
})

module.exports = router;

