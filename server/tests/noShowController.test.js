const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { test } = require("node:test");
const BookingPayment = require("../models/BookingPayment");
const ChatConversation = require("../models/ChatConversation");
const NoShowAppeal = require("../models/NoShowAppeal");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const {
  markAttendance,
  cancelTripMateBooking,
  decideNoShowAppeal,
} = require("../controllers/noShowController");
const { createTripRequest } = require("../controllers/tripRequestController");
const { calculateTravelerReliability } = require("../utils/travelerReliability");

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

const mockSession = () => ({
  withTransaction: async (operation) => operation(),
  endSession: async () => {},
});

test("organizers can record a no-show after the trip and trigger the repeated-offender restriction", async () => {
  const originals = {
    startSession: mongoose.startSession,
    bookingFindOne: BookingPayment.findOne,
    tripFindById: Trip.findById,
    userFindOneAndUpdate: User.findOneAndUpdate,
    userFind: User.find,
    userUpdateOne: User.updateOne,
  };
  const organizerId = new mongoose.Types.ObjectId();
  const travelerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const booking = {
    trip: tripId,
    traveler: travelerId,
    attendanceStatus: "Unmarked",
    bookingStatus: "Confirmed",
    save: async () => booking,
  };
  const traveler = {
    noShowCount: 3,
    save: async () => traveler,
  };
  const notifications = [];
  try {
    mongoose.startSession = async () => mockSession();
    BookingPayment.findOne = (filter) => {
      assert.equal(filter.organizer.toString(), organizerId.toString());
      assert.deepEqual(filter.$or, [
        { attendanceStatus: "Unmarked" },
        { attendanceStatus: { $exists: false } },
      ]);
      return { session: async () => booking };
    };
    Trip.findById = () => ({ session: async () => ({
      _id: tripId,
      title: "Test trip",
      startDate: new Date(Date.now() - 3 * 86400000),
      endDate: new Date(Date.now() - 86400000),
    }) });
    User.findOneAndUpdate = async (filter, update) => {
      assert.equal(filter._id.toString(), travelerId.toString());
      assert.equal(update.$inc.noShowCount, 1);
      return traveler;
    };
    User.find = () => ({
      select: () => ({ session: async () => [{ _id: new mongoose.Types.ObjectId() }] }),
    });
    User.updateOne = async (filter, update) => {
      notifications.push({ filter, update });
      return { matchedCount: 1 };
    };

    const response = await invoke(markAttendance, {
      authUser: { id: organizerId.toString(), role: "User" },
      params: { bookingId: new mongoose.Types.ObjectId().toString() },
      body: { attendanceStatus: "No-Show" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(booking.attendanceStatus, "No-Show");
    assert.equal(booking.attendanceMarkedBy.toString(), organizerId.toString());
    assert.ok(traveler.noShowRestrictedUntil instanceof Date);
    assert.equal(notifications.length, 2);
    assert.equal(notifications[0].update.$push.notifications.$each[0].type, "trip-no-show-recorded");
    assert.equal(notifications[1].update.$push.notifications.$each[0].type, "frequent-trip-no-show");
  } finally {
    mongoose.startSession = originals.startSession;
    BookingPayment.findOne = originals.bookingFindOne;
    Trip.findById = originals.tripFindById;
    User.findOneAndUpdate = originals.userFindOneAndUpdate;
    User.find = originals.userFind;
    User.updateOne = originals.userUpdateOne;
  }
});

test("a Trip Mate cannot be marked absent before the trip has ended", async () => {
  const originals = {
    startSession: mongoose.startSession,
    bookingFindOne: BookingPayment.findOne,
    tripFindById: Trip.findById,
  };
  const booking = { trip: new mongoose.Types.ObjectId(), attendanceStatus: "Unmarked" };
  try {
    mongoose.startSession = async () => mockSession();
    BookingPayment.findOne = () => ({ session: async () => booking });
    Trip.findById = () => ({ session: async () => ({
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000),
    }) });
    const response = await invoke(markAttendance, {
      authUser: { id: new mongoose.Types.ObjectId().toString(), role: "User" },
      params: { bookingId: new mongoose.Types.ObjectId().toString() },
      body: { attendanceStatus: "No-Show" },
    });
    assert.equal(response.statusCode, 409);
    assert.match(response.body.message, /only after the trip ends/i);
    assert.equal(booking.attendanceStatus, "Unmarked");
  } finally {
    mongoose.startSession = originals.startSession;
    BookingPayment.findOne = originals.bookingFindOne;
    Trip.findById = originals.tripFindById;
  }
});

test("travelers can cancel a free booking before the start date and release the seat", async () => {
  const originals = {
    startSession: mongoose.startSession,
    bookingFindOne: BookingPayment.findOne,
    tripFindById: Trip.findById,
    tripUpdateOne: Trip.updateOne,
    userUpdateOne: User.updateOne,
    conversationUpdateOne: ChatConversation.updateOne,
  };
  const travelerId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const booking = {
    _id: bookingId,
    trip: tripId,
    traveler: travelerId,
    organizer: organizerId,
    amount: 0,
    paymentMethod: "Free",
    paymentStatus: "Not Required",
    bookingStatus: "Confirmed",
    attendanceStatus: "Unmarked",
    transactionHistory: [],
    save: async () => booking,
  };
  const trip = {
    _id: tripId,
    title: "Future trip",
    startDate: new Date(Date.now() + 86400000),
    endDate: new Date(Date.now() + 2 * 86400000),
    status: "Open",
    currentMembers: 2,
    maxMembers: 5,
    members: [{ user: travelerId, role: "TripMate" }],
  };
  let seatReleased = false;
  try {
    mongoose.startSession = async () => mockSession();
    BookingPayment.findOne = (filter) => {
      if (filter.bookingStatus) return { session: async () => booking };
      return Promise.resolve(booking);
    };
    Trip.findById = () => ({ session: async () => trip });
    Trip.updateOne = async () => { seatReleased = true; return { modifiedCount: 1 }; };
    User.updateOne = async () => ({ matchedCount: 1 });
    ChatConversation.updateOne = async () => ({ matchedCount: 1 });

    const response = await invoke(cancelTripMateBooking, {
      authUser: { id: travelerId.toString(), role: "User" },
      params: { bookingId: bookingId.toString() },
      body: { reason: "I can no longer attend." },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(booking.bookingStatus, "Cancelled");
    assert.equal(booking.cancellationBy, "Traveler");
    assert.equal(booking.cancellationReason, "I can no longer attend.");
    assert.equal(booking.paymentStatus, "Cancelled");
    assert.equal(seatReleased, true);
  } finally {
    mongoose.startSession = originals.startSession;
    BookingPayment.findOne = originals.bookingFindOne;
    Trip.findById = originals.tripFindById;
    Trip.updateOne = originals.tripUpdateOne;
    User.updateOne = originals.userUpdateOne;
    ChatConversation.updateOne = originals.conversationUpdateOne;
  }
});

test("reliability score reflects no-shows while early cancellations do not reduce it", () => {
  const result = calculateTravelerReliability([
    { attendanceStatus: "Present", cancellationBy: "" },
    { attendanceStatus: "No-Show", cancellationBy: "" },
    { attendanceStatus: "Unmarked", cancellationBy: "Traveler" },
  ], 1);

  assert.equal(result.attendancePercentage, 50);
  assert.equal(result.cancelledTrips, 1);
  assert.equal(result.reliabilityScore, 80);
});

test("temporarily restricted travelers cannot submit another trip request", async () => {
  const originalUserFindById = User.findById;
  const originalTripFindById = Trip.findById;
  const travelerId = new mongoose.Types.ObjectId();
  try {
    User.findById = () => ({
      select: async () => ({
        noShowCount: 3,
        noShowRestrictedUntil: new Date(Date.now() + 86400000),
      }),
    });
    Trip.findById = () => {
      throw new Error("Restricted travelers must be rejected before the trip is loaded.");
    };
    const response = await invoke(createTripRequest, {
      authUser: { id: travelerId.toString(), role: "User" },
      params: { tripId: new mongoose.Types.ObjectId().toString() },
      body: { message: "I would like to join." },
    });
    assert.equal(response.statusCode, 403);
    assert.match(response.body.message, /temporarily restricted/i);
  } finally {
    User.findById = originalUserFindById;
    Trip.findById = originalTripFindById;
  }
});

test("admin approval excuses a no-show and restores an eligible traveler", async () => {
  const originals = {
    startSession: mongoose.startSession,
    appealFindOne: NoShowAppeal.findOne,
    bookingFindOne: BookingPayment.findOne,
    userFindById: User.findById,
    userUpdateOne: User.updateOne,
  };
  const travelerId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const booking = {
    attendanceStatus: "No-Show",
    save: async () => booking,
  };
  const appeal = {
    booking: new mongoose.Types.ObjectId(),
    traveler: travelerId,
    trip: tripId,
    status: "Pending",
    save: async () => appeal,
  };
  const traveler = {
    noShowCount: 3,
    noShowRestrictedUntil: new Date(Date.now() + 86400000),
    save: async () => traveler,
  };
  try {
    mongoose.startSession = async () => mockSession();
    NoShowAppeal.findOne = () => ({ session: async () => appeal });
    BookingPayment.findOne = (filter) => {
      assert.equal(filter.attendanceStatus, "No-Show");
      return { session: async () => booking };
    };
    User.findById = () => ({ session: async () => traveler });
    User.updateOne = async () => ({ matchedCount: 1 });

    const response = await invoke(decideNoShowAppeal, {
      authUser: { id: adminId.toString(), role: "Admin" },
      params: { appealId: new mongoose.Types.ObjectId().toString() },
      body: { decision: "Approved", reason: "Evidence verified." },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(appeal.status, "Approved");
    assert.equal(booking.attendanceStatus, "Excused");
    assert.equal(traveler.noShowCount, 2);
    assert.equal(traveler.noShowRestrictedUntil, null);
  } finally {
    mongoose.startSession = originals.startSession;
    NoShowAppeal.findOne = originals.appealFindOne;
    BookingPayment.findOne = originals.bookingFindOne;
    User.findById = originals.userFindById;
    User.updateOne = originals.userUpdateOne;
  }
});
