const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const jwt = require("jsonwebtoken");
const requireAuth = require("../middleware/requireAuth.cjs");
const Donor = require('../../db/models/donor.cjs')
const Staff = require('../../db/models/staff.cjs')
const bcrypt = require('bcryptjs');
const { useRoutes } = require('react-router-dom');




router.post('/register', async(req,res) => {

    try {

        const {password, confirmPassword, ...rest} = req.body

        if (password !== confirmPassword){
            return res.status(400).json({
                error: 'Passwords do not match.'
            })
            
        }

        
        const existing = await Donor.findOne({email: rest.email})
        
        if (existing) {
            return res.status(400).json({
                error: 'Invalid register. Please try again.'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const donor = await Donor.create({
            ...rest,
            password: hashedPassword
        })
        

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
        .select("-password");

    if (!user) {
        return res.status(401).json({
            message: "Invalid user"
        });
    }

    res.json({ user });

});

router.get("/me/staff", requireAuth, async (req, res) => {
    const user = await Staff.findById(req.user.id)
        .select("-password");

    if (!user) {
        return res.status(401).json({
            message: "Invalid user"
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

        const {password, confirmPassword, ...rest} = req.body

        if (password !== confirmPassword){
            return res.status(400).json({
                error: 'Passwords do not match.'
            })
            
        }

        
        const existing = await Staff.findOne({email: rest.email})
        
        if (existing) {
            
            return res.status(400).json({
                error: 'Invalid register. Please try again.'
            })
        }
        
        const hashedPassword = await bcrypt.hash(password, 10)

        const staff = await Staff.create({
            ...rest,
            password: hashedPassword
        })
        

        return res.status(201).json({
            success: true,
            message: 'Registration successful.',
            donorId: staff._id
        })

    } catch (err) {

        return res.status(400).json({ error: 'Invalid register. Please try again.'})
       

    }
})


router.post('/login/staff', async (req, res) => {
  try {
    const { email, password } = req.body;
    const staff = await Staff.findOne({ email: String(email || '').toLowerCase() });

    const valid = staff && await bcrypt.compare(password || '', staff.password);
    if (!valid) return res.status(400).json({ error: 'Invalid login.' });

    const token = jwt.sign(
      { id: staff._id.toString(), role: staff.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
      path: '/',
    });

    return res.status(200).json({
      success: true,
      user: { id: staff._id, email: staff.email, role: staff.role  },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});




module.exports = router;


