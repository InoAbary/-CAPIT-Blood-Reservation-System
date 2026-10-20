const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Donor = require('../../db/models/donor.cjs')
const Staff = require('../../db/models/staff.cjs')
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

        
        const existing = await Donor.findOne({email: donorData.email})
        
        if (existing) {
            return res.status(400).json({
                error: 'Invalid register. Please try again.'
            })
        }
        const donor = new Donor(donorData)
        donor.password = donor.generateHash(donorData.password)
        await donor.save()

        return res.status(201).json({
            success: true,
            message: 'Registration successful.',
            donorId: donor._id
        })

    } catch (err) {

        return res.status(400).json({ error: 'Invalid register. Please try again.'})
       

    }
})

router.post('/login', async(req,res) => {

    try {
        const data = req.body
        const donorAcc = await Donor.findOne({email: data.email}) 
        
        if (!donorAcc || !donorAcc.validPassword(data.password)) {
            return res.status(400).json({
                error: 'Invalid login.'
            })
        }
        
        return res.status(200).json({
            success: true,
            acc: donorAcc
        })
    } catch (err) {
        res.status(400).json({
            error: 'Invalid login'
        })
    }
    
})

router.post('/register/staff', async(req,res) => {

    try {

        const staffData = req.body

        if (staffData.password !== staffData.confirmPassword){
            return res.status(400).json({
                error: 'Passwords do not match.'
            })
            
        }

        
        const existing = await Staff.findOne({email: staffData.email})
        
        if (existing) {
            
            return res.status(400).json({
                error: 'Invalid register. Please try again.'
            })
        }
        const staff = new Staff(staffData)
        staff.password = staff.generateHash(staffData.password)
        await staff.save()

        return res.status(201).json({
            success: true,
            message: 'Registration successful.',
            donorId: staff._id
        })

    } catch (err) {

        return res.status(400).json({ error: 'Invalid register. Please try again.'})
       

    }
})

router.post('/login/staff', async(req,res) => {


    try {

        const data = req.body
        const staffAcc = await Staff.findOne({email: data.email}) 
        
        if (!staffAcc || !staffAcc.validPassword(data.password)) {
            return res.status(400).json({
                error: 'Invalid login.'
            })
        }
        
        return res.status(200).json({
            success: true,
            acc: staffAcc
        })

    } catch (err) {

        res.status(400).json({
            error: 'Invalid login'
        })

    }
})