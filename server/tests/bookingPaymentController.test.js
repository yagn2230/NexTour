const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { test } = require("node:test");
const BookingPayment = require("../models/BookingPayment");
const ChatConversation = require("../models/ChatConversation");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const {
  completeDemoPayment,
  selectCashPayment,
  markCashPaymentPaid,
  cancelPendingBooking,
} = require("../controllers/bookingPaymentController");
const { isDemoPaymentsEnabled } = require("../services/paymentMode");

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

test("demo payments default on locally but remain disabled in production", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPaymentMode = process.env.PAYMENT_MODE;
  try {
    delete process.env.NODE_ENV;
    delete process.env.PAYMENT_MODE;
    assert.equal(isDemoPaymentsEnabled(), true);
    process.env.NODE_ENV = "production";
    assert.equal(isDemoPaymentsEnabled(), false);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalPaymentMode === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = originalPaymentMode;
  }
});

test("the booking owner can complete a pending demo payment and notify both parties", async () => {
  const originals = {
    startSession: mongoose.startSession,
    bookingFindOne: BookingPayment.findOne,
    tripFindById: Trip.findById,
    userUpdateOne: User.updateOne,
    nodeEnv: process.env.NODE_ENV,
    paymentMode: process.env.PAYMENT_MODE,
  };
  const organizerId = new mongoose.Types.ObjectId();
  const travelerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const booking = {
    _id: new mongoose.Types.ObjectId(),
    trip: tripId,
    organizer: organizerId,
    traveler: travelerId,
    amount: 125,
    paymentMethod: "Cash",
    paymentStatus: "Cash Payment Pending",
    bookingStatus: "Accepted",
    transactionHistory: [],
    save: async () => booking,
  };
  const notifications = [];
  try {
    process.env.NODE_ENV = "test";
    process.env.PAYMENT_MODE = "demo";
    mongoose.startSession = async () => mockSession();
    BookingPayment.findOne = (filter) => {
      assert.equal(filter.traveler.toString(), travelerId.toString());
      assert.equal(filter._id.toString(), booking._id.toString());
      assert.deepEqual(filter.paymentMethod.$in, ["Demo", "Cash"]);
      assert.deepEqual(filter.paymentStatus.$in, ["Pending", "Cash Payment Pending"]);
      return { session: async () => booking };
    };
    Trip.findById = () => ({
      select: () => ({ session: async () => ({ title: "Test trip" }) }),
    });
    User.updateOne = async (filter, update) => {
      notifications.push({ filter, update });
      return { matchedCount: 1 };
    };

    const response = await invoke(completeDemoPayment, {
      authUser: { id: travelerId.toString(), role: "User" },
      params: { bookingId: booking._id.toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(booking.paymentMethod, "Demo");
    assert.equal(booking.paymentStatus, "Paid");
    assert.equal(booking.bookingStatus, "Confirmed");
    assert.ok(booking.paidAt instanceof Date);
    assert.deepEqual(booking.transactionHistory[0].status, "Paid");
    assert.equal(booking.transactionHistory[0].amount, 125);
    assert.match(booking.transactionHistory[0].note, /no real funds moved/i);
    assert.equal(notifications.length, 2);
    assert.equal(notifications[0].filter._id.toString(), organizerId.toString());
    assert.equal(notifications[1].filter._id.toString(), travelerId.toString());
    assert.equal(notifications[0].update.$push.notifications.$each[0].type, "demo-payment-completed");
  } finally {
    mongoose.startSession = originals.startSession;
    BookingPayment.findOne = originals.bookingFindOne;
    Trip.findById = originals.tripFindById;
    User.updateOne = originals.userUpdateOne;
    if (originals.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originals.nodeEnv;
    if (originals.paymentMode === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = originals.paymentMode;
  }
});

test("demo payment completion is disabled in production", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPaymentMode = process.env.PAYMENT_MODE;
  try {
    process.env.NODE_ENV = "production";
    process.env.PAYMENT_MODE = "demo";
    const response = await invoke(completeDemoPayment, {
      authUser: { id: new mongoose.Types.ObjectId().toString(), role: "User" },
      params: { bookingId: new mongoose.Types.ObjectId().toString() },
    });
    assert.equal(response.statusCode, 403);
    assert.match(response.body.message, /disabled in production/i);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalPaymentMode === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = originalPaymentMode;
  }
});

test("travelers cannot complete another traveler's demo booking", async () => {
  const originalStartSession = mongoose.startSession;
  const originalBookingFindOne = BookingPayment.findOne;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPaymentMode = process.env.PAYMENT_MODE;
  const travelerId = new mongoose.Types.ObjectId();
  try {
    process.env.NODE_ENV = "test";
    process.env.PAYMENT_MODE = "demo";
    mongoose.startSession = async () => mockSession();
    BookingPayment.findOne = (filter) => {
      assert.equal(filter.traveler.toString(), travelerId.toString());
      return { session: async () => null };
    };
    const response = await invoke(completeDemoPayment, {
      authUser: { id: travelerId.toString(), role: "User" },
      params: { bookingId: new mongoose.Types.ObjectId().toString() },
    });
    assert.equal(response.statusCode, 409);
  } finally {
    mongoose.startSession = originalStartSession;
    BookingPayment.findOne = originalBookingFindOne;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalPaymentMode === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = originalPaymentMode;
  }
});

test("travelers can select cash and notify the organizer", async () => {
  const originals = {
    startSession: mongoose.startSession,
    bookingFindOne: BookingPayment.findOne,
    tripFindById: Trip.findById,
    userUpdateOne: User.updateOne,
  };
  const organizerId = new mongoose.Types.ObjectId();
  const travelerId = new mongoose.Types.ObjectId();
  const booking = {
    trip: new mongoose.Types.ObjectId(),
    organizer: organizerId,
    traveler: travelerId,
    amount: 125,
    paymentMethod: "Demo",
    paymentStatus: "Pending",
    bookingStatus: "Accepted",
    transactionHistory: [],
    save: async () => booking,
  };
  let notification;
  try {
    mongoose.startSession = async () => mockSession();
    BookingPayment.findOne = (filter) => {
      assert.equal(filter.traveler.toString(), travelerId.toString());
      assert.deepEqual(filter.paymentMethod.$in, ["Demo", "Razorpay", "Cash"]);
      return { session: async () => booking };
    };
    Trip.findById = () => ({
      select: () => ({ session: async () => ({ title: "Test trip" }) }),
    });
    User.updateOne = async (filter, update) => {
      notification = { filter, update };
      return { matchedCount: 1 };
    };
    const response = await invoke(selectCashPayment, {
      authUser: { id: travelerId.toString(), role: "User" },
      params: { bookingId: new mongoose.Types.ObjectId().toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(booking.paymentMethod, "Cash");
    assert.equal(booking.paymentStatus, "Pending");
    assert.equal(notification.filter._id.toString(), organizerId.toString());
    assert.equal(notification.update.$push.notifications.$each[0].type, "cash-payment-selected");
  } finally {
    mongoose.startSession = originals.startSession;
    BookingPayment.findOne = originals.bookingFindOne;
    Trip.findById = originals.tripFindById;
    User.updateOne = originals.userUpdateOne;
  }
});

test("organizers can confirm cash received and notify the traveler", async () => {
  const originals = {
    startSession: mongoose.startSession,
    bookingFindOne: BookingPayment.findOne,
    tripFindById: Trip.findById,
    userUpdateOne: User.updateOne,
  };
  const organizerId = new mongoose.Types.ObjectId();
  const travelerId = new mongoose.Types.ObjectId();
  const booking = {
    trip: new mongoose.Types.ObjectId(),
    organizer: organizerId,
    traveler: travelerId,
    amount: 125,
    paymentMethod: "Cash",
    paymentStatus: "Pending",
    bookingStatus: "Accepted",
    transactionHistory: [],
    save: async () => booking,
  };
  let notification;
  try {
    mongoose.startSession = async () => mockSession();
    BookingPayment.findOne = (filter) => {
      assert.equal(filter.organizer.toString(), organizerId.toString());
      assert.equal(filter.paymentMethod, "Cash");
      return { session: async () => booking };
    };
    Trip.findById = () => ({
      select: () => ({ session: async () => ({ title: "Test trip" }) }),
    });
    User.updateOne = async (filter, update) => {
      notification = { filter, update };
      return { matchedCount: 1 };
    };
    const response = await invoke(markCashPaymentPaid, {
      authUser: { id: organizerId.toString(), role: "User" },
      params: { bookingId: new mongoose.Types.ObjectId().toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(booking.paymentStatus, "Paid");
    assert.equal(booking.bookingStatus, "Confirmed");
    assert.ok(booking.paidAt instanceof Date);
    assert.equal(notification.filter._id.toString(), travelerId.toString());
    assert.equal(notification.update.$push.notifications.$each[0].type, "cash-payment-confirmed");
  } finally {
    mongoose.startSession = originals.startSession;
    BookingPayment.findOne = originals.bookingFindOne;
    Trip.findById = originals.tripFindById;
    User.updateOne = originals.userUpdateOne;
  }
});

test("cancelling a pending payment cancels the booking, removes the member, frees a seat, and disables chat", async () => {
  const originals = {
    startSession: mongoose.startSession,
    bookingFindOne: BookingPayment.findOne,
    tripFindById: Trip.findById,
    tripUpdateOne: Trip.updateOne,
    userUpdateOne: User.updateOne,
    conversationUpdateOne: ChatConversation.updateOne,
  };
  const organizerId = new mongoose.Types.ObjectId();
  const travelerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const booking = {
    _id: bookingId,
    trip: tripId,
    traveler: travelerId,
    amount: 90,
    paymentStatus: "Pending",
    bookingStatus: "Accepted",
    transactionHistory: [],
    save: async () => booking,
  };
  const trip = {
    _id: tripId,
    title: "Test trip",
    currentMembers: 2,
    maxMembers: 2,
    status: "Full",
    members: [{ user: travelerId, role: "TripMate" }],
  };
  const tripUpdates = [];
  const userUpdates = [];
  let conversationUpdate;
  try {
    mongoose.startSession = async () => mockSession();
    BookingPayment.findOne = (filter) => {
      assert.equal(filter.organizer.toString(), organizerId.toString());
      assert.deepEqual(filter.paymentStatus.$in, ["Pending", "Cash Payment Pending"]);
      return { session: async () => booking };
    };
    Trip.findById = () => ({ session: async () => trip });
    Trip.updateOne = async (...args) => {
      tripUpdates.push(args);
      return { modifiedCount: 1 };
    };
    User.updateOne = async (...args) => {
      userUpdates.push(args);
      return { matchedCount: 1 };
    };
    ChatConversation.updateOne = async (...args) => {
      conversationUpdate = args;
      return { modifiedCount: 1 };
    };

    const response = await invoke(cancelPendingBooking, {
      authUser: { id: organizerId.toString(), role: "User" },
      params: { bookingId: bookingId.toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(booking.bookingStatus, "Cancelled");
    assert.equal(booking.paymentStatus, "Cancelled");
    assert.equal(booking.transactionHistory[0].status, "Cancelled");
    assert.equal(tripUpdates.length, 2);
    assert.deepEqual(tripUpdates[0][1].$inc, { currentMembers: -1 });
    assert.deepEqual(tripUpdates[0][1].$pull.members, { user: travelerId, role: "TripMate" });
    assert.deepEqual(tripUpdates[1][1].$set, { status: "Open" });
    assert.equal(userUpdates[0][0].joinedTrips.toString(), tripId.toString());
    assert.equal(conversationUpdate[1].$set.status, "Disabled");
  } finally {
    mongoose.startSession = originals.startSession;
    BookingPayment.findOne = originals.bookingFindOne;
    Trip.findById = originals.tripFindById;
    Trip.updateOne = originals.tripUpdateOne;
    User.updateOne = originals.userUpdateOne;
    ChatConversation.updateOne = originals.conversationUpdateOne;
  }
});

test("confirmed bookings cannot use the pending-payment cancellation action", async () => {
  const originalStartSession = mongoose.startSession;
  const originalBookingFindOne = BookingPayment.findOne;
  const organizerId = new mongoose.Types.ObjectId();
  try {
    mongoose.startSession = async () => mockSession();
    BookingPayment.findOne = () => ({ session: async () => null });
    const response = await invoke(cancelPendingBooking, {
      authUser: { id: organizerId.toString(), role: "User" },
      params: { bookingId: new mongoose.Types.ObjectId().toString() },
    });
    assert.equal(response.statusCode, 409);
  } finally {
    mongoose.startSession = originalStartSession;
    BookingPayment.findOne = originalBookingFindOne;
  }
});
