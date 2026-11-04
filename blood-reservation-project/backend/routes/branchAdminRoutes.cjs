const express = require('express');
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const Donor = require('../../db/models/donor.cjs');
const Facility = require('../../db/models/facilities.cjs');
const Staff = require('../../db/models/staff.cjs');
const BloodRequest = require('../../db/models/BloodRequest.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const BloodReport = require('../../db/models/bloodReports.cjs');
const Counter = require('../../db/models/counters.cjs');

const router = express.Router();
const managedRoles = ['staff', 'hospital'];

async function getBranchContext(req, res) {
  const branchAdmin = await Staff.findOne({
    _id: req.user.id,
    role: 'branch-admin',
    isActive: true,
  }).select('facilityID firstName lastName email').lean();

  if (!branchAdmin) {
    res.status(401).json({ error: 'Your branch administrator account is unavailable.' });
    return null;
  }
  if (!branchAdmin.facilityID) {
    res.status(409).json({ error: 'Your account is not assigned to a facility.' });
    return null;
  }

  const facility = await Facility.findById(branchAdmin.facilityID).lean();
  if (!facility) {
    res.status(409).json({ error: 'Your assigned facility could not be found.' });
    return null;
  }

  return { branchAdmin, facility };
}

function formatUser(user) {
  return {
    id: String(user._id),
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    email: user.email,
    staffId: user.staffId || '',
    role: user.role,
    status: user.isActive === false ? 'Deactivated' : 'Active',
    createdAt: user.createdAt,
  };
}

function isValidUserId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getLatestHospitalReports(unitIds) {
  const reports = await BloodReport.find({
    bloodUnitID: { $in: unitIds },
    reportSource: 'Hospital',
  }).populate('reportedBy', 'firstName lastName').sort({ dateCreated: -1 }).lean();

  const latestByUnit = new Map();
  reports.forEach((report) => {
    const unitId = String(report.bloodUnitID);
    if (!latestByUnit.has(unitId)) {
      const reporterName = report.reportedBy
        ? `${report.reportedBy.firstName || ''} ${report.reportedBy.lastName || ''}`.trim()
        : '';
      latestByUnit.set(unitId, {
        status: report.status,
        description: report.description || '',
        dateCreated: report.dateCreated,
        reportedByName: reporterName,
      });
    }
  });
  return latestByUnit;
}

router.get('/dashboard', async (req, res) => {
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;

    const users = await Staff.find({
      facilityID: context.facility._id,
      role: { $in: managedRoles },
    }).select('firstName lastName email staffId role isActive createdAt').sort({ firstName: 1, lastName: 1 }).lean();
    const pendingBloodRequests = ['bsf', 'prc_chapter'].includes(context.facility.facilityType)
      ? await BloodRequest.countDocuments({ receivingFacilityID: context.facility._id, requestStatus: 'Pending' })
      : 0;
    const totalBloodRequests = ['bsf', 'prc_chapter'].includes(context.facility.facilityType)
      ? await BloodRequest.countDocuments({ receivingFacilityID: context.facility._id })
      : 0;

    return res.json({
      facility: {
        id: String(context.facility._id),
        code: context.facility.facilityID,
        name: context.facility.facilityName,
        facilityType: context.facility.facilityType,
        typeLabel: context.facility.typeLabel,
        address: context.facility.address,
        isActive: context.facility.isActive !== false,
      },
      summary: {
        totalUsers: users.length,
        activeUsers: users.filter((user) => user.isActive !== false).length,
        deactivatedUsers: users.filter((user) => user.isActive === false).length,
        pendingBloodRequests,
        totalBloodRequests,
      },
      users: users.map(formatUser),
    });
  } catch (error) {
    console.error('Branch-admin dashboard failed:', error);
    return res.status(500).json({ error: 'Failed to load your branch dashboard.' });
  }
});

router.get('/requests', async (req, res) => {
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (!['bsf', 'prc_chapter'].includes(context.facility.facilityType)) {
      return res.status(403).json({ error: 'Only BSF and PRC branches can view incoming requests.' });
    }

    const requests = await BloodRequest.find({ receivingFacilityID: context.facility._id })
      .populate('hospitalFacilityID', 'facilityName facilityType')
      .populate('requestedBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      facilityName: context.facility.facilityName,
      facilityId: String(context.facility._id),
      requests: requests.map((request) => ({
        ...request,
        id: String(request._id),
        hospitalName: request.hospitalFacilityID?.facilityName || request.hospital || 'Hospital',
        requesterName: request.requestedBy
          ? `${request.requestedBy.firstName || ''} ${request.requestedBy.lastName || ''}`.trim()
          : '',
        reviewerName: request.reviewedBy
          ? `${request.reviewedBy.firstName || ''} ${request.reviewedBy.lastName || ''}`.trim()
          : '',
      })),
    });
  } catch (error) {
    console.error('Branch-admin requests failed:', error);
    return res.status(500).json({ error: 'Failed to load requests for this branch.' });
  }
});

