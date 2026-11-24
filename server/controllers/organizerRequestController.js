const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const Review = require("../models/Review");
const BookingPayment = require("../models/BookingPayment");
const ChatConversation = require("../models/ChatConversation");
const { asyncHandler } = require("../middleware/errorMiddleware");
const { calculateAverageRating } = require("../utils/calculateStats");
const { calculateTravelerReliability } = require("../utils/travelerReliability");
const withTransaction = require("../services/withTransaction");

const getRequestSummary = (trip) => ({
  total: trip.joinRequests.length,
  pending: trip.joinRequests.filter((request) => request.status === "Pending").length,
  accepted: trip.joinRequests.filter((request) => request.status === "Accepted").length,
  rejected: trip.joinRequests.filter((request) => ["Declined", "Rejected"].includes(request.status)).length,
});

const asIdString = (value) => value?._id?.toString() || value?.toString();

const getOrganizerRequestTrips = asyncHandler(async (req, res) => {
  const isAdmin = req.authUser?.role === "Admin";
  const filter = isAdmin ? {} : { organizer: req.authUser.id };
  const trips = await Trip.find(filter)
    .select("title destination city state country coverImage startDate endDate pricePerPerson totalBudget maxMembers currentMembers status approvalStatus members joinRequests organizer")
    .populate("organizer", "fullName email profileImage")
    .populate("members.user", "fullName username email phone profileImage")
    .sort({ startDate: 1 });
  const data = trips.map((trip) => {
    const acceptedMembers = trip.members.filter((member) => member.role === "TripMate").length;
    return {
      ...trip.toObject(),
      acceptedMembers,
      remainingSeats: Math.max(0, trip.maxMembers - trip.currentMembers),
      requests: getRequestSummary(trip),
      totalRevenue: acceptedMembers * Number(trip.pricePerPerson || 0),
    };
  });
  res.json({ success: true, count: data.length, data });
});

const getTripJoinRequests = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  if (!mongoose.isObjectIdOrHexString(tripId)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID." });
  }
  const isAdmin = req.authUser?.role === "Admin";
  const filter = { _id: tripId };
  if (!isAdmin) filter.organizer = req.authUser.id;
  const trip = await Trip.findOne(filter)
    .select("title destination city state country coverImage startDate endDate pricePerPerson maxMembers currentMembers status approvalStatus members joinRequests organizer")
    .populate("organizer", "fullName email profileImage")
    .populate("joinRequests.user", "fullName username email phone location city country profileImage noShowCount noShowRestrictedUntil")
    .populate("members.user", "fullName username email phone location city country profileImage");
  if (!trip) {
    return res.status(404).json({ success: false, message: "Trip not found." });
  }

  const acceptedMembers = trip.members
    .filter((member) => member.role === "TripMate" && member.user)
    .map((member) => ({
      id: member.user._id,
      name: member.user.fullName,
      username: member.user.username || "",
      email: member.user.email,
      phone: member.user.phone || "",
      location: member.user.location || "",
      city: member.user.city || "",
      country: member.user.country || "",
      profileImage: member.user.profileImage || "",
      joinedAt: member.joinedAt,
    }));
  const requestUserIds = [...new Set(trip.joinRequests
    .map((request) => request.user?._id?.toString())
    .filter(Boolean))];
  const requestBookings = requestUserIds.length
    ? await BookingPayment.find({ traveler: { $in: requestUserIds } })
      .select("traveler trip attendanceStatus cancellationBy")
      .populate("trip", "status")
      .lean()
    : [];
  const historyByTraveler = new Map();
  for (const booking of requestBookings) {
    const travelerId = booking.traveler.toString();
    const history = historyByTraveler.get(travelerId) || [];
    history.push(booking);
    historyByTraveler.set(travelerId, history);
  }
  const requests = trip.joinRequests
    .filter((request) => request.user)
    .map((request) => ({
      id: request._id,
      status: request.status,
      message: request.message,
      requestedAt: request.requestedAt,
      respondedAt: request.respondedAt,
      applicant: {
        id: request.user._id,
        name: request.user.fullName,
        username: request.user.username || "",
        email: request.user.email,
        phone: request.user.phone || "",
        location: request.user.location || "",
        city: request.user.city || "",
        country: request.user.country || "",
        profileImage: request.user.profileImage || "",
        reliability: calculateTravelerReliability(
          historyByTraveler.get(request.user._id.toString()) || [],
          request.user.noShowCount || 0
        ),
        noShowRestrictedUntil: request.user.noShowRestrictedUntil || null,
      },
    }))
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  const acceptedCount = acceptedMembers.length;
  res.json({
    success: true,
    data: {
      trip: {
        id: trip._id,
        title: trip.title,
        destination: trip.destination,
        city: trip.city,
        state: trip.state,
        country: trip.country,
        coverImage: trip.coverImage,
        startDate: trip.startDate,
        endDate: trip.endDate,
        pricePerPerson: trip.pricePerPerson,
        maxMembers: trip.maxMembers,
        currentMembers: trip.currentMembers,
        acceptedMembers: acceptedCount,
        remainingSeats: Math.max(0, trip.maxMembers - trip.currentMembers),
        status: trip.status,
        approvalStatus: trip.approvalStatus,
        totalRevenue: acceptedCount * Number(trip.pricePerPerson || 0),
        organizer: trip.organizer,
      },
      counts: getRequestSummary(trip),
      requests,
      acceptedMembers,
    },
  });
});

