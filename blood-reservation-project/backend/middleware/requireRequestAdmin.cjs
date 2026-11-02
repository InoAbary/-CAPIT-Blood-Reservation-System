const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Staff = require('../../db/models/staff.cjs');

// Authenticates a staff account; route-specific guards apply role/facility rules.
// Filename retained so existing route imports continue to work.
module.exports = async function requireRequestStaff(req, res, next) {
    if (!process.env.JWT_SECRET) return res.status(500).json({ success: false, message: 'JWT_SECRET is not configured.' });
    const token = req.cookies?.staffToken;
    if (!token) return res.status(401).json({ success: false, message: 'Staff authentication required.' });
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], audience: 'staff' });
    } catch {
        return res.status(401).json({ success: false, message: 'Your session is invalid or expired. Please sign in again.' });
    }
    if (!payload || !mongoose.isObjectIdOrHexString(payload.id)) {
        return res.status(401).json({ success: false, message: 'Invalid staff session.' });
    }
    try {
        const staff = await Staff.findById(payload.id).select('_id role isActive facilityID').lean();
        if (!staff || staff.isActive !== true) return res.status(401).json({ success: false, message: 'Staff account is unavailable.' });
        req.requestStaff = staff;
        return next();
    } catch (error) {
        console.error('Request authentication error:', error.name);
        return res.status(500).json({ success: false, message: 'Could not verify staff account.' });
    }
};
