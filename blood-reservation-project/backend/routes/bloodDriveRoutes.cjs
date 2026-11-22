const router = require('express').Router();
const { isObjectIdOrHexString } = require('mongoose');
const BloodDrive = require('../../db/models/bloodDrive.cjs');
const Staff = require('../../db/models/staff.cjs');
const Facility = require('../../db/models/facilities.cjs');
const requireStaff = require('../middleware/requireStaff.cjs');
const { BLOOD_SERVICE_FACILITY_TYPES } = require('../utils/facilityTypes.cjs');

const fields = 'hostName title venue address details startsAt endsAt lat lon createdAt updatedAt';

function serialize(drive, now) {
  const { facilityID, ...fields } = drive;
  return { ...fields, hostName: facilityID?.facilityName || drive.hostName || null,
    status: drive.endsAt <= now ? 'Past' : drive.startsAt <= now ? 'Ongoing' : 'Upcoming' };
}

router.get('/', async (req, res, next) => {
  try {
    const now = new Date();
    const filter = req.query.includePast === '1' ? {} : { endsAt: { $gt: now } };
    const drives = await BloodDrive.find(filter).select(fields + ' facilityID')
      .populate('facilityID', 'facilityName').sort({ startsAt: 1 }).lean();
    res.set('Cache-Control', 'no-store').json({ drives: drives.map(drive => serialize(drive, now)) });
  } catch (error) {
    next(error);
  }
});

router.use('/manage', requireStaff, async (req, res, next) => {
  try {
    const account = await Staff.findOne({ _id: req.user.id, isActive: true })
      .select('facilityID role').lean();
    if (!account || !['staff', 'branch-admin'].includes(account.role) &&
      !(account.role === 'hospital' && account.facilityID)) {
      return res.status(403).json({ error: 'An active blood service facility account is required.' });
    }
    const facility = await Facility.findOne({
      _id: account.facilityID, isActive: { $ne: false },
      facilityType: { $in: account.role === 'hospital' ? ['hospital_bsf'] : BLOOD_SERVICE_FACILITY_TYPES },
    }).select('lat lon facilityName address').lean();
    if (!facility) return res.status(403).json({ error: 'Your account needs a blood service facility assignment.' });
    req.driveFacility = facility;
    next();
  } catch (error) {
    next(error);
  }
});

router.get('/manage', async (req, res, next) => {
  try {
    const now = new Date();
    const drives = await BloodDrive.find({ facilityID: req.driveFacility._id })
      .select(fields + ' version').sort({ startsAt: -1 }).lean();
    res.set('Cache-Control', 'no-store').json({
      drives: drives.map(drive => serialize({ ...drive, facilityID: req.driveFacility }, now)), location: req.driveFacility,
    });
  } catch (error) {
    next(error);
  }
});

async function saveDrive(req, res, next) {
  const { title, venue, address, details, startsAt, endsAt, lat, lon, version } = req.body || {};
  const now = new Date();
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (typeof startsAt !== 'string' || typeof endsAt !== 'string' || !(end > start)) {
    return res.status(400).json({ error: 'End date and time must be after start date and time.' });
  }
  if (end <= now) return res.status(400).json({ error: 'The end date and time must be in the future.' });
  if (![title, venue, address].every(text => typeof text === 'string' && text.trim()) ||
    title.length > 120 || venue.length > 160 || address.length > 300 ||
    typeof details !== 'string' || details.length > 1500 ||
    typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
    typeof lon !== 'number' || !Number.isFinite(lon) || Math.abs(lon) > 180) {
    return res.status(400).json({ error: 'Enter the drive details and choose valid venue coordinates.' });
  }
  const values = {
    title, venue, address, details, startsAt: start, endsAt: end, lat, lon,
    hostName: req.driveFacility.facilityName,
  };
  const facilityID = req.driveFacility._id;

  try {
    if (!req.params.id) {
      const created = await BloodDrive.create({ ...values, facilityID });
      return res.status(201).json({ drive: serialize({ ...created.toObject(), facilityID: req.driveFacility }, now) });
    }
    if (!isObjectIdOrHexString(req.params.id) || !Number.isSafeInteger(version) || version < 0) {
      return res.status(400).json({ error: 'Invalid drive or edit version.' });
    }
    const drive = await BloodDrive.findOneAndUpdate({
      _id: req.params.id, facilityID, version, endsAt: { $gt: now },
    }, { $set: values, $inc: { version: 1 } }, { returnDocument: 'after', runValidators: true }).select(fields + ' version').lean();
    if (!drive) return res.status(409).json({ error: 'This drive changed or ended. Refresh the list and try again.' });
    res.json({ drive: serialize({ ...drive, facilityID: req.driveFacility }, now) });
  } catch (error) {
    next(error);
  }
}

router.post('/manage', saveDrive);
router.patch('/manage/:id', saveDrive);

router.use((error, req, res, next) => {
  console.error('Blood drives failed:', error.message);
  res.status(500).json({ error: 'Could not load or save blood drives.' });
});

module.exports = router;
