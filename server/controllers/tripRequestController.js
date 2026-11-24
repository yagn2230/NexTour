const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const BookingPayment = require("../models/BookingPayment");
const ChatConversation = require("../models/ChatConversation");
const withTransaction = require("../services/withTransaction");
const { asyncHandler } = require("../middleware/errorMiddleware");
const { isDemoPaymentsEnabled } = require("../services/paymentMode");
const { calculateTravelerReliability } = require("../utils/travelerReliability");

const addRequestNotification = async (userId, notification, session) => {
  await User.updateOne(
    { _id: userId },
    {
      $push: {
        notifications: {
          $each: [notification],
          $sort: { createdAt: -1 },
          $slice: 100,
        },
      },
    },
    session ? { session } : undefined
  );
};

const createTripRequest = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.authUser?.id || req.session.user.id;
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!mongoose.isObjectIdOrHexString(tripId)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID." });
  }
  if (message.length > 500) {
    return res.status(400).json({ success: false, message: "Request message cannot exceed 500 characters." });
  }
  const requester = await User.findById(userId).select("noShowCount noShowRestrictedUntil");
  if (!requester) return res.status(404).json({ success: false, message: "Traveler account not found." });
  if (requester.noShowRestrictedUntil && new Date(requester.noShowRestrictedUntil) > new Date()) {
    return res.status(403).json({
      success: false,
      message: `New trip requests are temporarily restricted until ${new Date(requester.noShowRestrictedUntil).toLocaleDateString()}.`,
    });
  }
  const trip = await Trip.findById(tripId);
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
  if (trip.organizer.toString() === userId) {
    return res.status(400).json({ success: false, message: "You cannot request to join your own trip." });
  }
  if (trip.approvalStatus !== "Approved" || trip.status !== "Open" || !trip.isPublic) {
    return res.status(403).json({ success: false, message: "This trip is not accepting join requests." });
  }
  if (trip.currentMembers >= trip.maxMembers) {
    trip.status = "Full";
    await trip.save();
    return res.status(409).json({ success: false, message: "This trip is full and cannot accept join requests." });
  }
  if (trip.members.some((member) => member.user.toString() === userId)) {
    return res.status(409).json({ success: false, message: "You have already joined this trip." });
  }
  if (trip.joinRequests.some((request) => request.user.toString() === userId && request.status === "Pending")) {
    return res.status(409).json({ success: false, message: "Your request is already pending." });
  }

  trip.joinRequests.push({ user: userId, message });
  await trip.save();
  await addRequestNotification(trip.organizer, {
    type: "trip-request",
    title: "New trip request",
    detail: `A traveler requested to join ${trip.title}.`,
    relatedTrip: trip._id,
  });
  const request = trip.joinRequests[trip.joinRequests.length - 1];
  res.status(201).json({
    success: true,
    message: "Join request submitted.",
    data: {
      id: request._id,
      tripId: trip._id,
      status: request.status,
      requestedAt: request.requestedAt,
      reliability: calculateTravelerReliability([], requester.noShowCount || 0),
    },
  });
});

const getMyTripRequests = asyncHandler(async (req, res) => {
  const userId = req.authUser?.id || req.session?.user?.id;
  const trips = await Trip.find({ "joinRequests.user": userId })
    .select("title destination city state country coverImage startDate endDate status pricePerPerson organizer joinRequests")
    .populate("organizer", "fullName username profileImage")
    .sort({ updatedAt: -1 })
    .lean();
  const data = trips.flatMap((trip) => (trip.joinRequests || [])
    .filter((request) => request.user.toString() === userId)
    .map((request) => ({
      id: request._id,
      tripId: trip._id,
      status: request.status,
      message: request.message,
      requestedAt: request.requestedAt,
      respondedAt: request.respondedAt,
      trip: {
        id: trip._id,
        title: trip.title,
        destination: trip.city || trip.destination,
        state: trip.state,
        country: trip.country,
        coverImage: trip.coverImage,
        startDate: trip.startDate,
        endDate: trip.endDate,
        status: trip.status,
        pricePerPerson: trip.pricePerPerson,
        organizer: trip.organizer,
      },
    })))
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  res.json({ success: true, count: data.length, data });
});