router.patch('/requests/:id/decision', async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body || {};
  const decisionReason = String(req.body?.reason || '').trim();
  const confirmedFulfillmentMethod = String(req.body?.fulfillmentMethod || '').trim();
  const fulfillmentMethodNote = String(req.body?.fulfillmentMethodNote || '').trim();

  if (!isValidUserId(id)) return res.status(400).json({ error: 'Invalid request id.' });
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'Choose whether to accept or decline this request.' });
  }
  if (decision === 'reject' && !decisionReason) {
    return res.status(400).json({ error: 'A reason is required when declining a request.' });
  }
  if (decisionReason.length > 1500) {
    return res.status(400).json({ error: 'The reason must be 1,500 characters or fewer.' });
  }
  if (decision === 'approve' && !['Pickup', 'Delivery'].includes(confirmedFulfillmentMethod)) {
    return res.status(400).json({ error: 'Confirm whether this request will be handled by pickup or delivery.' });
  }
  if (decision === 'approve' && fulfillmentMethodNote.length > 1000) {
    return res.status(400).json({ error: 'The pickup or delivery note must be 1,000 characters or fewer.' });
  }

  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (!['bsf', 'prc_chapter'].includes(context.facility.facilityType)) {
      return res.status(403).json({ error: 'Only BSF and PRC branches can decide incoming requests.' });
    }

    const pendingRequest = await BloodRequest.findOne({
      _id: id, receivingFacilityID: context.facility._id, requestStatus: 'Pending',
    }).select('fulfillmentMethod').lean();
    if (!pendingRequest) {
      const exists = await BloodRequest.exists({ _id: id, receivingFacilityID: context.facility._id });
      return res.status(exists ? 409 : 404).json({ error: exists ? 'This request has already been reviewed.' : 'Request not found for this branch.' });
    }
    if (decision === 'approve' && confirmedFulfillmentMethod !== pendingRequest.fulfillmentMethod && !fulfillmentMethodNote) {
      return res.status(400).json({ error: 'Explain why the requested pickup or delivery option cannot be provided.' });
    }

    const isAlternativeOffer = decision === 'approve' && confirmedFulfillmentMethod !== pendingRequest.fulfillmentMethod;
    const initialFulfillmentStatus = 'Preparing';
    const decisionUpdate = {
      requestStatus: decision === 'approve'
        ? (isAlternativeOffer ? 'Awaiting Hospital Confirmation' : 'Approved')
        : 'Rejected',
      decisionReason: decision === 'reject' ? decisionReason : '',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    };
    if (decision === 'approve') {
      decisionUpdate.confirmedFulfillmentMethod = confirmedFulfillmentMethod;
      decisionUpdate.fulfillmentMethodNote = isAlternativeOffer ? fulfillmentMethodNote : '';
      decisionUpdate.fulfillmentStatus = isAlternativeOffer ? null : initialFulfillmentStatus;
    }
    const updated = await BloodRequest.findOneAndUpdate(
      { _id: id, receivingFacilityID: context.facility._id, requestStatus: 'Pending' },
      {
        $set: decisionUpdate,
        ...(!isAlternativeOffer && decision === 'approve' ? {
        $push: { fulfillmentEvents: { status: initialFulfillmentStatus, note: 'Branch accepted the request and confirmed the fulfillment method.', updatedBy: req.user.id, updatedAt: new Date() } },
        } : {}),
      },
      { new: true, runValidators: true },
    ).populate('hospitalFacilityID', 'facilityName facilityType')
      .populate('receivingFacilityID', 'facilityName facilityType')
      .populate('reviewedBy', 'firstName lastName');

    if (!updated) {
      const exists = await BloodRequest.exists({ _id: id, receivingFacilityID: context.facility._id });
      return res.status(exists ? 409 : 404).json({
        error: exists ? 'This request has already been reviewed.' : 'Request not found for this branch.',
      });
    }

    return res.json({ success: true, request: updated });
  } catch (error) {
    console.error('Branch request decision failed:', error);
    return res.status(500).json({ error: 'Failed to update the request.' });
  }
});

