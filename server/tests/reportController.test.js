const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { test } = require("node:test");
const Report = require("../models/Report");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const { createReport } = require("../controllers/reportController");

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

test("accepted Trip Mates can report the trip and organizer together", async () => {
  const originals = {
    reportFindOne: Report.findOne,
    reportCreate: Report.create,
    tripFindById: Trip.findById,
    userFindById: User.findById,
  };
  const reporterId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  let createdReport;

  try {
    Trip.findById = async () => ({
      _id: tripId,
      organizer: organizerId,
      joinRequests: [{ user: reporterId, status: "Accepted" }],
    });
    Report.findOne = () => ({ select: async () => null });
    Report.create = async (data) => {
      createdReport = data;
      return { _id: new mongoose.Types.ObjectId(), status: "Open" };
    };

    const response = await invoke(createReport, {
      authUser: { id: reporterId.toString() },
      body: {
        targetType: "Trip",
        targetId: tripId.toString(),
        contextTripId: tripId.toString(),
        reason: "The trip details and organizer conduct need review.",
      },
    });

    assert.equal(response.statusCode, 201);
    assert.equal(createdReport.targetType, "Trip");
    assert.equal(createdReport.target.toString(), tripId.toString());
    assert.equal(createdReport.relatedOrganizer.toString(), organizerId.toString());
  } finally {
    Report.findOne = originals.reportFindOne;
    Report.create = originals.reportCreate;
    Trip.findById = originals.tripFindById;
    User.findById = originals.userFindById;
  }
});

test("non-accepted travelers cannot submit trip-context reports", async () => {
  const originals = {
    reportCreate: Report.create,
    tripFindById: Trip.findById,
    userFindById: User.findById,
  };
  const reporterId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  let reportCreated = false;

  try {
    User.findById = async () => ({ role: "Organizer" });
    Trip.findById = async () => ({
      _id: tripId,
      organizer: organizerId,
      joinRequests: [{ user: reporterId, status: "Declined" }],
    });
    Report.create = async () => {
      reportCreated = true;
      return {};
    };

    const response = await invoke(createReport, {
      authUser: { id: reporterId.toString() },
      body: {
        targetType: "User",
        targetId: organizerId.toString(),
        contextTripId: tripId.toString(),
        reason: "Organizer misrepresented trip details.",
      },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(reportCreated, false);
  } finally {
    Report.create = originals.reportCreate;
    Trip.findById = originals.tripFindById;
    User.findById = originals.userFindById;
  }
});