const getOrganizerDashboardStats = asyncHandler(async (req, res) => {
  const isAdmin = req.authUser?.role === "Admin";
  const trips = await Trip.find(isAdmin ? {} : { organizer: req.authUser.id })
    .select("_id status approvalStatus startDate pricePerPerson members joinRequests")
    .lean();
  const requestCounts = trips.reduce((counts, trip) => {
    for (const request of trip.joinRequests || []) {
      if (request.status === "Pending") counts.pending += 1;
      else if (request.status === "Accepted") counts.accepted += 1;
      else if (["Declined", "Rejected"].includes(request.status)) counts.rejected += 1;
    }
    return counts;
  }, { pending: 0, accepted: 0, rejected: 0 });
  const now = new Date();
  const totalMembers = trips.reduce(
    (total, trip) => total + (trip.members || []).filter((member) => member.role === "TripMate").length,
    0
  );
  const totalRevenue = trips.reduce((total, trip) => {
    const acceptedMembers = (trip.members || []).filter((member) => member.role === "TripMate").length;
    return total + acceptedMembers * Number(trip.pricePerPerson || 0);
  }, 0);
  const reviewFilter = { trip: { $in: trips.map((trip) => trip._id) } };
  if (!isAdmin) reviewFilter.user = req.authUser.id;
  const reviews = await Review.find(reviewFilter)
    .select("rating")
    .lean();
  const paymentFilter = isAdmin ? {} : { organizer: new mongoose.Types.ObjectId(req.authUser.id) };
  const [paymentSummary] = await BookingPayment.aggregate([
    { $match: paymentFilter },
    {
      $group: {
        _id: null,
        collectedRevenue: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, "$amount", 0] },
        },
        pendingPayments: {
          $sum: { $cond: [{ $in: ["$paymentStatus", ["Pending", "Cash Payment Pending"]] }, 1, 0] },
        },
      },
    },
  ]);
  const data = {
    totalTrips: trips.length,
    totalMembers,
    ...requestCounts,
    totalRevenue,
    collectedRevenue: paymentSummary?.collectedRevenue || 0,
    pendingPayments: paymentSummary?.pendingPayments || 0,
    averageRating: calculateAverageRating(reviews),
    reviewsCount: reviews.length,
    activeTrips: trips.filter((trip) => trip.approvalStatus === "Approved" && trip.status === "Open").length,
    upcomingTrips: trips.filter((trip) => trip.status !== "Completed" && trip.status !== "Cancelled" && new Date(trip.startDate) >= now).length,
    completedTrips: trips.filter((trip) => trip.status === "Completed").length,
  };
  res.json({ success: true, data });
});

