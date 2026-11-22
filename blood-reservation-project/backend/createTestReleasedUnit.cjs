const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const mongoose = require('mongoose');
const BloodUnits = require('../db/models/bloodUnits.cjs');
const BloodRequest = require('../db/models/BloodRequest.cjs');

async function main() {
  const [sourceUnitID, ...extra] = process.argv.slice(2);
  if (!sourceUnitID?.trim() || extra.length) {
    throw new Error('Usage: node backend/createTestReleasedUnit.cjs <existing-released-bag-ID>');
  }

  const uri = process.env.MONGODB_LINK?.trim();
  const localMongo = /^mongodb:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|\?|$)/i;
  if (!uri || !localMongo.test(uri) || process.env.NODE_ENV === 'production') {
    throw new Error('Set MONGODB_LINK to your local test MongoDB database before running this script.');
  }

  try {
    await mongoose.connect(uri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
    const sourceUnit = await BloodUnits.findOne({
      bloodUnitID: sourceUnitID.trim(),
      status: 'Released',
    }).select('requestID bloodType component').lean();
    if (!sourceUnit?.requestID) {
      throw new Error('Use an existing released Blood Unit ID that is linked to a hospital request.');
    }

    const sourceRequest = await BloodRequest.findById(sourceUnit.requestID)
      .select('hospitalFacilityID receivingFacilityID').lean();
    if (!sourceRequest?.hospitalFacilityID || !sourceRequest.receivingFacilityID) {
      throw new Error('The source request needs both a hospital and an issuing facility.');
    }

    const now = new Date();
    const requestId = new mongoose.Types.ObjectId();
    const unitId = new mongoose.Types.ObjectId();
    const request = new BloodRequest({
      _id: requestId,
      requestID: `BR-DEMO-${requestId}`,
      firstName: 'Utilization Demo',
      lastName: 'Test Patient',
      hospitalFacilityID: sourceRequest.hospitalFacilityID,
      receivingFacilityID: sourceRequest.receivingFacilityID,
      bloodType: sourceUnit.bloodType,
      component: sourceUnit.component,
      units: 1,
      urgency: 'routine',
      requestStatus: 'Fulfilled',
      fulfilledUnits: 1,
      fulfilledAt: now,
      fulfillmentMethod: 'Pickup',
      confirmedFulfillmentMethod: 'Pickup',
      fulfillmentStatus: 'Picked Up',
      fulfillmentEvents: [{ status: 'Picked Up', updatedAt: now, note: 'Local utilization demo' }],
    });

    const unit = new BloodUnits({
      _id: unitId,
      bloodUnitID: `BU-DEMO-${unitId}`,
      requestID: requestId,
      facilityID: String(sourceRequest.receivingFacilityID),
      bloodType: sourceUnit.bloodType,
      component: sourceUnit.component,
      status: 'Released',
      collectionDate: now,
      expiryDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      releasedAt: now,
    });

    await Promise.all([request.validate(), unit.validate()]);
    await request.save();
    try {
      await unit.save();
    } catch (error) {
      const savedUnit = await BloodUnits.exists({ _id: unitId, requestID: requestId });
      if (!savedUnit) {
        await BloodRequest.deleteOne({ _id: requestId, requestID: request.requestID });
        throw error;
      }
    }

    console.log(`Created released test bag ${unit.bloodUnitID} in ${mongoose.connection.name}.`);
    console.log('Run this to generate the preview report:');
    console.log(`node backend/createTestAutomaticReport.cjs ${unit.bloodUnitID}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
