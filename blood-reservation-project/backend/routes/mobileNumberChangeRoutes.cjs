const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const requireDonor = require('../middleware/requireDonor.cjs');
const { createMobileNumberChangeService } = require('../services/mobileNumberChange.cjs');
const service = createMobileNumberChangeService();
const limit = count => rateLimit({ windowMs: 15 * 60 * 1000, limit: count,
    standardHeaders: true, legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in 15 minutes.' } });

function handler(action) {
    return async (req, res) => {
        res.set('Cache-Control', 'no-store');
        try { return res.json(await action(req)); }
        catch (error) {
            return res.status(error.status || 503).json({ message: error.status ? error.message : 'Mobile number changes are temporarily unavailable. Please try again later.' });
        }
    };
}

router.post('/mobile-number/request', requireDonor, limit(5), handler(req => service.request(req.user.id, req.body?.mobileNumber)));
// Email possession verifies this link, even if the donor session has expired.
router.post('/mobile-number/confirm', limit(20), handler(req => service.confirm(req.body?.token)));
module.exports = router;