const removeTripMember = asyncHandler(async (req, res) => {
  const { tripId, memberId } = req.params;
  if (!mongoose.isObjectIdOrHexString(tripId) || !mongoose.isObjectIdOrHexString(memberId)) {
    return res.status(400).json({ success: false, message: "Invalid trip or member ID." });
  }
  const filter = {
    _id: tripId,
    members: { $elemMatch: { user: memberId, role: "TripMate" } },
  };
  if (req.authUser?.role !== "Admin") filter.organizer = req.authUser.id;
  const now = new Date();
  const removal = await withTransaction(async (session) => {
    const booking = await BookingPayment.findOne({ trip: tripId, traveler: memberId }).session(session);
    if (booking?.paymentStatus === "Paid") return { paid: true };
    if (booking && ["Pending", "Cash Payment Pending", "Not Required"].includes(booking.paymentStatus)) {
      booking.paymentStatus = "Cancelled";
      booking.bookingStatus = "Cancelled";
      booking.transactionHistory.push({
        status: "Cancelled",
        amount: booking.amount,
        actor: req.authUser.id,
        createdAt: now,
        note: "Organizer removed the traveler from the trip.",
      });
      await booking.save({ session });
      await ChatConversation.updateOne(
        { trip: tripId, traveler: memberId },
        { $set: { status: "Disabled" } },
        { session }
      );
    }
    const trip = await Trip.findOneAndUpdate(
      filter,
      {
        $pull: { members: { user: memberId, role: "TripMate" } },
        $inc: { currentMembers: -1 },
        $set: { "joinRequests.$[accepted].status": "Cancelled", "joinRequests.$[accepted].respondedAt": now },
      },
      {
        new: true,
        runValidators: true,
        arrayFilters: [{ "accepted.user": memberId, "accepted.status": "Accepted" }],
        session,
      }
    ).select("title status currentMembers maxMembers pricePerPerson members");
    if (!trip) return { notFound: true };
    await ChatConversation.updateOne(
      { trip: trip._id, traveler: memberId },
      { $set: { status: "Disabled" } },
      { session }
    );
    if (trip.status === "Full" && trip.currentMembers < trip.maxMembers) {
      await Trip.updateOne({ _id: trip._id, status: "Full" }, { $set: { status: "Open" } }, { session });
      trip.status = "Open";
    }
    await User.updateOne(
      { _id: memberId, joinedTrips: trip._id },
      { $pull: { joinedTrips: trip._id }, $inc: { totalTripsJoined: -1 } },
      { session }
    );
    await User.updateOne(
      { _id: memberId },
      {
        $push: {
          notifications: {
            $each: [{
              type: "trip-membership-removed",
              title: "Removed from trip",
              detail: `You are no longer a member of ${trip.title}.`,
              relatedTrip: trip._id,
            }],
            $sort: { createdAt: -1 },
            $slice: 100,
          },
        },
      },
      { session }
    );
    return { trip };
  });
  if (removal.paid) {
    return res.status(409).json({
      success: false,
      message: "A confirmed booking cannot be removed without handling a refund.",
    });
  }
  const { trip } = removal;
  if (!trip) {
    return res.status(404).json({ success: false, message: "Trip member not found." });
  }
  res.json({
    success: true,
    message: "Trip member removed.",
    data: {
      tripId: trip._id,
      memberId,
      currentMembers: trip.currentMembers,
      remainingSeats: Math.max(0, trip.maxMembers - trip.currentMembers),
      totalRevenue: trip.members.filter((member) => member.role === "TripMate").length * Number(trip.pricePerPerson || 0),
    },
  });
});

const deleteOrganizerTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  if (!mongoose.isObjectIdOrHexString(tripId)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID." });
  }
  const filter = { _id: tripId };
  if (req.authUser?.role !== "Admin") filter.organizer = req.authUser.id;
  const deletion = await withTransaction(async (session) => {
    const activeBooking = await BookingPayment.findOne({
      trip: tripId,
      bookingStatus: { $in: ["Accepted", "Confirmed"] },
    }).session(session);
    if (activeBooking) return { activeBooking: true };

    const trip = await Trip.findOneAndDelete(filter, { session }).select("_id title organizer members");
    if (!trip) return { trip: null };
    const recipients = [...new Set([
      asIdString(trip.organizer),
      ...(trip.members || []).map((member) => asIdString(member.user)),
    ].filter(Boolean))];
    if (recipients.length) {
      await User.updateMany(
        { _id: { $in: recipients } },
        {
          $push: {
            notifications: {
              $each: [{
                type: "trip-deleted",
                title: "Trip deleted",
                detail: `${trip.title} has been deleted.`,
                relatedTrip: trip._id,
              }],
              $sort: { createdAt: -1 },
              $slice: 100,
            },
          },
        },
        { session }
      );
    }
    await ChatConversation.updateMany(
      { trip: trip._id, status: "Active" },
      { $set: { status: "Disabled" } },
      { session }
    );
    await User.updateMany(
      { $or: [{ wishlist: trip._id }, { joinedTrips: trip._id }, { createdTrips: trip._id }] },
      { $pull: { wishlist: trip._id, joinedTrips: trip._id, createdTrips: trip._id } },
      { session }
    );
    return { trip };
  });
  if (deletion.activeBooking) {
    return res.status(409).json({
      success: false,
      message: "Resolve active bookings before deleting this trip. Pending bookings can be cancelled from the payment dashboard.",
    });
  }
  const { trip } = deletion;
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
  res.json({ success: true, message: "Trip deleted.", data: { id: trip._id } });
});

