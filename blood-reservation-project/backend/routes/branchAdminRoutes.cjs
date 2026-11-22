const express = require('express');
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const Donor = require('../../db/models/donor.cjs');
const Facility = require('../../db/models/facilities.cjs');
const Staff = require('../../db/models/staff.cjs');
const BloodRequest = require('../../db/models/BloodRequest.cjs');
const BloodUnits = require('../../db/models/bloodUnits.cjs');
const FulfillmentOperation = require('../../db/models/fulfillmentOperation.cjs');
const getRecordedReleaseHistory = require('../services/hospitalRequestHistory.cjs');
const { ensureIndexes } = require('../services/fulfillRequest.cjs');
const BloodReport = require('../../db/models/bloodReports.cjs');
const { recordUtilizationReport, WASTAGE_REASONS } = require('../services/utilizationReports.cjs');
const { createUtilizationExport, matchesExportView } = require('../services/utilizationExport.cjs');

const router = express.Router();
const managedRoles = ['staff', 'hospital'];

const requireRole = require('../middleware/requireRole.cjs');

const STAFF_ROLES = ['staff', 'hospital', 'branch-admin']
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function displayTime(value) {
  const [hour, minute] = value.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

async function getBranchContext(req, res) {
  const staff = await Staff.findOne({
    _id: req.user.id,
    role: {$in: STAFF_ROLES},
    isActive: true,
  }).select('facilityID firstName lastName email role').lean();

  if (!staff) {
    res.status(401).json({ error: 'Invalid staff account.' });
    return null;
  }
  if (!staff.facilityID) {
    res.status(409).json({ error: 'Your account is not assigned to a facility.' });
    return null;
  }

  const facility = await Facility.findById(staff.facilityID).lean();
  if (!facility) {
    res.status(409).json({ error: 'Your assigned facility could not be found.' });
    return null;
  }

  return { staff, facility };
}

function canReceiveBranchRequests({ facility }) {
  return ['bsf', 'prc_chapter', 'hospital_bsf'].includes(facility.facilityType);
}

function canManageHospitalRequests({ facility }) {
  return ['hospital', 'hospital_bsf'].includes(facility.facilityType);
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

async function getUtilizationReports(unitIds) {
  const reports = await BloodReport.find({
    bloodUnitID: { $in: unitIds },
  }).populate('reportedBy', 'firstName lastName').sort({ reportSource: 1, dateCreated: -1, _id: -1 }).lean();

  const latestByUnit = new Map();
  reports.forEach((report) => {
    const unitId = String(report.bloodUnitID);
    if (!latestByUnit.has(unitId)) {
      const reporterName = report.reportedBy
        ? `${report.reportedBy.firstName || ''} ${report.reportedBy.lastName || ''}`.trim()
        : '';
      latestByUnit.set(unitId, {
        reportID: report.reportID,
        status: report.status,
        description: report.description || '',
        dateCreated: report.dateCreated,
        reportedByName: reporterName,
        source: report.reportSource || 'Hospital',
        isAssumed: report.isAssumed === true,
        wastageReason: report.wastageReason || '',
        wastageReasonOther: report.wastageReasonOther || '',
      });
    }
  });
  return latestByUnit;
}

router.get('/dashboard', requireRole('branch-admin'), async (req, res) => {
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;

    const users = await Staff.find({
      facilityID: context.facility._id,
      role: { $in: managedRoles },
    }).select('firstName lastName email staffId role isActive createdAt').sort({ firstName: 1, lastName: 1 }).lean();
    
    const pendingBloodRequests = canReceiveBranchRequests(context)
      ? await BloodRequest.countDocuments({ receivingFacilityID: context.facility._id, requestStatus: 'Pending' })
      : 0;
    const totalBloodRequests = canReceiveBranchRequests(context)
      ? await BloodRequest.countDocuments({ receivingFacilityID: context.facility._id })
      : 0;

    const [openRequests, totalRequests] = canManageHospitalRequests(context)
      ? await Promise.all([
          BloodRequest.countDocuments({
            hospitalFacilityID: context.facility._id,
            requestStatus: { $in: ['Pending', 'Approved', 'Partially Fulfilled'] },
          }),
          BloodRequest.countDocuments({
            hospitalFacilityID: context.facility._id,
          }),
        ])
      : [0, 0];

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
        openRequests,
        totalRequests,
      },
      users: users.map(formatUser),
    });
  } catch (error) {
    console.error('Branch-admin dashboard failed:', error);
    return res.status(500).json({ error: 'Failed to load your branch dashboard.' });
  }
});

