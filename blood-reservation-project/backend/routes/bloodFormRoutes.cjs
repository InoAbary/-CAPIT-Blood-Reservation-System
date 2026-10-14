const express = require('express');

const mongoose = require('mongoose');
const router = express.Router();

const FormDetails = require('../../db/models/formDetails.cjs')
const FormAnswers = require('../../db/models/formAnswers.cjs')

router.post('/form-details', async(req,res) => {

    try {
        const doc = await FormDetails.create(req.body)
        res.status(201).json(doc)

    } catch(err) {
        res.status(400).json({ error: err.message })
    }
})

router.post('/form-answers', async(req,res) => {

    try {
        const doc = await FormAnswers.create(req.body)
        res.status(201).json(doc)

    } catch(err) {
        res.status(400).json({ error: err.message })
    }
})

module.exports = router;