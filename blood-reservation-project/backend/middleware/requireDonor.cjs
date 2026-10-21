const jwt = require("jsonwebtoken");

function requireDonor(req, res, next) {
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

        req.user = decoded;
        next();
    } catch (err) {
        console.error("Donor JWT error:", err.message);
        return res.status(401).json({ message: "Invalid or expired session" });
    }
};


module.exports = requireDonor;