router.patch('/facility/operating-hours', requireRole('branch-admin'), async (req, res) => {
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    const { daysOpen, is24Hours, opensAt, closesAt } = req.body || {};
    if (!Array.isArray(daysOpen) || !daysOpen.length || daysOpen.some((day) => !WEEKDAYS.includes(day))) {
      return res.status(400).json({ error: 'Choose at least one valid opening day.' });
    }
    if (typeof is24Hours !== 'boolean') return res.status(400).json({ error: 'Choose whether the branch operates 24 hours.' });
    if (!is24Hours && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(opensAt || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(closesAt || ''))) {
      return res.status(400).json({ error: 'Enter a valid opening and closing time.' });
    }
    const sortedDays = WEEKDAYS.filter((day) => daysOpen.includes(day));
    const timeLabel = is24Hours ? 'Open 24 hours' : `${displayTime(opensAt)}–${displayTime(closesAt)}`;
    const hours = `${sortedDays.join(', ')} · ${timeLabel}`;
    const operatingHours = {
      daysOpen: sortedDays,
      is24Hours,
      opensAt: is24Hours ? '' : opensAt,
      closesAt: is24Hours ? '' : closesAt,
      source: 'branch_admin',
      updatedAt: new Date(),
    };
    await Facility.updateOne({ _id: context.facility._id }, { $set: { hours, operatingHours } }, { runValidators: true });
    return res.json({ success: true, hours, operatingHours, message: 'Opening days and hours saved.' });
  } catch (error) {
    console.error('Branch operating hours update failed:', error);
    return res.status(500).json({ error: 'Could not save the branch operating hours.' });
  }
});

