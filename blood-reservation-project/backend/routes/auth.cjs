const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../../db/models/users.cjs");
const requireAuth = require("../middleware/requireAuth.cjs");

const router = express.Router();

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({
            email: String(email || "").toLowerCase()
        });

        const validPassword = user &&
            await bcrypt.compare(
                password || "",
                user.passwordHash
            );

        if (!validPassword) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { id: user._id.toString(), role: user.role },
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
                id: user._id,
                email: user.email,
                role: user.role
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
    const user = await User.findById(req.user.id)
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

module.exports = router;
