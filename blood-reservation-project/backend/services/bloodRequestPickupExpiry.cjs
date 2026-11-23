const BloodRequest = require('../../db/models/BloodRequest.cjs');

const PICKUP_WINDOW_MS = 6 * 60 * 60 * 1000;
const PICKUP_EXPIRATION_REASON = 'Pickup was not recorded within six hours of the request being marked Ready for Pickup.';
const waitingForPickup = {
  requestStatus: { $in: ['Partially Fulfilled', 'Fulfilled'] },
  fulfillmentStatus: 'Ready for Pickup',
  $or: [
    { confirmedFulfillmentMethod: 'Pickup' },
    { confirmedFulfillmentMethod: null, fulfillmentMethod: 'Pickup' },
  ],
};

function pickupDeadline(request) {
  if (request.pickupExpiresAt) return request.pickupExpiresAt;
  const ready = request.fulfillmentEvents?.findLast(event => event.status === 'Ready for Pickup');
  return ready?.updatedAt ? new Date(ready.updatedAt.getTime() + PICKUP_WINDOW_MS) : null;
}

async function backfillPickupDeadlines() {
  await BloodRequest.updateMany(
    { ...waitingForPickup, pickupExpiresAt: null,
      fulfillmentEvents: { $elemMatch: { status: 'Ready for Pickup', updatedAt: { $type: 'date' } } } },
    [{
      $set: {
        pickupExpiresAt: {
          $add: [{
            $max: {
              $map: {
                input: { $filter: {
                  input: '$fulfillmentEvents',
                  as: 'event',
                  cond: { $and: [
                    { $eq: ['$$event.status', 'Ready for Pickup'] },
                    { $eq: [{ $type: '$$event.updatedAt' }, 'date'] },
                  ] },
                } },
                as: 'event',
                in: '$$event.updatedAt',
              },
            },
          }, PICKUP_WINDOW_MS],
        },
      },
    }],
    { timestamps: false, updatePipeline: true },
  );
}

function expireReadyPickups(now = new Date()) {
  return BloodRequest.updateMany(
    { ...waitingForPickup, pickupExpiresAt: { $lte: now } },
    {
      $set: { requestStatus: 'Cancelled', fulfillmentStatus: null },
      $push: { fulfillmentEvents: { status: 'Cancelled', note: PICKUP_EXPIRATION_REASON, updatedAt: now } },
    },
    { runValidators: true },
  );
}

function startBloodRequestPickupExpiry() {
  let running = false;
  let backfilled = false;
  async function check() {
    if (running) return;
    running = true;
    try {
      if (!backfilled) {
        await backfillPickupDeadlines();
        backfilled = true;
      }
      await expireReadyPickups();
    } catch (error) {
      console.error('Blood request pickup expiration failed:', error.message);
    } finally {
      running = false;
    }
  }

  void check();
  const timer = setInterval(check, 30_000);
  timer.unref();
}

module.exports = { PICKUP_WINDOW_MS, pickupDeadline, expireReadyPickups, startBloodRequestPickupExpiry };