router.get('/requests', async (req, res) => {
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (!canReceiveBranchRequests(context)) {
      return res.status(403).json({ error: 'Only BSF and PRC branches can view incoming requests.' });
    }

    const requests = await BloodRequest.find({ receivingFacilityID: context.facility._id })
      .populate('hospitalFacilityID', 'facilityName facilityType')
      .populate('requestedBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
    const releaseHistoryByRequest = await getRecordedReleaseHistory(
      requests.map((request) => request._id)
    );

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
    if (!canReceiveBranchRequests(context)) {
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
    if (!canManageHospitalRequests(context)) {
      return res.status(403).json({ error: 'Only hospital branches can view their submitted requests.' });
    }

    const requests = await BloodRequest.find({ hospitalFacilityID: context.facility._id })
      .populate('receivingFacilityID', 'facilityName facilityType typeLabel')
      .populate('reviewedBy', 'firstName lastName')
      .populate({
        path: 'requestedBy',
        select: 'firstName lastName staffId',
        transform: (account, id) => account ?? { _id: id },
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      facilityName: context.facility.facilityName,
      facilityId: String(context.facility._id),
      requests: requests.map((request) => ({
        ...request,
        requestedBy: request.requestedBy?._id ?? null,
            requesterStaffId: request.requestedBy?.staffId || '',
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
    if (!canManageHospitalRequests(context)) return res.status(403).json({ error: 'Only hospital branches can respond to method offers.' });
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
    if (!canReceiveBranchRequests(context)) return res.status(403).json({ error: 'Only BSF and PRC branches can update fulfillment progress.' });
    const current = await BloodRequest.findOne({
      _id: id, receivingFacilityID: context.facility._id,
      requestStatus: { $in: ['Allocated', 'Approved', 'Partially Fulfilled', 'Fulfilled'] },
    }).lean();
    if (!current) return res.status(404).json({ error: 'Active request not found for this branch.' });
    if (!['Partially Fulfilled', 'Fulfilled'].includes(current.requestStatus)) {
      return res.status(409).json({
        error: 'Release at least one blood bag before posting a pickup or delivery update.',
      });
    }
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
    if (!canReceiveBranchRequests(context)) return res.status(403).json({ error: 'Only BSF and PRC branches can update fulfillment details.' });
    const request = await BloodRequest.findOneAndUpdate(
      { _id: id, receivingFacilityID: context.facility._id, requestStatus: { $in: ['Allocated', 'Approved', 'Partially Fulfilled', 'Fulfilled'] } },
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
  if (!isValidUserId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid request id.' });
  }

  const unavailable = 'Only pending or allocated requests with no released units can be cancelled.';

  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (!canManageHospitalRequests(context)) {
      return res.status(403).json({ error: 'Only hospital branches can cancel their requests.' });
    }

    const scope = { _id: req.params.id, hospitalFacilityID: context.facility._id };
    const request = await BloodRequest.findOne({
      ...scope,
      requestStatus: { $in: ['Pending', 'Allocated'] },
    }).lean();

    if (!request) return res.status(409).json({ error: unavailable });

    let lock;
    if (request.requestStatus === 'Allocated') {
      await ensureIndexes();
      // Use the same per-request lock that BSF staff acquire before releasing bags.
      lock = await FulfillmentOperation.create({
        requestID: request._id,
        facilityID: request.receivingFacilityID,
        actorID: context.staff._id,
        receivingHospitalID: context.facility._id,
        bloodType: request.bloodType,
        component: request.component,
        units: request.units,
        expectedFulfilledUnits: 0,
      });
    }

    let updated;
    try {
      const hasReleasedUnits = lock && await BloodUnits.exists({
        requestID: request._id,
        status: 'Released',
      });

      if (!hasReleasedUnits) {
        updated = await BloodRequest.findOneAndUpdate(
          { ...scope, requestStatus: request.requestStatus },
          { $set: { requestStatus: 'Cancelled', fulfillmentStatus: null } },
          { returnDocument: 'after', runValidators: true },
        );
      }
    } finally {
      if (lock) await FulfillmentOperation.deleteOne({ _id: lock._id });
    }

    if (!updated) return res.status(409).json({ error: unavailable });
    return res.json({ success: true, request: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'The branch has started processing the release. Refresh to see the current request status.',
      });
    }
    console.error('Hospital request cancellation failed:', error);
    return res.status(500).json({ error: 'Failed to cancel the request.' });
  }
});

function utilizationRequestDetails(request, supplierName = request?.receivingFacilityID?.facilityName) {
  if (!request) return null;
  return {
    reference: request.requestID || String(request._id).slice(-8).toUpperCase(),
    supplierName,
    submittedAt: request.createdAt,
    fulfillmentMethod: request.confirmedFulfillmentMethod || request.fulfillmentMethod,
    fulfillmentStatus: request.fulfillmentStatus,
  };
}

async function getProviderUtilizationUnits(facility, unitIds) {
  const units = await BloodUnits.find({
    facilityID: facility._id,
    status: 'Released',
    ...(unitIds ? { _id: { $in: unitIds } } : {}),
  }).select('bloodUnitID bloodType component collectionDate expiryDate releasedAt requestID').populate({
    path: 'requestID',
    match: { receivingFacilityID: facility._id },
    select: 'requestID hospitalFacilityID createdAt fulfillmentMethod confirmedFulfillmentMethod fulfillmentStatus',
    populate: { path: 'hospitalFacilityID', select: 'facilityName' },
  }).sort({ releasedAt: -1 }).lean();
  const reportsByUnit = await getUtilizationReports(units.map(unit => unit._id));

  return units.map(unit => ({
    id: String(unit._id),
    bloodUnitID: unit.bloodUnitID,
    bloodType: unit.bloodType,
    component: unit.component,
    collectionDate: unit.collectionDate,
    expiryDate: unit.expiryDate,
    releasedAt: unit.releasedAt,
    hospitalName: unit.requestID?.hospitalFacilityID?.facilityName || 'Hospital not linked',
    request: utilizationRequestDetails(unit.requestID, facility.facilityName),
    report: reportsByUnit.get(String(unit._id)) || null,
  }));
}

router.get('/utilization', async (req, res) => {
  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    
    const workspace = req.query.workspace ??
        (canManageHospitalRequests(context) ? 'hospital' : 'bsf');

      if (
        (workspace !== 'hospital' && workspace !== 'bsf') ||
        (workspace === 'hospital' && !canManageHospitalRequests(context)) ||
        (workspace === 'bsf' && !canReceiveBranchRequests(context))
      ) {
        return res.status(403).json({
          error: 'Utilization is not available in this workspace for your facility.',
        });
      }

      if (workspace === 'hospital') {
      const requests = await BloodRequest.find({ hospitalFacilityID: context.facility._id })
        .select('requestID receivingFacilityID createdAt fulfillmentMethod confirmedFulfillmentMethod fulfillmentStatus')
        .populate('receivingFacilityID', 'facilityName')
        .lean();
      const requestDetailsById = new Map(requests.map(request => [
        String(request._id), utilizationRequestDetails(request),
      ]));
      const units = requests.length
        ? await BloodUnits.find({
          requestID: { $in: requests.map((request) => request._id) },
          status: 'Released',
        }).select('bloodUnitID bloodType component collectionDate expiryDate releasedAt requestID').sort({ releasedAt: -1 }).lean()
        : [];
      const reportsByUnit = await getUtilizationReports(units.map((unit) => unit._id));

      return res.json({
        mode: 'hospital',
        facilityName: context.facility.facilityName,
        wastageReasons: WASTAGE_REASONS,
        units: units.map((unit) => ({
          id: String(unit._id),
          bloodUnitID: unit.bloodUnitID,
          bloodType: unit.bloodType,
          component: unit.component,
          collectionDate: unit.collectionDate,
          expiryDate: unit.expiryDate,
          releasedAt: unit.releasedAt,
          request: requestDetailsById.get(String(unit.requestID)) || null,
          report: reportsByUnit.get(String(unit._id)) || null,
        })),
      });
    }

    return res.json({
      mode: 'provider',
      facilityName: context.facility.facilityName,
      wastageReasons: WASTAGE_REASONS,
      units: await getProviderUtilizationUnits(context.facility),
    });

    
  } catch (error) {
    console.error('Branch-admin utilization failed:', error);
    return res.status(500).json({ error: 'Failed to load utilization information.' });
  }
});

router.post('/utilization/export', async (req, res) => {
  const { format, view, unitIds } = req.body || {};
  if (!['pdf', 'xlsx'].includes(format) || !['reports', 'coverage', 'wastage'].includes(view)) {
    return res.status(400).json({ error: 'Choose PDF or Excel for a utilization report.' });
  }
  if (!Array.isArray(unitIds) || !unitIds.length || !unitIds.every(id =>
    typeof id === 'string' && mongoose.isObjectIdOrHexString(id))) {
    return res.status(400).json({ error: 'Choose valid blood units to export.' });
  }

  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (!canReceiveBranchRequests(context)) {
      return res.status(403).json({ error: 'Only blood service facilities can export these reports.' });
    }

    const selectedIds = [...new Set(unitIds.map(id => id.toLowerCase()))];
    const units = await getProviderUtilizationUnits(context.facility, selectedIds);
    const byId = new Map(units.filter(unit => matchesExportView(unit, view)).map(unit => [unit.id, unit]));
    if (byId.size !== selectedIds.length) {
      return res.status(409).json({ error: 'The selected records are no longer available in this view. Refresh the page and try again.' });
    }

    const { buffer, filename, contentType } = await createUtilizationExport({
      units: selectedIds.map(id => byId.get(id)), view, format, facilityName: context.facility.facilityName,
    });
    return res.set('Cache-Control', 'no-store').type(contentType).attachment(filename).send(buffer);
  } catch (error) {
    console.error('Utilization export failed:', error.message);
    return res.status(500).json({ error: 'Could not download the utilization report.' });
  }
});

router.post('/utilization/reports', async (req, res) => {
  const { bloodUnitId, status, wastageReason, wastageReasonOther } = req.body || {};
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
    if (!canManageHospitalRequests(context)) {
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

    const report = await recordUtilizationReport(unit._id, {
      status,
      description,
      wastageReason,
      wastageReasonOther,
      reportedBy: req.user.id,
    });
    if (!report) {
      return res.status(409).json({ error: 'A hospital utilization report already exists for this blood unit.' });
    }

    return res.status(201).json({ success: true, report });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    console.error('Hospital utilization report failed:', error);
    return res.status(500).json({ error: 'Failed to submit the utilization report.' });
  }
});

router.post('/users', requireRole('branch-admin'), async (req, res) => {
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
    if (context.staff.role !== 'branch-admin') {
      return res.status(403).json({ error: 'Only branch administrators can create staff accounts.' });
    }
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

    const staffId = await generateStaffId(Staff);

    const facilityType = context.facility.facilityType
    const userRole = facilityType === 'hospital' ? 'hospital' : 'staff'

    const [firstName, ...lastNameParts] = name.split(/\s+/);
    const temporaryPassword = crypto.randomBytes(18).toString('base64url');
    const user = await Staff.create({
      firstName,
      lastName: lastNameParts.join(' ') || firstName,
      email,
      mobile,
      staffId,
      role: userRole,
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

router.patch('/users/:id/status', requireRole('branch-admin'), async (req, res) => {
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

    if (context.role !== 'branch-admin') {
      return res.status(403).json({ error: 'Only branch administrators can create staff accounts.' });
    }
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

router.delete('/users/:id', requireRole('branch-admin'), async (req, res) => {
  const { id } = req.params;

  if (!isValidUserId(id)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  try {
    const context = await getBranchContext(req, res);
    if (!context) return;
    if (context.role !== 'branch-admin') {
      return res.status(403).json({ error: 'Only branch administrators can create staff accounts.' });
    }

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