const cancelMyTripRequest = asyncHandler(async (req, res) => {
  const { tripId, requestId } = req.params;
  const userId = req.authUser?.id || req.session?.user?.id;
  if (!mongoose.isObjectIdOrHexString(tripId) || !mongoose.isObjectIdOrHexString(requestId)) {
    return res.status(400).json({ success: false, message: "Invalid trip or request ID." });
  }
  const now = new Date();
  const trip = await Trip.findOneAndUpdate(
    {
      _id: tripId,
      joinRequests: { $elemMatch: { _id: requestId, user: userId, status: "Pending" } },
    },
    {
      $set: {
        "joinRequests.$.status": "Cancelled",
        "joinRequests.$.respondedAt": now,
      },
    },
    { new: true, runValidators: true }
  ).select("title organizer joinRequests");
  if (!trip) {
    return res.status(409).json({
      success: false,
      message: "Only your pending request can be cancelled.",
    });
  }
  await addRequestNotification(trip.organizer, {
    type: "trip-request-cancelled",
    title: "Join request cancelled",
    detail: `A traveler cancelled their request to join ${trip.title}.`,
    relatedTrip: trip._id,
  });
  res.json({
    success: true,
    message: "Join request cancelled.",
    data: { id: requestId, tripId: trip._id, status: "Cancelled" },
  });
});

