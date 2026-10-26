function requireRole(...allowed) {
    const allowedSet = new Set(allowed);

    return (req,res,next) => {
        if (!req.user) {
            return res.status(401).json({message: "Authentication required"})
        }
        if (!allowedSet.has(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    }
};

module.exports = requireRole;