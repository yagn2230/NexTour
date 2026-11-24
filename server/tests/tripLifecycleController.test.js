const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { test } = require("node:test");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const { updateOrganizerTripStatus } = require("../controllers/organizerRequestController");

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

test("organizer lifecycle transitions enforce ownership and move trips through ongoing to completed", async () => {
  const originalFindOne = Trip.findOne;
  const originalUpdateMany = User.updateMany;
  const organizerId = new mongoose.Types.ObjectId();
  const travelerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const trip = {
    _id: tripId,
    title: "Lifecycle trip",
    organizer: organizerId,
    members: [{ user: travelerId }],
    status: "Open",
    startDate: today,
    endDate: new Date(today.getTime() - 86400000),
    save: async function save() {},
  };
  const lookups = [];
  const notifications = [];

  try {
    Trip.findOne = (filter) => {
      lookups.push(filter);
      return { select: async () => trip };
    };
    User.updateMany = async (filter, update) => {
      notifications.push({ filter, update });
      return { modifiedCount: 2 };
    };

    const ongoingResponse = await invoke(updateOrganizerTripStatus, {
      authUser: { id: organizerId.toString(), role: "User" },
      params: { tripId: tripId.toString() },
      body: { status: "Ongoing" },
    });
    assert.equal(ongoingResponse.statusCode, 200);
    assert.equal(trip.status, "Ongoing");
    assert.equal(lookups[0].organizer.toString(), organizerId.toString());

    const completedResponse = await invoke(updateOrganizerTripStatus, {
      authUser: { id: organizerId.toString(), role: "User" },
      params: { tripId: tripId.toString() },
      body: { status: "Completed" },
    });
    assert.equal(completedResponse.statusCode, 200);
    assert.equal(trip.status, "Completed");
    assert.equal(notifications.length, 2);
    assert.equal(notifications[0].update.$push.notifications.$each[0].type, "trip-ongoing");
    assert.equal(notifications[1].update.$push.notifications.$each[0].type, "trip-completed");
    assert.equal(notifications[0].filter._id.$in.length, 2);
  } finally {
    Trip.findOne = originalFindOne;
    User.updateMany = originalUpdateMany;
  }
});

test("organizer cannot mark a trip ongoing before its start date", async () => {
  const originalFindOne = Trip.findOne;
  const originalUpdateMany = User.updateMany;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const trip = {
    status: "Open",
    startDate: new Date(today.getTime() + 86400000),
    save: async () => assert.fail("A future trip must not be changed."),
  };

  try {
    Trip.findOne = () => ({ select: async () => trip });
    User.updateMany = async () => assert.fail("No notification should be sent.");
    const response = await invoke(updateOrganizerTripStatus, {
      authUser: { id: new mongoose.Types.ObjectId().toString(), role: "User" },
      params: { tripId: new mongoose.Types.ObjectId().toString() },
      body: { status: "Ongoing" },
    });
    assert.equal(response.statusCode, 409);
  } finally {
    Trip.findOne = originalFindOne;
    User.updateMany = originalUpdateMany;
  }
});
