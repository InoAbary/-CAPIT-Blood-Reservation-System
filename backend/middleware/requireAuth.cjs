
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
    const token = req.cookies?.authToken;

    if (!token) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;
        next();

    } catch (error) {
        console.error("JWT verification error:", error.message);

        return res.status(401).json({
            message: "Invalid or expired session"
        });
    }
}

module.exports = requireAuth;
