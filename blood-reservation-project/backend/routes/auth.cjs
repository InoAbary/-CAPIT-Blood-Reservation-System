const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Donor = require('../../db/models/donor.cjs')
const bcrypt = require('bcrypt')
module.exports = router;


router.post('/register', async(req,res) => {

    try {

        const donorData = req.body

        if (donorData.password !== donorData.confirmPassword){
            return res.status(400).json({
                error: 'Passwords do not match.'
            })
            
        }
        const donor = new Donor(donorData)

        donor.password = Donor.generateHash(donorData.password)

        await donor.save()

    } catch (err) {

        res.status(400).json({ error: err.message })
       

    }
})

router.post('/login', async(req,res) => {


    try {

        const data = req.body
        const donorAcc = Donor.findOne({email: data.email}) 
        if (!donorAcc || !donorAcc.validPassword(data.password)) {
            return res.status(400).json({
                error: 'Invalid login'
            })
        }
        
        res.status(200)

    } catch (err) {

        res.status(400).json({
            error: 'Invalid login'
        })

    }
})