const respondToTripRequest = (decision) => asyncHandler(async (req, res) => {
  const { tripId, requestId } = req.params;
  const userId = req.authUser?.id || req.session.user.id;
  if ((tripId && !mongoose.isObjectIdOrHexString(tripId)) || !mongoose.isObjectIdOrHexString(requestId)) {
    return res.status(400).json({ success: false, message: "Invalid trip or request ID." });
  }
  const tripFilter = { joinRequests: { $elemMatch: { _id: requestId } } };
  if (tripId) tripFilter._id = tripId;
  if (req.authUser?.role !== "Admin") tripFilter.organizer = userId;
  const trip = await Trip.findOne(tripFilter);
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
  const request = trip.joinRequests.id(requestId);
  if (!request) return res.status(404).json({ success: false, message: "Join request not found." });
  if (request.status !== "Pending") {
    return res.status(409).json({ success: false, message: "This join request has already been handled." });
  }
  const now = new Date();
  let updatedTrip;
  if (decision === "Accepted") {
    if (trip.approvalStatus !== "Approved" || trip.status !== "Open" || trip.currentMembers >= trip.maxMembers) {
      return res.status(409).json({ success: false, message: "This trip cannot accept another traveler." });
    }
    if (
      trip.pricePerPerson === null
      || trip.pricePerPerson === undefined
      || !Number.isFinite(Number(trip.pricePerPerson))
      || Number(trip.pricePerPerson) < 0
    ) {
      return res.status(409).json({
        success: false,
        message: "Set a per-person price before accepting a traveler.",
      });
    }
    const applicant = await User.findById(request.user).select("_id noShowRestrictedUntil");
    if (!applicant) {
      return res.status(404).json({ success: false, message: "Applicant account not found." });
    }
    if (applicant.noShowRestrictedUntil && new Date(applicant.noShowRestrictedUntil) > now) {
      return res.status(403).json({
        success: false,
        message: "This traveler is temporarily restricted from joining new trips because of repeated no-shows.",
      });
    }
    const acceptance = await withTransaction(async (session) => {
      const acceptedTrip = await Trip.findOneAndUpdate(
        {
          _id: trip._id,
          approvalStatus: "Approved",
          status: "Open",
          $expr: { $lt: ["$currentMembers", "$maxMembers"] },
          "members.user": { $ne: request.user },
          joinRequests: { $elemMatch: { _id: request._id, status: "Pending" } },
        },
        {
          $set: {
            "joinRequests.$.status": "Accepted",
            "joinRequests.$.respondedAt": now,
          },
          $push: {
            members: { user: request.user, role: "TripMate", joinedAt: now },
          },
          $inc: { currentMembers: 1 },
        },
        { new: true, runValidators: true, session }
      );
      if (!acceptedTrip) return null;

      const existingBooking = await BookingPayment.findOne({
        trip: trip._id,
        traveler: request.user,
      }).session(session);
      if (existingBooking && existingBooking.paymentStatus !== "Cancelled") {
        const error = new Error("This traveler already has an active booking for this trip.");
        error.statusCode = 409;
        throw error;
      }

      const amount = Number(trip.pricePerPerson);
      const requiresPayment = amount > 0;
      const paymentMethod = requiresPayment
        ? (isDemoPaymentsEnabled() ? "Demo" : "Cash")
        : "Free";
      const paymentStatus = requiresPayment ? "Pending" : "Not Required";
      const bookingStatus = requiresPayment ? "Accepted" : "Confirmed";
      const paymentTransaction = requiresPayment ? [{
        status: "Pending",
        amount,
        actor: userId,
        createdAt: now,
        note: paymentMethod === "Demo"
          ? "Booking accepted; complete the development demo checkout to confirm."
          : "Booking accepted; cash payment must be confirmed by the organizer.",
      }] : [];
      if (existingBooking) {
        existingBooking.joinRequest = request._id;
        existingBooking.paymentMethod = paymentMethod;
        existingBooking.paymentStatus = paymentStatus;
        existingBooking.bookingStatus = bookingStatus;
        existingBooking.amount = amount;
        existingBooking.paidAt = null;
        existingBooking.razorpayOrderId = "";
        existingBooking.razorpayPaymentId = "";
        existingBooking.razorpayRefundId = "";
        existingBooking.razorpayRefundPending = false;
        existingBooking.razorpayRefundStartedAt = null;
        existingBooking.attendanceStatus = "Unmarked";
        existingBooking.attendanceMarkedAt = null;
        existingBooking.attendanceMarkedBy = null;
        existingBooking.cancelledAt = null;
        existingBooking.cancellationReason = "";
        existingBooking.cancellationBy = "";
        existingBooking.transactionHistory.push(...paymentTransaction);
        await existingBooking.save({ session });
      } else {
        await BookingPayment.create([{
          trip: trip._id,
          organizer: trip.organizer,
          traveler: request.user,
          joinRequest: request._id,
          paymentMethod,
          paymentStatus,
          bookingStatus,
          amount,
          transactionHistory: paymentTransaction,
        }], { session });
      }

      await ChatConversation.findOneAndUpdate(
        { trip: trip._id, traveler: request.user },
        {
          $set: {
            organizer: trip.organizer,
            traveler: request.user,
            joinRequest: request._id,
            status: "Active",
          },
          $setOnInsert: { trip: trip._id },
        },
        { new: true, upsert: true, runValidators: true, session }
      );
      await User.updateOne(
        { _id: request.user },
        {
          $addToSet: { joinedTrips: trip._id },
          $inc: { totalTripsJoined: 1 },
        },
        { session }
      );

      let pendingApplicants = [];
      if (acceptedTrip.currentMembers >= acceptedTrip.maxMembers) {
        await Trip.updateOne(
          { _id: trip._id, status: "Open" },
          { $set: { status: "Full" } },
          { session }
        );
        pendingApplicants = acceptedTrip.joinRequests
          .filter((entry) => entry.status === "Pending")
          .map((entry) => entry.user?.toString())
          .filter((id) => id && id !== request.user.toString());
        await Trip.updateOne(
          { _id: trip._id, status: "Full" },
          {
            $set: {
              "joinRequests.$[pending].status": "Declined",
              "joinRequests.$[pending].respondedAt": now,
            },
          },
          { arrayFilters: [{ "pending.status": "Pending" }], session }
        );
      }
      await addRequestNotification(request.user, {
        type: "trip-request-accepted",
        title: "Trip request accepted",
        detail: requiresPayment
          ? paymentMethod === "Demo"
            ? `Your request to join ${trip.title} was accepted. Complete the demo payment from My Bookings to confirm your place.`
            : `Your request to join ${trip.title} was accepted. Pay the organizer in cash and wait for confirmation.`
          : `Your request to join ${trip.title} was accepted. This trip is free, so your booking is confirmed.`,
        relatedTrip: trip._id,
      }, session);
      for (const applicantId of pendingApplicants) {
        await addRequestNotification(applicantId, {
          type: "trip-request-declined",
          title: "Trip request declined",
          detail: `${trip.title} is now full and cannot accept more travelers.`,
          relatedTrip: trip._id,
        }, session);
      }
      return { trip: acceptedTrip, pendingApplicants };
    });
    if (!acceptance) {
      return res.status(409).json({
        success: false,
        message: "This request was already handled or the trip no longer has room.",
      });
    }
    updatedTrip = acceptance.trip;
  } else {
    updatedTrip = await Trip.findOneAndUpdate(
      {
        _id: trip._id,
        joinRequests: { $elemMatch: { _id: request._id, status: "Pending" } },
      },
      {
        $set: {
          "joinRequests.$.status": decision,
          "joinRequests.$.respondedAt": now,
        },
      },
      { new: true, runValidators: true }
    );
    if (!updatedTrip) {
      return res.status(409).json({ success: false, message: "This join request has already been handled." });
    }
    await addRequestNotification(request.user, {
      type: "trip-request-declined",
      title: "Trip request declined",
      detail: `Your request to join ${trip.title} was declined.`,
      relatedTrip: trip._id,
    });
  }
  res.json({
    success: true,
    message: `Join request ${decision.toLowerCase()}.`,
    data: {
      id: request._id,
      tripId: trip._id,
      status: decision,
      currentMembers: updatedTrip.currentMembers,
      tripStatus: updatedTrip.currentMembers >= updatedTrip.maxMembers ? "Full" : updatedTrip.status,
    },
  });
});

module.exports = {
  createTripRequest,
  getMyTripRequests,
  cancelMyTripRequest,
  acceptTripRequest: respondToTripRequest("Accepted"),
  declineTripRequest: respondToTripRequest("Declined"),
  acceptOrganizerRequest: respondToTripRequest("Accepted"),
  rejectOrganizerRequest: respondToTripRequest("Declined"),
};
