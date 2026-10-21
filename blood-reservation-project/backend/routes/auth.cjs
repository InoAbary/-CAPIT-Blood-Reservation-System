const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const jwt = require("jsonwebtoken");
const requireAuth = require("../middleware/requireAuth.cjs");
const Donor = require('../../db/models/donor.cjs')
const Staff = require('../../db/models/staff.cjs')
const bcryptjs = require('bcryptjs')



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

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const donor = await Donor.findOne({
            email: String(email || "").toLowerCase()
        });

        const validPassword = donor &&
            await bcrypt.compare(
                password || "",
                donor.password
            );

        if (!validPassword) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { id: donor._id.toString(), role: donor.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.cookie("authToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 1000,
            path: "/"
        });

        res.json({
            message: "Login successful",
            user: {
                id: donor._id,
                email: donor.email,
                role: donor.role
            }
        });
    } catch (error) {
        console.error("LOGIN ERROR", error);
        res.status(500).json({
            message: "Login failed"
        });
    }
});

router.get("/me", requireAuth, async (req, res) => {
    const user = await Donor.findById(req.user.id)
        .select("_id email role");

    if (!user) {
        return res.status(401).json({
            message: "User no longer exists"
        });
    }

    res.json({ user });

});

router.post("/logout", (req, res) => {
    res.clearCookie("authToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });

    res.json({message: "Logged out"});
});

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




module.exports = router;