router.get('/my-requests', async (req, res) => {
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (context.facility.facilityType !== 'hospital') {
      return res.status(403).json({ error: 'Only hospital branches can view their submitted requests.' });
    }

    const requests = await BloodRequest.find({ hospitalFacilityID: context.facility._id })
      .populate('receivingFacilityID', 'facilityName facilityType typeLabel')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      facilityName: context.facility.facilityName,
      facilityId: String(context.facility._id),
      requests: requests.map((request) => ({
        ...request,
        id: String(request._id),
        requestedFacilityName: request.receivingFacilityID?.facilityName || 'Branch unavailable',
        reviewerName: request.reviewedBy
          ? `${request.reviewedBy.firstName || ''} ${request.reviewedBy.lastName || ''}`.trim()
          : '',
      })),
    });
  } catch (error) {
    console.error('Hospital branch requests failed:', error);
    return res.status(500).json({ error: 'Failed to load your blood requests.' });
  }
});

router.patch('/my-requests/:id/method-response', async (req, res) => {
  const accepted = req.body?.accepted;
  if (typeof accepted !== 'boolean') return res.status(400).json({ error: 'Choose whether to accept the offered method.' });
  if (!isValidUserId(req.params.id)) return res.status(400).json({ error: 'Invalid request id.' });
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (context.facility.facilityType !== 'hospital') return res.status(403).json({ error: 'Only hospital branches can respond to method offers.' });
    const update = accepted
      ? { requestStatus: 'Approved', fulfillmentStatus: 'Preparing' }
      : { requestStatus: 'Cancelled', fulfillmentStatus: null };
    const updated = await BloodRequest.findOneAndUpdate(
      { _id: req.params.id, hospitalFacilityID: context.facility._id, requestStatus: 'Awaiting Hospital Confirmation' },
      { $set: update, ...(accepted ? { $push: { fulfillmentEvents: { status: 'Preparing', note: 'Hospital accepted the branch’s alternative fulfillment method.', updatedBy: req.user.id, updatedAt: new Date() } } } : {}) },
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(409).json({ error: 'This request is no longer awaiting your response.' });
    return res.json({ success: true, request: updated });
  } catch (error) {
    console.error('Hospital method response failed:', error);
    return res.status(500).json({ error: 'Failed to record your response.' });
  }
});

router.patch('/requests/:id/progress', async (req, res) => {
  const { id } = req.params;
  const status = String(req.body?.status || '').trim();
  const note = String(req.body?.note || '').trim();
  if (!isValidUserId(id)) return res.status(400).json({ error: 'Invalid request id.' });
  if (note.length > 1000) return res.status(400).json({ error: 'Progress note must be 1,000 characters or fewer.' });
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (!['bsf', 'prc_chapter'].includes(context.facility.facilityType)) return res.status(403).json({ error: 'Only BSF and PRC branches can update fulfillment progress.' });
    const current = await BloodRequest.findOne({
      _id: id, receivingFacilityID: context.facility._id,
      requestStatus: { $in: ['Approved', 'Partially Fulfilled', 'Fulfilled'] },
    }).lean();
    if (!current) return res.status(404).json({ error: 'Active approved request not found for this branch.' });
    const deliverySteps = ['Preparing', 'On the Way', 'Delivered'];
    const pickupSteps = ['Preparing', 'Ready for Pickup', 'Picked Up'];
    const steps = current.confirmedFulfillmentMethod === 'Delivery' ? deliverySteps : pickupSteps;
    const previous = current.fulfillmentStatus || 'Preparing';
    if (!steps.includes(status) || steps.indexOf(status) !== steps.indexOf(previous) + 1) {
      return res.status(400).json({ error: `Next valid progress update: ${steps[steps.indexOf(previous) + 1] || 'none'}.` });
    }
    const isComplete = ['Delivered', 'Picked Up'].includes(status);
    const updated = await BloodRequest.findOneAndUpdate(
      { _id: id, receivingFacilityID: context.facility._id, requestStatus: current.requestStatus, fulfillmentStatus: current.fulfillmentStatus ?? null },
      {
        $set: {
          fulfillmentStatus: status,
          ...(isComplete && Number(current.fulfilledUnits || 0) >= Number(current.units || 0) ? { requestStatus: 'Fulfilled', fulfilledAt: current.fulfilledAt || new Date() } : {}),
        },
        $push: { fulfillmentEvents: { status, note, updatedBy: req.user.id, updatedAt: new Date() } },
      },
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(409).json({ error: 'Progress changed while saving. Refresh and try again.' });
    return res.json({ success: true, request: updated });
  } catch (error) {
    console.error('Branch fulfillment progress failed:', error);
    return res.status(500).json({ error: 'Failed to update fulfillment progress.' });
  }
});

