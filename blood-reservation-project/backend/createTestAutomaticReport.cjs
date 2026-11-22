const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const mongoose = require('mongoose');
const BloodUnits = require('../db/models/bloodUnits.cjs');
const BloodRequest = require('../db/models/BloodRequest.cjs');
const { recordUtilizationReport } = require('./services/utilizationReports.cjs');

async function main() {
  const [bloodUnitID, ...extra] = process.argv.slice(2);
  if (!bloodUnitID?.trim() || extra.length) {
    throw new Error('Usage: node backend/createTestAutomaticReport.cjs <released-test-bag-ID>');
  }

  const uri = process.env.MONGODB_LINK?.trim();
  const localMongo = /^mongodb:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|\?|$)/i;
  if (!uri || !localMongo.test(uri) || process.env.NODE_ENV === 'production') {
    throw new Error('Set MONGODB_LINK to your local test MongoDB database before running this script.');
  }

  try {
    await mongoose.connect(uri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
    const unit = await BloodUnits.findOne({ bloodUnitID: bloodUnitID.trim(), status: 'Released' })
      .select('bloodUnitID requestID').lean();
    if (!unit?.requestID) {
      throw new Error('No matching released blood unit linked to a request was found. Use the Blood Unit ID from your test release.');
    }

    const request = await BloodRequest.findById(unit.requestID)
      .select('hospitalFacilityID receivingFacilityID').lean();
    if (!request?.hospitalFacilityID || !request.receivingFacilityID) {
      throw new Error('The unit must be linked to a hospital request with an issuing facility.');
    }

    const report = await recordUtilizationReport(unit._id, {
      status: 'Used',
      description: 'Test preview of a system-generated utilization report.',
      isAssumed: true,
    });

    if (!report) {
      console.log('This unit already has a report. Use a released test unit without a report.');
      return;
    }

    console.log(`Created ${report.reportID} for ${unit.bloodUnitID} in ${mongoose.connection.name}.`);
    console.log('Outcome: Assumed used | Source: System generated');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
