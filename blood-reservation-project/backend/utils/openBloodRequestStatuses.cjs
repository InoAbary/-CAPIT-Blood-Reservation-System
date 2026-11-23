const OPEN_BLOOD_REQUEST_STATUSES = ['Allocated'];

const REQUESTS_NEEDING_ACTION = {
  $or: [
    { requestStatus: { $in: OPEN_BLOOD_REQUEST_STATUSES } },
    { requestStatus: { $in: ['Partially Fulfilled', 'Fulfilled'] },
      fulfillmentStatus: { $in: ['Preparing', 'Ready for Pickup', 'On the Way'] } },
  ],
};

module.exports = { OPEN_BLOOD_REQUEST_STATUSES, REQUESTS_NEEDING_ACTION };