const updateTripPricePerPerson = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const rawPrice = req.body?.pricePerPerson;
  const pricePerPerson = Number(rawPrice);
  if (!mongoose.isObjectIdOrHexString(tripId)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID." });
  }
  if (
    (typeof rawPrice !== "number" && typeof rawPrice !== "string")
    || rawPrice === null
    || (typeof rawPrice === "string" && !rawPrice.trim())
    || !Number.isFinite(pricePerPerson)
    || pricePerPerson < 0
  ) {
    return res.status(400).json({ success: false, message: "Price per person must be a non-negative number." });
  }
  const filter = { _id: tripId };
  if (req.authUser?.role !== "Admin") filter.organizer = req.authUser.id;
  const trip = await Trip.findOneAndUpdate(
    filter,
    { $set: { pricePerPerson } },
    { new: true, runValidators: true }
  ).select("title pricePerPerson");
  if (!trip) {
    return res.status(404).json({ success: false, message: "Trip not found." });
  }
  res.json({ success: true, message: "Per-person price updated.", data: trip });
});

const updateOrganizerTripStatus = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { status } = req.body || {};
  if (!mongoose.isObjectIdOrHexString(tripId)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID." });
  }
  if (!["Ongoing", "Completed"].includes(status)) {
    return res.status(400).json({ success: false, message: "Trip status must be Ongoing or Completed." });
  }
  const filter = { _id: tripId };
  if (req.authUser?.role !== "Admin") filter.organizer = req.authUser.id;
  const trip = await Trip.findOne(filter).select("title status startDate endDate organizer members");
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (status === "Ongoing") {
    const startDate = new Date(trip.startDate);
    startDate.setHours(0, 0, 0, 0);
    if (!["Open", "Full"].includes(trip.status) || startDate > today) {
      return res.status(409).json({
        success: false,
        message: "A trip can be marked ongoing only on or after its start date and before it is completed or cancelled.",
      });
    }
  } else {
    const endDate = new Date(trip.endDate);
    endDate.setHours(0, 0, 0, 0);
    if (trip.status !== "Ongoing" || endDate > today) {
      return res.status(409).json({
        success: false,
        message: "A trip can be completed only after it has started and its end date has passed.",
      });
    }
  }

  trip.status = status;
  await trip.save();
  const recipientIds = [...new Set([
    asIdString(trip.organizer),
    ...(trip.members || []).map((member) => asIdString(member.user)),
  ].filter(Boolean))];
  if (recipientIds.length) {
    await User.updateMany(
      { _id: { $in: recipientIds } },
      {
        $push: {
          notifications: {
            $each: [{
              type: status === "Completed" ? "trip-completed" : "trip-ongoing",
              title: status === "Completed" ? "Trip completed" : "Trip is underway",
              detail: `${trip.title} is now ${status.toLowerCase()}.`,
              relatedTrip: trip._id,
            }],
            $sort: { createdAt: -1 },
            $slice: 100,
          },
        },
      }
    );
  }
  res.json({ success: true, message: `Trip marked ${status.toLowerCase()}.`, data: { id: trip._id, status } });
});

module.exports = {
  getOrganizerRequestTrips,
  getTripJoinRequests,
  getOrganizerDashboardStats,
  removeTripMember,
  deleteOrganizerTrip,
  updateTripPricePerPerson,
  updateOrganizerTripStatus,
};
