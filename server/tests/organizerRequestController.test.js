const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { test } = require("node:test");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const Review = require("../models/Review");
const BookingPayment = require("../models/BookingPayment");
const ChatConversation = require("../models/ChatConversation");
const {
  getOrganizerDashboardStats,
  removeTripMember,
  deleteOrganizerTrip,
  updateTripPricePerPerson,
} = require("../controllers/organizerRequestController");
const {
  acceptOrganizerRequest,
  rejectOrganizerRequest,
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

test("accepting a request adds a member, updates counts, closes a full trip, and notifies travelers", async () => {
  const originals = {
    findOne: Trip.findOne,
    findOneAndUpdate: Trip.findOneAndUpdate,
    updateOne: Trip.updateOne,
    userFindById: User.findById,
    userUpdateOne: User.updateOne,
    startSession: mongoose.startSession,
    bookingFindOne: BookingPayment.findOne,
    bookingCreate: BookingPayment.create,
    conversationFindOneAndUpdate: ChatConversation.findOneAndUpdate,
    nodeEnv: process.env.NODE_ENV,
    paymentMode: process.env.PAYMENT_MODE,
  };
  const requestId = new mongoose.Types.ObjectId();
  const applicantId = new mongoose.Types.ObjectId();
  const nextApplicantId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const request = { _id: requestId, user: applicantId, status: "Pending" };
  const pendingRequest = { _id: new mongoose.Types.ObjectId(), user: nextApplicantId, status: "Pending" };
  const updateCalls = [];
  const userUpdates = [];
  let lookupFilter;
  let acceptanceUpdate;
  let closedPendingRequests = false;
  let createdBooking;
  let createdConversation;
  const fakeSession = {
    withTransaction: async (operation) => operation(),
    endSession: async () => {},
  };
  const updatedTrip = {
    _id: tripId,
    currentMembers: 2,
    maxMembers: 2,
    status: "Open",
    joinRequests: [
      { ...request, status: "Accepted" },
      pendingRequest,
    ],
  };

  try {
    process.env.NODE_ENV = "test";
    process.env.PAYMENT_MODE = "demo";
    Trip.findOne = async (filter) => {
      lookupFilter = filter;
      return {
        _id: tripId,
        organizer: organizerId,
        title: "Test trip",
        pricePerPerson: 125,
        approvalStatus: "Approved",
        status: "Open",
        currentMembers: 1,
        maxMembers: 2,
        joinRequests: {
          id: (id) => id.toString() === requestId.toString() ? request : null,
        },
      };
    };
    User.findById = () => ({ select: async () => ({ _id: applicantId }) });
    mongoose.startSession = async () => fakeSession;
    BookingPayment.findOne = () => ({ session: async () => null });
    BookingPayment.create = async (documents) => {
      createdBooking = documents[0];
      return documents;
    };
    ChatConversation.findOneAndUpdate = async (filter, update) => {
      createdConversation = { filter, update };
      return {};
    };
    Trip.findOneAndUpdate = async (filter, update) => {
      acceptanceUpdate = { filter, update };
      return updatedTrip;
    };
    Trip.updateOne = async (filter, update, options) => {
      updateCalls.push({ filter, update, options });
      if (options?.arrayFilters) closedPendingRequests = true;
      return { modifiedCount: 1 };
    };
    User.updateOne = async (filter, update) => {
      userUpdates.push({ filter, update });
      return { matchedCount: 1 };
    };

    const response = await invoke(acceptOrganizerRequest, {
      authUser: { id: organizerId.toString(), role: "User" },
      params: { requestId: requestId.toString() },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data.status, "Accepted");
    assert.equal(response.body.data.currentMembers, 2);
    assert.equal(response.body.data.tripStatus, "Full");
    assert.equal(lookupFilter.organizer.toString(), organizerId.toString());
    assert.equal(acceptanceUpdate.filter.joinRequests.$elemMatch.status, "Pending");
    assert.equal(acceptanceUpdate.update.$inc.currentMembers, 1);
    assert.equal(acceptanceUpdate.update.$push.members.role, "TripMate");
    assert.equal(userUpdates[0].update.$addToSet.joinedTrips.toString(), tripId.toString());
    assert.equal(userUpdates[0].update.$inc.totalTripsJoined, 1);
    assert.equal(updateCalls[0].update.$set.status, "Full");
    assert.equal(closedPendingRequests, true);
    assert.equal(userUpdates.length, 3);
    assert.equal(userUpdates[1].update.$push.notifications.$each[0].type, "trip-request-accepted");
    assert.equal(userUpdates[2].update.$push.notifications.$each[0].type, "trip-request-declined");
    assert.equal(createdBooking.paymentMethod, "Demo");
    assert.equal(createdBooking.paymentStatus, "Pending");
    assert.equal(createdBooking.bookingStatus, "Accepted");
    assert.equal(createdBooking.amount, 125);
    assert.equal(createdConversation.update.$set.status, "Active");
  } finally {
    Trip.findOne = originals.findOne;
    Trip.findOneAndUpdate = originals.findOneAndUpdate;
    Trip.updateOne = originals.updateOne;
    User.findById = originals.userFindById;
    User.updateOne = originals.userUpdateOne;
    mongoose.startSession = originals.startSession;
    BookingPayment.findOne = originals.bookingFindOne;
    BookingPayment.create = originals.bookingCreate;
    ChatConversation.findOneAndUpdate = originals.conversationFindOneAndUpdate;
    if (originals.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originals.nodeEnv;
    if (originals.paymentMode === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = originals.paymentMode;
  }
});

test("accepting a free trip confirms the booking without creating a payment", async () => {
  const originals = {
    findOne: Trip.findOne,
    findOneAndUpdate: Trip.findOneAndUpdate,
    userFindById: User.findById,
    userUpdateOne: User.updateOne,
    startSession: mongoose.startSession,
    bookingFindOne: BookingPayment.findOne,
    bookingCreate: BookingPayment.create,
    conversationFindOneAndUpdate: ChatConversation.findOneAndUpdate,
  };
  const requestId = new mongoose.Types.ObjectId();
  const applicantId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const request = { _id: requestId, user: applicantId, status: "Pending" };
  let createdBooking;
  const userUpdates = [];
  try {
    Trip.findOne = async () => ({
      _id: tripId,
      organizer: organizerId,
      title: "Free trip",
      pricePerPerson: 0,
      approvalStatus: "Approved",
      status: "Open",
      currentMembers: 1,
      maxMembers: 5,
      joinRequests: { id: () => request },
    });
    Trip.findOneAndUpdate = async () => ({
      currentMembers: 2,
      maxMembers: 5,
      status: "Open",
      joinRequests: [{ ...request, status: "Accepted" }],
    });
    User.findById = () => ({ select: async () => ({ _id: applicantId }) });
    User.updateOne = async (filter, update) => {
      userUpdates.push({ filter, update });
      return { matchedCount: 1 };
    };
    mongoose.startSession = async () => ({
      withTransaction: async (operation) => operation(),
      endSession: async () => {},
    });
    BookingPayment.findOne = () => ({ session: async () => null });
    BookingPayment.create = async (documents) => {
      [createdBooking] = documents;
      return documents;
    };
    ChatConversation.findOneAndUpdate = async () => ({});

    const response = await invoke(acceptOrganizerRequest, {
      authUser: { id: organizerId.toString(), role: "User" },
      params: { requestId: requestId.toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(createdBooking.paymentMethod, "Free");
    assert.equal(createdBooking.paymentStatus, "Not Required");
    assert.equal(createdBooking.bookingStatus, "Confirmed");
    assert.deepEqual(createdBooking.transactionHistory, []);
    assert.match(userUpdates[1].update.$push.notifications.$each[0].detail, /trip is free/i);
  } finally {
    Trip.findOne = originals.findOne;
    Trip.findOneAndUpdate = originals.findOneAndUpdate;
    User.findById = originals.userFindById;
    User.updateOne = originals.userUpdateOne;
    mongoose.startSession = originals.startSession;
    BookingPayment.findOne = originals.bookingFindOne;
    BookingPayment.create = originals.bookingCreate;
    ChatConversation.findOneAndUpdate = originals.conversationFindOneAndUpdate;
  }
});

test("admins can decide requests across trips without an organizer ownership filter", async () => {
  const originalFindOne = Trip.findOne;
  const originalFindOneAndUpdate = Trip.findOneAndUpdate;
  const originalUserUpdateOne = User.updateOne;
  const requestId = new mongoose.Types.ObjectId();
  const applicantId = new mongoose.Types.ObjectId();
  let lookupFilter;
  try {
    Trip.findOne = async (filter) => {
      lookupFilter = filter;
      return {
        _id: new mongoose.Types.ObjectId(),
        title: "Admin trip",
        joinRequests: { id: () => ({ _id: requestId, user: applicantId, status: "Pending" }) },
      };
    };
    Trip.findOneAndUpdate = async () => ({
      _id: new mongoose.Types.ObjectId(),
      currentMembers: 1,
      maxMembers: 5,
      status: "Open",
    });
    User.updateOne = async () => ({ matchedCount: 1 });
    const response = await invoke(rejectOrganizerRequest, {
      authUser: { id: new mongoose.Types.ObjectId().toString(), role: "Admin" },
      params: { requestId: requestId.toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data.status, "Declined");
    assert.equal(lookupFilter.organizer, undefined);
  } finally {
    Trip.findOne = originalFindOne;
    Trip.findOneAndUpdate = originalFindOneAndUpdate;
    User.updateOne = originalUserUpdateOne;
  }
});

test("legacy trips without per-person pricing cannot accept new bookings", async () => {
  const originalFindOne = Trip.findOne;
  const requestId = new mongoose.Types.ObjectId();
  const applicantId = new mongoose.Types.ObjectId();
  try {
    Trip.findOne = async () => ({
      _id: new mongoose.Types.ObjectId(),
      title: "Unpriced trip",
      approvalStatus: "Approved",
      status: "Open",
      currentMembers: 1,
      maxMembers: 4,
      pricePerPerson: null,
      joinRequests: { id: () => ({ _id: requestId, user: applicantId, status: "Pending" }) },
    });
    const response = await invoke(acceptOrganizerRequest, {
      authUser: { id: new mongoose.Types.ObjectId().toString(), role: "User" },
      params: { requestId: requestId.toString() },
    });
    assert.equal(response.statusCode, 409);
    assert.match(response.body.message, /per-person price/i);
  } finally {
    Trip.findOne = originalFindOne;
  }
});

test("paid trip requests use cash when demo payments are disabled", async () => {
  const originals = {
    findOne: Trip.findOne,
    findOneAndUpdate: Trip.findOneAndUpdate,
    userFindById: User.findById,
    userUpdateOne: User.updateOne,
    startSession: mongoose.startSession,
    bookingFindOne: BookingPayment.findOne,
    bookingCreate: BookingPayment.create,
    conversationFindOneAndUpdate: ChatConversation.findOneAndUpdate,
  };
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPaymentMode = process.env.PAYMENT_MODE;
  const requestId = new mongoose.Types.ObjectId();
  const applicantId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const request = { _id: requestId, user: applicantId, status: "Pending" };
  let createdBooking;
  try {
    process.env.NODE_ENV = "production";
    process.env.PAYMENT_MODE = "demo";
    Trip.findOne = async () => ({
      _id: tripId,
      organizer: organizerId,
      title: "Paid trip",
      pricePerPerson: 100,
      approvalStatus: "Approved",
      status: "Open",
      currentMembers: 1,
      maxMembers: 4,
      joinRequests: { id: () => request },
    });
    Trip.findOneAndUpdate = async () => ({
      currentMembers: 2,
      maxMembers: 4,
      status: "Open",
      joinRequests: [{ ...request, status: "Accepted" }],
    });
    User.findById = () => ({ select: async () => ({ _id: applicantId }) });
    User.updateOne = async () => ({ matchedCount: 1 });
    mongoose.startSession = async () => ({
      withTransaction: async (operation) => operation(),
      endSession: async () => {},
    });
    BookingPayment.findOne = () => ({ session: async () => null });
    BookingPayment.create = async (documents) => {
      [createdBooking] = documents;
      return documents;
    };
    ChatConversation.findOneAndUpdate = async () => ({});
    const response = await invoke(acceptOrganizerRequest, {
      authUser: { id: organizerId.toString(), role: "User" },
      params: { requestId: requestId.toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(createdBooking.paymentMethod, "Cash");
    assert.equal(createdBooking.paymentStatus, "Pending");
  } finally {
    Trip.findOne = originals.findOne;
    Trip.findOneAndUpdate = originals.findOneAndUpdate;
    User.findById = originals.userFindById;
    User.updateOne = originals.userUpdateOne;
    mongoose.startSession = originals.startSession;
    BookingPayment.findOne = originals.bookingFindOne;
    BookingPayment.create = originals.bookingCreate;
    ChatConversation.findOneAndUpdate = originals.conversationFindOneAndUpdate;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalPaymentMode === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = originalPaymentMode;
  }
});

test("dashboard statistics count accepted members and estimate revenue by per-person price", async () => {
  const originalFind = Trip.find;
  const originalReviewFind = Review.find;
  const originalBookingAggregate = BookingPayment.aggregate;
  let selectedFilter;
  let reviewFilter;
  try {
    Trip.find = (filter) => {
      selectedFilter = filter;
      return {
        select() {
          return {
            lean: async () => [
              {
                _id: new mongoose.Types.ObjectId(),
                status: "Open",
                approvalStatus: "Approved",
                startDate: new Date(Date.now() + 86_400_000),
                pricePerPerson: 125,
                members: [{ role: "Organizer" }, { role: "TripMate" }, { role: "TripMate" }],
                joinRequests: [{ status: "Pending" }, { status: "Accepted" }, { status: "Declined" }],
              },
              {
                _id: new mongoose.Types.ObjectId(),
                status: "Completed",
                startDate: new Date(Date.now() - 86_400_000),
                pricePerPerson: 50,
                members: [{ role: "Organizer" }, { role: "TripMate" }],
                joinRequests: [{ status: "Accepted" }, { status: "Rejected" }],
              },
            ],
          };
        },
      };
    };
    Review.find = (filter) => {
      reviewFilter = filter;
      return {
        select() {
          return {
            lean: async () => [{ rating: 5 }, { rating: 4 }],
          };
        },
      };
    };
    BookingPayment.aggregate = async () => [{ collectedRevenue: 0, pendingPayments: 0 }];
    const response = await invoke(getOrganizerDashboardStats, {
      authUser: { id: "admin-id", role: "Admin" },
    });
    assert.deepEqual(selectedFilter, {});
    assert.deepEqual(reviewFilter.trip.$in.length, 2);
    assert.equal(reviewFilter.user, undefined);
    assert.deepEqual(response.body.data, {
      totalTrips: 2,
      totalMembers: 3,
      pending: 1,
      accepted: 2,
      rejected: 2,
      totalRevenue: 300,
      collectedRevenue: 0,
      pendingPayments: 0,
      averageRating: 4.5,
      reviewsCount: 2,
      activeTrips: 1,
      upcomingTrips: 1,
      completedTrips: 1,
    });
  } finally {
    Trip.find = originalFind;
    Review.find = originalReviewFind;
    BookingPayment.aggregate = originalBookingAggregate;
  }
});

test("organizer dashboard rating is limited to reviews for that organizer", async () => {
  const originalFind = Trip.find;
  const originalReviewFind = Review.find;
  const originalBookingAggregate = BookingPayment.aggregate;
  const organizerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  let reviewFilter;
  try {
    Trip.find = () => ({
      select: () => ({
        lean: async () => [{
          _id: tripId,
          status: "Open",
          approvalStatus: "Approved",
          startDate: new Date(Date.now() + 86_400_000),
          pricePerPerson: 0,
          members: [{ role: "Organizer" }],
          joinRequests: [],
        }],
      }),
    });
    Review.find = (filter) => {
      reviewFilter = filter;
      return { select: () => ({ lean: async () => [{ rating: 5 }] }) };
    };
    BookingPayment.aggregate = async () => [{ collectedRevenue: 0, pendingPayments: 0 }];
    await invoke(getOrganizerDashboardStats, {
      authUser: { id: organizerId.toString(), role: "User" },
    });
    assert.equal(reviewFilter.user, organizerId.toString());
    assert.deepEqual(reviewFilter.trip.$in, [tripId]);
  } finally {
    Trip.find = originalFind;
    Review.find = originalReviewFind;
    BookingPayment.aggregate = originalBookingAggregate;
  }
});

test("organizers can update only their own per-person trip price and admins can update any trip", async () => {
  const originalFindOneAndUpdate = Trip.findOneAndUpdate;
  const tripId = new mongoose.Types.ObjectId();
  const ownerId = new mongoose.Types.ObjectId();
  const updatedTrip = { _id: tripId, title: "Test trip", pricePerPerson: 80 };
  let capturedFilter;
  let capturedUpdate;
  try {
    Trip.findOneAndUpdate = (filter, update) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return { select: async () => updatedTrip };
    };
    const ownerResponse = await invoke(updateTripPricePerPerson, {
      authUser: { id: ownerId.toString(), role: "User" },
      params: { tripId: tripId.toString() },
      body: { pricePerPerson: "80" },
    });
    assert.equal(ownerResponse.statusCode, 200);
    assert.equal(capturedFilter.organizer.toString(), ownerId.toString());
    assert.deepEqual(capturedUpdate, { $set: { pricePerPerson: 80 } });

    await invoke(updateTripPricePerPerson, {
      authUser: { id: "admin-id", role: "Admin" },
      params: { tripId: tripId.toString() },
      body: { pricePerPerson: 0 },
    });
    assert.equal(capturedFilter.organizer, undefined);

    const invalidPrice = await invoke(updateTripPricePerPerson, {
      authUser: { id: ownerId.toString(), role: "User" },
      params: { tripId: tripId.toString() },
      body: { pricePerPerson: [] },
    });
    assert.equal(invalidPrice.statusCode, 400);
  } finally {
    Trip.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("organizers can remove a member, reopen a trip, update the member account, and notify the traveler", async () => {
  const originalFindOneAndUpdate = Trip.findOneAndUpdate;
  const originalTripUpdateOne = Trip.updateOne;
  const originalUserUpdateOne = User.updateOne;
  const originalStartSession = mongoose.startSession;
  const originalBookingFindOne = BookingPayment.findOne;
  const originalConversationUpdateOne = ChatConversation.updateOne;
  const tripId = new mongoose.Types.ObjectId();
  const memberId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  let capturedFilter;
  let capturedUpdate;
  const userUpdates = [];
  const fakeSession = {
    withTransaction: async (operation) => operation(),
    endSession: async () => {},
  };
  try {
    mongoose.startSession = async () => fakeSession;
    BookingPayment.findOne = () => ({ session: async () => null });
    ChatConversation.updateOne = async () => ({ matchedCount: 1 });
    Trip.findOneAndUpdate = (filter, update, options) => {
      capturedFilter = filter;
      capturedUpdate = { update, options };
      return {
        select: async () => ({
          _id: tripId,
          title: "Test trip",
          status: "Full",
          currentMembers: 2,
          maxMembers: 4,
          pricePerPerson: 125,
          members: [{ role: "Organizer" }, { role: "TripMate" }],
          save: async function save() { this.status = "Open"; return this; },
        }),
      };
    };
    User.updateOne = async (...args) => {
      userUpdates.push(args);
      return { matchedCount: 1 };
    };
    Trip.updateOne = async () => ({ modifiedCount: 1 });
    const response = await invoke(removeTripMember, {
      authUser: { id: organizerId.toString(), role: "User" },
      params: { tripId: tripId.toString(), memberId: memberId.toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(capturedFilter.organizer.toString(), organizerId.toString());
    assert.equal(capturedUpdate.update.$inc.currentMembers, -1);
    assert.deepEqual(capturedUpdate.update.$pull.members, { user: memberId.toString(), role: "TripMate" });
    assert.deepEqual(capturedUpdate.options.arrayFilters, [{ "accepted.user": memberId.toString(), "accepted.status": "Accepted" }]);
    assert.equal(response.body.data.remainingSeats, 2);
    assert.equal(response.body.data.totalRevenue, 125);
    assert.equal(userUpdates.length, 2);
    assert.equal(userUpdates[0][1].$inc.totalTripsJoined, -1);
    assert.equal(userUpdates[1][1].$push.notifications.$each[0].type, "trip-membership-removed");
  } finally {
    Trip.findOneAndUpdate = originalFindOneAndUpdate;
    Trip.updateOne = originalTripUpdateOne;
    User.updateOne = originalUserUpdateOne;
    mongoose.startSession = originalStartSession;
    BookingPayment.findOne = originalBookingFindOne;
    ChatConversation.updateOne = originalConversationUpdateOne;
  }
});

test("admins can delete trips across organizers and user trip references are cleaned", async () => {
  const originalFindOneAndDelete = Trip.findOneAndDelete;
  const originalUserUpdateMany = User.updateMany;
  const originalBookingFindOne = BookingPayment.findOne;
  const originalConversationUpdateMany = ChatConversation.updateMany;
  const originalStartSession = mongoose.startSession;
  const tripId = new mongoose.Types.ObjectId();
  let capturedFilter;
  let cleanup;
  const fakeSession = {
    withTransaction: async (operation) => operation(),
    endSession: async () => {},
  };
  try {
    mongoose.startSession = async () => fakeSession;
    BookingPayment.findOne = () => ({ session: async () => null });
    ChatConversation.updateMany = async () => ({ modifiedCount: 0 });
    Trip.findOneAndDelete = (filter) => {
      capturedFilter = filter;
      return { select: async () => ({ _id: tripId, title: "Deleted trip" }) };
    };
    User.updateMany = async (filter, update) => {
      cleanup = { filter, update };
      return { modifiedCount: 1 };
    };
    const response = await invoke(deleteOrganizerTrip, {
      authUser: { id: new mongoose.Types.ObjectId().toString(), role: "Admin" },
      params: { tripId: tripId.toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(capturedFilter, { _id: tripId.toString() });
    assert.deepEqual(cleanup.update.$pull, { wishlist: tripId, joinedTrips: tripId, createdTrips: tripId });
  } finally {
    Trip.findOneAndDelete = originalFindOneAndDelete;
    User.updateMany = originalUserUpdateMany;
    BookingPayment.findOne = originalBookingFindOne;
    ChatConversation.updateMany = originalConversationUpdateMany;
    mongoose.startSession = originalStartSession;
  }
});

test("normal users cannot use organizer-only request management middleware", async () => {
  const organizerAccessMiddleware = require("../middleware/organizerAccessMiddleware");
  const originalFindById = User.findById;
  try {
    User.findById = () => ({ select: async () => ({ organizer: { isOrganizer: false, status: "Not Applied" } }) });
    const response = await invoke(organizerAccessMiddleware, {
      authUser: { id: "user-id", role: "User" },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);

    User.findById = () => ({ select: async () => ({ organizer: { isOrganizer: false, status: "Approved" } }) });
    let approvedPassed = false;
    await organizerAccessMiddleware(
      { authUser: { id: "approved-user-id", role: "User" } },
      {},
      () => { approvedPassed = true; }
    );
    assert.equal(approvedPassed, true);

    User.findById = () => ({ select: async () => ({ organizerVerified: true, organizer: { isOrganizer: true, status: "Rejected" } }) });
    const rejectedResponse = await invoke(organizerAccessMiddleware, {
      authUser: { id: "rejected-user-id", role: "User" },
    });
    assert.equal(rejectedResponse.statusCode, 403);

    let passed = false;
    organizerAccessMiddleware(
      { authUser: { id: "admin-id", role: "Admin" } },
      {},
      () => { passed = true; }
    );
    assert.equal(passed, true);
  } finally {
    User.findById = originalFindById;
  }
});
