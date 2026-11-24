const assert = require("node:assert/strict");
const { test } = require("node:test");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const PlatformSettings = require("../models/PlatformSettings");
const { getExploreTrips } = require("../controllers/tripController");

test("Explore endpoint builds supported filters and rejects invalid ranges", async () => {
  const originalTripFind = Trip.find;
  const originalUserFind = User.find;
  const originalSettingsFindOne = PlatformSettings.findOne;
  let capturedQuery = null;
  const invokeExplore = (query, response) => new Promise((resolve, reject) => {
    getExploreTrips(
      { query },
      {
        status(code) {
          response.statusCode = code;
          return this;
        },
        json(body) {
          response.body = body;
          resolve(body);
          return body;
        },
      },
      reject
    );
  });

  try {
    Trip.find = (query) => {
      capturedQuery = query;
      return {
        populate() { return this; },
        sort() { return Promise.resolve([]); },
      };
    };
    User.find = (query) => ({
      distinct: async (field) => {
        assert.deepEqual(Object.keys(query), ["languages"]);
        assert.equal(field, "_id");
        assert.equal(query.languages.test("English"), true);
        return ["organizer-id"];
      },
    });
    PlatformSettings.findOne = () => ({
      select() {
        return { lean: async () => null };
      },
    });

    const response = { statusCode: 200 };
    await invokeExplore({
      country: "Paris",
      region: "Europe",
      category: "Cultural",
      transportation: "Train",
      departureMonth: "2027-03",
      organizerLanguage: "English",
      minBudget: "100",
      maxBudget: "500",
      minDurationDays: "2",
      maxDurationDays: "7",
      search: "alpine",
    }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(capturedQuery.approvalStatus, "Approved");
    assert.equal(capturedQuery.isPublic, true);
    assert.equal(capturedQuery.$and.length, 3);
    assert.equal(capturedQuery.$and[0].$or[0].country.test("Paris"), true);
    assert.deepEqual(capturedQuery.$and[1].country.$in, [
      "Iceland", "Italy", "Spain", "Portugal", "Greece",
    ]);
    assert.deepEqual(capturedQuery.$and[2].organizer.$in, ["organizer-id"]);
    assert.equal(capturedQuery.category, "Cultural");
    assert.equal(capturedQuery.transportation, "Train");
    assert.deepEqual(capturedQuery.totalBudget, { $gte: 100, $lte: 500 });
    assert.deepEqual(capturedQuery.startDate, {
      $gte: new Date(Date.UTC(2027, 2, 1)),
      $lt: new Date(Date.UTC(2027, 3, 1)),
    });
    assert.ok(capturedQuery.$expr);
    assert.equal(capturedQuery.$or[1].title.test("alpine"), true);

    capturedQuery = null;
    const invalidResponse = { statusCode: 200 };
    await invokeExplore({ minBudget: "500", maxBudget: "100" }, invalidResponse);

    assert.equal(invalidResponse.statusCode, 400);
    assert.equal(invalidResponse.body.success, false);
    assert.equal(capturedQuery, null);
  } finally {
    Trip.find = originalTripFind;
    User.find = originalUserFind;
    PlatformSettings.findOne = originalSettingsFindOne;
  }
});
