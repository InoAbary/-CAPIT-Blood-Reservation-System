const mongoose = require('mongoose');
const Staff = require('../../db/models/staff.cjs');
const Facility = require('../../db/models/facilities.cjs');
const requireStaff = require('./requireStaff.cjs');
const deny = (res, status, message) => res.status(status).json({ success: false, message });

async function loadAccess(req, res, next) {
    try {
        if (!mongoose.isObjectIdOrHexString(req.user?.id)) return deny(res, 401, 'Invalid staff session.');
        const account = await Staff.findById(req.user.id).select('_id role isActive facilityID').lean();
        if (!account || account.isActive !== true) return deny(res, 401, 'Staff account is unavailable.');
        if (!['staff', 'admin'].includes(account.role)) return deny(res, 403, 'Inventory access is limited to staff and administrators.');
        let facility = null;
        if (account.role === 'staff') {
            if (!mongoose.isObjectIdOrHexString(account.facilityID)) return deny(res, 403, 'Your account has no assigned facility.');
            facility = await Facility.findOne({ _id: account.facilityID, isActive: true, facilityType: { $in: ['bsf', 'prc_chapter'] } }).lean();
            if (!facility) return deny(res, 403, 'Your account needs an active BSF or PRC facility assignment.');
        }
        // Role and facility are taken from the CURRENT account, not client input.
        req.inventoryAccess = { account, facility, canEdit: account.role === 'staff' };
        req.user = { ...req.user, id: String(account._id), role: account.role };
        res.set('Cache-Control', 'no-store');
        return next();
    } catch (error) {
        console.error('Inventory access error:', error.name);
        return deny(res, 500, 'Could not verify inventory access.');
    }
}
const authenticateInventory = [requireStaff, loadAccess];
async function authorizeFacility(req, res, next) {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return deny(res, 400, 'Invalid facility ID.');
    const access = req.inventoryAccess;
    if (access.canEdit && String(access.facility._id) !== req.params.id) return deny(res, 403, 'You can only access your assigned facility inventory.');
    try {
        const facility = access.canEdit ? access.facility : await Facility.findById(req.params.id).lean();
        if (!facility) return deny(res, 404, 'Facility not found.');
        req.inventoryFacility = facility;
        return next();
    } catch (error) {
        return deny(res, 500, 'Could not load facility.');
    }
}
function requireInventoryWrite(req, res, next) {
    if (!req.inventoryAccess?.canEdit) return deny(res, 403, 'Administrators have read-only inventory access.');
    return next();
}
const inventoryFilter = req => req.inventoryAccess.canEdit ? { facilityID: req.inventoryAccess.facility._id } : {};
const unitFilter = req => req.inventoryAccess.canEdit ? { facilityID: String(req.inventoryAccess.facility._id) } : {};
module.exports = { authenticateInventory, authorizeFacility, requireInventoryWrite, inventoryFilter, unitFilter };
