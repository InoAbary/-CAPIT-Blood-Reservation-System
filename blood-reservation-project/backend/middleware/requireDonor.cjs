const jwt = require("jsonwebtoken");
const Donor = require('../../db/models/donor.cjs');

async function requireDonor(req, res, next) {
    const token = req.cookies?.donorToken;

    if (!token) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            audience: "donor",
        });

        if (decoded.role !== "donor") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const donor = await Donor.findById(decoded.id).select('_id role isActive').lean();
        if (!donor || donor.role !== 'donor' || donor.isActive === false) {
            return res.status(401).json({ message: "Invalid or suspended session" });
        }
        req.user = decoded;
        next();
    } catch (err) {
        console.error("Donor JWT error:", err.message);
        return res.status(401).json({ message: "Invalid or expired session" });
    }
};


module.exports = requireDonor;
