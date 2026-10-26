const express = require('express');
const mongoose = require('mongoose');
const BloodRequest = require('../../db/models/BloodRequest.cjs');
const Facility = require('../../db/models/facilities.cjs');
const requireRequestStaff = require('../middleware/requireRequestAdmin.cjs');
const router = express.Router();
const REVIEW_ROLES = new Set(['staff', 'supervisor', 'admin']);
const RECEIVER_TYPES = ['bsf', 'prc_chapter'];
const COMPONENTS = ['Packed RBC', 'Platelets', 'Plasma', 'Whole Blood'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PATIENT_FIELDS = ['firstName', 'lastName', 'middleName', 'age', 'sex', 'wardRoom', 'diagnosis',
'hemoglobin', 'platelets', 'priorTransfusion', 'priorTransfusionDate', 'priorTransfusionNotes',
'bloodType', 'component', 'units', 'urgency', 'receivingFacilityID'];
const populateReceiver = query => query.populate('receivingFacilityID', 'facilityName facilityType');
const fail = (res, status, message) => res.status(status).json({ success: false, message });
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(requireRequestStaff);

async function assignedFacility(req) {
    const id = req.requestStaff.facilityID;
    if (!id || !mongoose.isObjectIdOrHexString(id)) return null;
    return Facility.findOne({ _id: id, isActive: true }).lean();
}
async function requireReviewer(req, res, next) {
    if (!REVIEW_ROLES.has(req.requestStaff.role)) return fail(res, 403, 'This account cannot review receiving-facility requests.');
    try {
        const facility = await assignedFacility(req);
        if (!facility || !RECEIVER_TYPES.includes(facility.facilityType)) {
            return fail(res, 403, 'Your account must be assigned to an active BSF or PRC facility.');
        }
        req.receivingFacility = facility;
        return next();
    } catch (error) {
        console.error('Receiving facility lookup error:', error.name);
        return fail(res, 500, 'Could not verify your assigned facility.');
    }
}

// Active destinations only; the selected value is the facility MongoDB _id.
// Registered before /:id so this path is not treated as an ObjectId.
router.get('/receiving-facilities', async (req, res) => {
    if (!['hospital', ...REVIEW_ROLES].includes(req.requestStaff.role)) return fail(res, 403, 'Staff access required.');
    try {
        const facilities = await Facility.find({ isActive: true, facilityType: { $in: RECEIVER_TYPES } })
        .select('_id facilityName facilityType address').sort({ facilityName: 1 }).lean();
        return res.json({ success: true, facilities });
    } catch (error) {
        console.error('Destination list error:', error.name);
        return fail(res, 500, 'Could not load receiving facilities.');
    }
});

// One request document per component/unit row. Shared fields are supplied again
// by the multi-product form. Identity and source hospital come from the session.
router.post('/', async (req, res) => {
    if (req.requestStaff.role !== 'hospital') return fail(res, 403, 'Only hospital accounts may submit blood requests.');
    // Fail before creating anything if this process loaded an older model file.
    if (!BloodRequest.schema.path('receivingFacilityID')) {
        return fail(res, 500, 'The loaded BloodRequest model is missing receivingFacilityID. Update the model file imported by this route and restart the backend.');
    }
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(res, 400, 'Invalid request body.');
    if (!mongoose.isObjectIdOrHexString(body.receivingFacilityID)) return fail(res, 400, 'Select a valid receiving facility.');
    if (!COMPONENTS.includes(body.component) || !BLOOD_TYPES.includes(body.bloodType)) return fail(res, 400, 'Select a valid blood type and component.');
    if (typeof body.units !== 'number' || !Number.isSafeInteger(body.units) || body.units < 1) return fail(res, 400, 'Units must be a positive whole number.');
    if (['firstName', 'lastName', 'diagnosis'].some(field => typeof body[field] !== 'string' || !body[field].trim())) return fail(res, 400, 'Patient name and diagnosis are required.');
    if (!['Male', 'Female'].includes(body.sex)) return fail(res, 400, 'Select a valid sex.');
    const age = Number(body.age);
    if (body.age === '' || body.age == null || !Number.isInteger(age) || age < 0 || age > 120) return fail(res, 400, 'Enter an age between 0 and 120.');
    if (!['routine', 'stat'].includes(body.urgency)) return fail(res, 400, 'Select a valid urgency.');
    if (!['yes', 'no', 'unknown'].includes(body.priorTransfusion)) return fail(res, 400, 'Select a prior transfusion option.');
    if ((body.hemoglobin == null || body.hemoglobin === '') && (body.platelets == null || body.platelets === '')) return fail(res, 400, 'Enter a hemoglobin or platelet count.');
    for (const key of ['hemoglobin', 'platelets']) {
        if (body[key] != null && body[key] !== '' && (!Number.isFinite(Number(body[key])) || Number(body[key]) < 0)) return fail(res, 400, 'Blood counts must be non-negative numbers.');
    }
    const priorDate = body.priorTransfusionDate ? new Date(body.priorTransfusionDate) : null;
    if (body.priorTransfusion === 'yes' && (!priorDate || Number.isNaN(priorDate.getTime()) || priorDate > new Date())) return fail(res, 400, 'Enter a valid previous transfusion date.');
    try {
        const hospital = await assignedFacility(req);
        if (!hospital || hospital.facilityType !== 'hospital') return fail(res, 403, 'Your hospital account needs an active hospital facility assignment.');
        const receiver = await Facility.findOne({ _id: body.receivingFacilityID, isActive: true, facilityType: { $in: RECEIVER_TYPES } }).lean();
        if (!receiver) return fail(res, 400, 'The selected facility is not an active BSF or PRC chapter.');
        // Whitelist model fields; never accept requestedBy, hospitalFacilityID,
        // requestStatus, fulfilledAt, or timestamps from the client.
        const data = Object.fromEntries(PATIENT_FIELDS.filter(key => body[key] !== undefined && body[key] !== '').map(key => [key, body[key]]));
        data.age = age;
        data.priorTransfusionDate = body.priorTransfusion === 'yes' ? priorDate : null;
        data.priorTransfusionNotes = body.priorTransfusion === 'yes' ? (body.priorTransfusionNotes || '') : '';
        data.hospital = hospital.facilityName;
        data.hospitalFacilityID = hospital._id;
        data.requestedBy = req.requestStaff._id;
        data.receivingFacilityID = receiver._id;
        data.requestStatus = 'Pending';
        data.fulfilledAt = null;
        const created = await BloodRequest.create(data);
        return res.status(201).json({ success: true, request: created, bloodRequest: created });
    } catch (error) {
        console.error('Blood request creation error:', error.name);
        return fail(res, ['ValidationError', 'CastError'].includes(error.name) ? 400 : 500,
                    ['ValidationError', 'CastError'].includes(error.name) ? 'Some request fields are invalid.' : 'Could not save the blood request.');
    }
});

router.get('/', requireReviewer, async (req, res) => {
    try {
        const requests = await populateReceiver(BloodRequest.find({ receivingFacilityID: req.receivingFacility._id }))
        .sort({ createdAt: -1, _id: -1 }).lean();
        return res.json({ success: true, requests, facility: { _id: req.receivingFacility._id, facilityName: req.receivingFacility.facilityName } });
    } catch (error) {
        console.error('Blood request list error:', error.name);
        return fail(res, 500, 'Could not load blood requests.');
    }
});
router.param('id', (req, res, next, id) => {
    if (!mongoose.isObjectIdOrHexString(id)) return fail(res, 400, 'Invalid blood request ID.');
    return next();
});
router.get('/:id', requireReviewer, async (req, res) => {
    try {
        const request = await populateReceiver(BloodRequest.findOne({ _id: req.params.id, receivingFacilityID: req.receivingFacility._id })).lean();
        // Missing and other-facility IDs return the same response.
        if (!request) return fail(res, 404, 'Blood request not found.');
        return res.json({ success: true, request });
    } catch (error) {
        console.error('Blood request detail error:', error.name);
        return fail(res, 500, 'Could not load this request.');
    }
});
router.patch('/:id/status', requireReviewer, async (req, res) => {
    const body = req.body;
    if (!body || Array.isArray(body) || Object.keys(body).some(key => key !== 'requestStatus') || !['Approved', 'Rejected'].includes(body.requestStatus)) return fail(res, 400, 'Send only requestStatus: Approved or Rejected.');
    const scope = { _id: req.params.id, receivingFacilityID: req.receivingFacility._id };
    try {
        const request = await populateReceiver(BloodRequest.findOneAndUpdate(
            { ...scope, requestStatus: 'Pending' }, { $set: { requestStatus: body.requestStatus } }, { new: true, runValidators: true }
        )).lean();
        if (!request) {
            const existsInFacility = await BloodRequest.exists(scope);
            return fail(res, existsInFacility ? 409 : 404, existsInFacility ? 'This request has already been reviewed. Refresh the list.' : 'Blood request not found.');
        }
        return res.json({ success: true, request });
    } catch (error) {
        console.error('Blood request decision error:', error.name);
        return fail(res, 500, 'Could not save the decision.');
    }
});
module.exports = router;
