// Run only after stopping ALL API server processes for this database.
require('dotenv').config();
const mongoose = require('mongoose');
const Operation = require('../../db/models/fulfillmentOperation.cjs');
const { ensureIndexes, finishOperation } = require('../services/fulfillRequest.cjs');
async function main() {
    if (!process.argv.includes('--backend-stopped')) throw new Error('Stop all backend processes, then pass --backend-stopped. Recovery must never run alongside an active release worker.');
    if (!process.env.MONGODB_LINK) throw new Error('MONGODB_LINK is missing. Run from the backend folder containing your .env.');
    await mongoose.connect(process.env.MONGODB_LINK);
    await ensureIndexes();
    const operations = await Operation.find({ active: true }).sort({ createdAt: 1 }).lean();
    let failures = 0;
    for (const operation of operations) {
        try {
            const result = await finishOperation(operation);
            console.log(`Operation ${operation._id}: ${result ? `${result.releasedCount} released units reconciled` : 'no units released; request unlocked'}`);
        } catch (error) { failures++; console.error(`Operation ${operation._id}: ${error.message}`); }
    }
    if (!operations.length) console.log('No interrupted fulfillment operations found.');
    if (failures) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
