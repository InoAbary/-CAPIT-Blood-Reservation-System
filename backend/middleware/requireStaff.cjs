const jwt = require("jsonwebtoken");

const STAFF_ROLES = new Set(["staff", "supervisor", "admin", "hospital", "System Admin", "BSF Admin", "PRC Admin", "Hospital Supervisor", "BSF Supervisor", "Hospital Staff", "BSF Staff", "PRC Staff", "Blood Services Admin"]);

function requireStaff(req, res, next) {
    const token = req.cookies?.staffToken;

    if (!token) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            audience: "staff",
        });

        if (!STAFF_ROLES.has(decoded.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        req.user = decoded;
        next();
    } catch (err) {
        console.error("Staff JWT error:", err.message);
        return res.status(401).json({ message: "Invalid or expired session" });
    }
};

module.exports = requireStaff;
