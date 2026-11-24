const assert = require("node:assert/strict");
const { test } = require("node:test");
const Trip = require("../models/Trip");
const { getRelatedTrips } = require("../controllers/tripController");

const invokeRelatedTrips = (id) => new Promise((resolve, reject) => {
  getRelatedTrips(
    { params: { id } },
    {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ statusCode: this.statusCode || 200, body });
      },
    },
    reject
  );
});

const candidateTrip = (id, overrides = {}) => ({
  _id: id,
  title: "Suggested trip",
  description: "A sample trip",
  destination: "Destination",
  country: "Japan",
  state: "Goa",
  city: "Panaji",
  coverImage: { url: "/trip.jpg" },
  startDate: new Date("2027-01-01"),
  endDate: new Date("2027-01-03"),
  totalBudget: 10000,
  pricePerPerson: 2500,
  category: "Beach",
  currentMembers: 3,
  maxMembers: 8,
  famousPlaces: [],
  activityPreference: "Swimming",
  transportation: "Bus",
  itinerary: [],
  organizer: { averageRating: 4.5 },
  ...overrides,
});

const installTripQueries = (targetTrip, candidates, captureQuery) => {
  const originalFindOne = Trip.findOne;
  const originalFind = Trip.find;

  Trip.findOne = (query) => {
    assert.equal(query._id, "111111111111111111111111");
    assert.equal(query.approvalStatus, "Approved");
    assert.equal(query.isPublic, true);
    return {
      select() {
        return { lean: async () => targetTrip };
      },
    };
  };
  Trip.find = (query) => {
    captureQuery(query);
    return {
      select() {
        return this;
      },
      populate() {
        return this;
      },
      sort() {
        return this;
      },
      limit(limit) {
        assert.equal(limit, 200);
        return this;
      },
      lean: async () => candidates,
    };
  };

  return () => {
    Trip.findOne = originalFindOne;
    Trip.find = originalFind;
  };
};

test("related trips are scored, exclude the current trip, and return no more than six", async () => {
  const currentTrip = candidateTrip("111111111111111111111111");
  const matchingTrip = candidateTrip("222222222222222222222222", {
    title: "Matching beach escape",
  });
  const candidates = [
    matchingTrip,
    ...Array.from({ length: 7 }, (_, index) => candidateTrip(
      `${String(index + 3).padStart(24, "0")}`,
      { title: `Related trip ${index + 1}` }
    )),
  ];
  let capturedQuery;
  const restore = installTripQueries(currentTrip, candidates, (query) => { capturedQuery = query; });

  try {
    const response = await invokeRelatedTrips("111111111111111111111111");
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.mode, "related");
    assert.equal(response.body.count, 6);
    assert.equal(response.body.data[0]._id, matchingTrip._id);
    assert.ok(response.body.data.every((trip) => trip._id !== currentTrip._id));
    assert.equal(capturedQuery._id.$ne, currentTrip._id);
    assert.equal(capturedQuery.approvalStatus, "Approved");
    assert.equal(capturedQuery.isPublic, true);
    assert.equal(capturedQuery.status, "Open");
    assert.ok(capturedQuery.startDate.$gte instanceof Date);
    assert.equal(response.body.data[0].rating, 4.5);
  } finally {
    restore();
  }
});

test("trending trips are returned when there are no relevant matches", async () => {
  const currentTrip = candidateTrip("111111111111111111111111");
  const lessPopular = candidateTrip("222222222222222222222222", {
    city: "Jaipur",
    state: "Rajasthan",
    country: "Nepal",
    category: "Pilgrimage",
    totalBudget: 80000,
    startDate: new Date("2027-02-01"),
    endDate: new Date("2027-02-12"),
    activityPreference: "Museum visits",
    transportation: "Flight",
    currentMembers: 2,
    organizer: { averageRating: 3.8 },
  });
  const morePopular = candidateTrip("333333333333333333333333", {
    city: "Shimla",
    state: "Himachal Pradesh",
    country: "India",
    category: "Trekking",
    totalBudget: 90000,
    startDate: new Date("2027-03-01"),
    endDate: new Date("2027-03-12"),
    activityPreference: "Mountain climbing",
    transportation: "Train",
    currentMembers: 6,
    organizer: { averageRating: 4.2 },
  });
  const restore = installTripQueries(currentTrip, [lessPopular, morePopular], () => {});

  try {
    const response = await invokeRelatedTrips("111111111111111111111111");
    assert.equal(response.body.mode, "trending");
    assert.deepEqual(response.body.data.map((trip) => trip._id), [
      morePopular._id,
      lessPopular._id,
    ]);
  } finally {
    restore();
  }
});

test("related trips reject malformed trip IDs", async () => {
  const response = await invokeRelatedTrips("not-an-id");
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
});
