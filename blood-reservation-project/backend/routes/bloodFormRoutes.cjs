const express = require('express');

const mongoose = require('mongoose');
const router = express.Router();

const Donor = require('../../db/models/donor.cjs')
const FormAnswers = require('../../db/models/formAnswers.cjs')
const requireDonor = require("../middleware/requireDonor.cjs");




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