router.patch('/requests/:id/fulfillment-details', async (req, res) => {
  const { id } = req.params;
  if (!isValidUserId(id)) return res.status(400).json({ error: 'Invalid request id.' });
  const fields = ['pickupLocation', 'staffContactName'];
  const details = {};
  for (const field of fields) {
    const value = req.body?.[field] == null ? '' : String(req.body[field]).trim();
    const max = field === 'pickupLocation' ? 300 : 150;
    if (value.length > max) return res.status(400).json({ error: `${field} must be ${max} characters or fewer.` });
    details[field] = value;
  }
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (!['bsf', 'prc_chapter'].includes(context.facility.facilityType)) return res.status(403).json({ error: 'Only BSF and PRC branches can update fulfillment details.' });
    const request = await BloodRequest.findOneAndUpdate(
      { _id: id, receivingFacilityID: context.facility._id, requestStatus: { $in: ['Approved', 'Partially Fulfilled', 'Fulfilled'] } },
      { $set: Object.fromEntries(fields.map((field) => [`fulfillmentDetails.${field}`, details[field]])) },
      { new: true, runValidators: true },
    );
    if (!request) return res.status(404).json({ error: 'Active approved request not found for this branch.' });
    return res.json({ success: true, fulfillmentDetails: request.fulfillmentDetails });
  } catch (error) {
    console.error('Branch fulfillment details update failed:', error);
    return res.status(500).json({ error: 'Failed to save fulfillment details.' });
  }
});

router.patch('/my-requests/:id/cancel', async (req, res) => {
  if (!isValidUserId(req.params.id)) return res.status(400).json({ error: 'Invalid request id.' });
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (context.facility.facilityType !== 'hospital') return res.status(403).json({ error: 'Only hospital branches can cancel their requests.' });
    const updated = await BloodRequest.findOneAndUpdate(
      { _id: req.params.id, hospitalFacilityID: context.facility._id, requestStatus: 'Pending' },
      { $set: { requestStatus: 'Cancelled' } },
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(409).json({ error: 'Only pending requests can be cancelled.' });
    return res.json({ success: true, request: updated });
  } catch (error) {
    console.error('Hospital request cancellation failed:', error);
    return res.status(500).json({ error: 'Failed to cancel the request.' });
  }
});

router.get('/utilization', async (req, res) => {
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;

    if (context.facility.facilityType === 'hospital') {
      const requests = await BloodRequest.find({ hospitalFacilityID: context.facility._id })
        .select('_id').lean();
      const units = requests.length
        ? await BloodUnits.find({
          requestID: { $in: requests.map((request) => request._id) },
          status: 'Released',
        }).select('bloodUnitID bloodType component releasedAt requestID').sort({ releasedAt: -1 }).lean()
        : [];
      const reportsByUnit = await getLatestHospitalReports(units.map((unit) => unit._id));

      return res.json({
        mode: 'hospital',
        facilityName: context.facility.facilityName,
        units: units.map((unit) => ({
          id: String(unit._id),
          bloodUnitID: unit.bloodUnitID,
          bloodType: unit.bloodType,
          component: unit.component,
          releasedAt: unit.releasedAt,
          report: reportsByUnit.get(String(unit._id)) || null,
        })),
      });
    }

    if (!['bsf', 'prc_chapter'].includes(context.facility.facilityType)) {
      return res.status(409).json({ error: 'Utilization is not available for this facility type.' });
    }

    const units = await BloodUnits.find({
      facilityID: context.facility.facilityID,
      status: 'Released',
    }).select('bloodUnitID bloodType component releasedAt requestID').populate({
      path: 'requestID',
      select: 'hospitalFacilityID',
      populate: { path: 'hospitalFacilityID', select: 'facilityName' },
    }).sort({ releasedAt: -1 }).lean();
    const reportsByUnit = await getLatestHospitalReports(units.map((unit) => unit._id));

    return res.json({
      mode: 'provider',
      facilityName: context.facility.facilityName,
      units: units.map((unit) => ({
        id: String(unit._id),
        bloodUnitID: unit.bloodUnitID,
        bloodType: unit.bloodType,
        component: unit.component,
        releasedAt: unit.releasedAt,
        hospitalName: unit.requestID?.hospitalFacilityID?.facilityName || 'Hospital not linked',
        report: reportsByUnit.get(String(unit._id)) || null,
      })),
    });
  } catch (error) {
    console.error('Branch-admin utilization failed:', error);
    return res.status(500).json({ error: 'Failed to load utilization information.' });
  }
});

