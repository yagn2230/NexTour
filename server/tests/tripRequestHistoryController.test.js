const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { test } = require("node:test");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const {
  getMyTripRequests,
  cancelMyTripRequest,
} = require("../controllers/tripRequestController");

const invoke = (handler, req) => new Promise((resolve, reject) => {
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      resolve(this);
      return this;
    },
  };
  handler(req, response, reject);
});

test("traveler request history is scoped to the authenticated user", async () => {
  const originalFind = Trip.find;
  const userId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const mine = { _id: new mongoose.Types.ObjectId(), user: userId, status: "Pending" };
  const theirs = { _id: new mongoose.Types.ObjectId(), user: otherUserId, status: "Accepted" };
  let filter;

  try {
    Trip.find = (query) => {
      filter = query;
      const queryBuilder = {
        select() { return this; },
        populate() { return this; },
        sort() { return this; },
        lean: async () => [{
          _id: tripId,
          title: "Traveler history trip",
          joinRequests: [mine, theirs],
        }],
      };
      return queryBuilder;
    };
    const response = await invoke(getMyTripRequests, {
      authUser: { id: userId.toString() },
    });
    assert.deepEqual(filter, { "joinRequests.user": userId.toString() });
    assert.equal(response.body.count, 1);
    assert.equal(response.body.data[0].id, mine._id);
    assert.equal(response.body.data[0].tripId, tripId);
  } finally {
    Trip.find = originalFind;
  }
});

test("traveler cancellation only updates their own pending request and notifies the organizer", async () => {
  const originalFindOneAndUpdate = Trip.findOneAndUpdate;
  const originalUserUpdateOne = User.updateOne;
  const userId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  let updateFilter;
  let notification;

  try {
    Trip.findOneAndUpdate = (filter, update) => {
      updateFilter = { filter, update };
      return {
        select: async () => ({ _id: tripId, title: "Cancelable trip", organizer: organizerId }),
      };
    };
    User.updateOne = async (filter, update) => {
      notification = { filter, update };
      return { matchedCount: 1 };
    };
    const response = await invoke(cancelMyTripRequest, {
      authUser: { id: userId.toString() },
      params: { tripId: tripId.toString(), requestId: requestId.toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data.status, "Cancelled");
    assert.equal(updateFilter.filter.joinRequests.$elemMatch.user, userId.toString());
    assert.equal(updateFilter.filter.joinRequests.$elemMatch.status, "Pending");
    assert.equal(updateFilter.update.$set["joinRequests.$.status"], "Cancelled");
    assert.equal(notification.filter._id, organizerId);
    assert.equal(notification.update.$push.notifications.$each[0].type, "trip-request-cancelled");
  } finally {
    Trip.findOneAndUpdate = originalFindOneAndUpdate;
    User.updateOne = originalUserUpdateOne;
  }
});

test("traveler cannot cancel another user's or a non-pending request", async () => {
  const originalFindOneAndUpdate = Trip.findOneAndUpdate;
  const userId = new mongoose.Types.ObjectId();
  let filter;

  try {
    Trip.findOneAndUpdate = (query) => {
      filter = query;
      return { select: async () => null };
    };
    const response = await invoke(cancelMyTripRequest, {
      authUser: { id: userId.toString() },
      params: {
        tripId: new mongoose.Types.ObjectId().toString(),
        requestId: new mongoose.Types.ObjectId().toString(),
      },
    });
    assert.equal(response.statusCode, 409);
    assert.equal(filter.joinRequests.$elemMatch.user, userId.toString());
    assert.equal(filter.joinRequests.$elemMatch.status, "Pending");
  } finally {
    Trip.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