router.post('/utilization/reports', async (req, res) => {
  const { bloodUnitId, status } = req.body || {};
  const description = String(req.body?.description || '').trim();
  const allowedStatuses = ['Used', 'Wasted', 'Expired', 'Unused'];

  if (!isValidUserId(bloodUnitId)) {
    return res.status(400).json({ error: 'Choose a valid released blood unit.' });
  }
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Choose a valid utilization status.' });
  }

  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (context.facility.facilityType !== 'hospital') {
      return res.status(403).json({ error: 'Only hospital facilities can submit utilization reports.' });
    }

    const requests = await BloodRequest.find({ hospitalFacilityID: context.facility._id })
      .select('_id').lean();
    const unit = await BloodUnits.findOne({
      _id: bloodUnitId,
      requestID: { $in: requests.map((request) => request._id) },
      status: 'Released',
    }).lean();
    if (!unit) {
      return res.status(404).json({ error: 'That released blood unit is not assigned to this hospital.' });
    }

    const existingReport = await BloodReport.exists({
      bloodUnitID: unit._id,
      reportSource: 'Hospital',
    });
    if (existingReport) {
      return res.status(409).json({ error: 'A utilization report already exists for this blood unit.' });
    }

    const counter = await Counter.findOneAndUpdate(
      { _id: 'reportID' },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    const report = await BloodReport.create({
      reportID: `R${String(counter.sequence).padStart(8, '0')}`,
      bloodUnitID: unit._id,
      status,
      description,
      reportSource: 'Hospital',
      reportedBy: req.user.id,
    });

    return res.status(201).json({ success: true, report });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A utilization report already exists for this blood unit.' });
    }
    console.error('Hospital utilization report failed:', error);
    return res.status(500).json({ error: 'Failed to submit the utilization report.' });
  }
});

router.post('/users', async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const mobile = String(body.mobile || '').trim();
  const requestedStaffId = String(body.staffId || '').trim();

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (context.facility.isActive === false) {
      return res.status(409).json({ error: 'Users cannot be created for an inactive facility.' });
    }

    const duplicate = await Promise.all([
      Staff.exists({ email }),
      Donor.exists({ email }),
    ]).then((results) => results.some(Boolean));
    if (duplicate) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    let staffId = requestedStaffId;
    if (staffId && await Staff.exists({ staffId })) {
      return res.status(409).json({ error: 'That Staff ID is already assigned.' });
    }
    while (!staffId || await Staff.exists({ staffId })) {
      staffId = `STF-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    }

    const [firstName, ...lastNameParts] = name.split(/\s+/);
    const temporaryPassword = crypto.randomBytes(18).toString('base64url');
    const user = await Staff.create({
      firstName,
      lastName: lastNameParts.join(' ') || firstName,
      email,
      mobile,
      staffId,
      role: 'staff',
      facilityID: context.facility._id,
      isActive: true,
      password: await bcrypt.hash(temporaryPassword, 10),
    });

    return res.status(201).json({
      success: true,
      message: 'Branch user created. Share the temporary password securely.',
      user: formatUser(user),
      staffId,
      temporaryPassword,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Branch user creation failed:', error);
    return res.status(500).json({ error: 'Failed to create the branch user.' });
  }
});

router.patch('/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!isValidUserId(id)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }
  if (!['Active', 'Deactivated'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Active or Deactivated.' });
  }

  try {
    const context = await getBranchContext(req, res);
    if (!context) return;

    const user = await Staff.findOneAndUpdate(
      {
        _id: id,
        facilityID: context.facility._id,
        role: { $in: managedRoles },
      },
      { isActive: status === 'Active' },
      { new: true, runValidators: true },
    ).select('firstName lastName email staffId role isActive createdAt').lean();

    if (!user) {
      return res.status(404).json({ error: 'Branch user not found.' });
    }
    return res.json({ success: true, user: formatUser(user) });
  } catch (error) {
    console.error('Branch user status update failed:', error);
    return res.status(500).json({ error: 'Failed to update the branch user.' });
  }
});

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidUserId(id)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  try {
    const context = await getBranchContext(req, res);
    if (!context) return;

    const deleted = await Staff.findOneAndDelete({
      _id: id,
      facilityID: context.facility._id,
      role: { $in: managedRoles },
    }).select('email').lean();

    if (!deleted) {
      return res.status(404).json({ error: 'Branch user not found.' });
    }
    return res.json({ success: true, message: 'Branch user deleted.' });
  } catch (error) {
    console.error('Branch user deletion failed:', error);
    return res.status(500).json({ error: 'Failed to delete the branch user.' });
  }
});

module.exports = router;


