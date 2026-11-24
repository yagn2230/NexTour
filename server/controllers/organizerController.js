const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const Review = require("../models/Review");
const User = require("../models/userSchme");
const { asyncHandler } = require("../middleware/errorMiddleware");
const { calculateAverageRating, calculateRevenue } = require("../utils/calculateStats");

const isAdmin = (req) => req.authUser?.role === "Admin";
const organizerId = (req) => req.authUser?.id || req.session?.user?.id;
const organizerTripFilter = (req, filter = {}) => (
  isAdmin(req) ? filter : { organizer: organizerId(req), ...filter }
);

const getOrganizerTrips = (filter = {}) => asyncHandler(async (req, res) => {
  const trips = await Trip.find(organizerTripFilter(req, filter))
    .populate("members.user", "fullName username profileImage")
    .sort({ startDate: 1 });
  res.json({ success: true, count: trips.length, data: trips });
});

const getDashboard = asyncHandler(async (req, res) => {
  const userId = organizerId(req);
  const [trips, user] = await Promise.all([
    Trip.find(organizerTripFilter(req)).populate("members.user", "_id").lean(),
    isAdmin(req) ? null : User.findById(userId).select("organizerVerificationStatus organizer.status organizerVerified"),
  ]);
  const reviewFilter = {
    trip: { $in: trips.map((trip) => trip._id) },
  };
  if (!isAdmin(req)) reviewFilter.user = userId;
  const reviews = await Review.find(reviewFilter).select("rating").lean();
  const totalTravelers = new Set(
    trips.flatMap((trip) => (trip.members || [])
      .filter((member) => member.role === "TripMate" && member.user)
      .map((member) => (member.user._id || member.user).toString()))
  ).size;
  const joinRequests = trips.reduce(
    (total, trip) => total + (trip.joinRequests || []).filter((request) => request.status === "Pending").length,
    0
  );
  const verificationStatus = user?.organizerVerified || user?.organizer?.status === "Approved"
    ? "Approved"
    : user?.organizerVerificationStatus && user.organizerVerificationStatus !== "Not Applied"
      ? user.organizerVerificationStatus
      : user?.organizer?.status || "Not Applied";
  res.json({
    success: true,
    data: {
      totalTrips: trips.length,
      pendingTrips: trips.filter((trip) => trip.approvalStatus === "Pending").length,
      activeTrips: trips.filter((trip) => trip.approvalStatus === "Approved" && trip.status === "Open").length,
      completedTrips: trips.filter((trip) => trip.status === "Completed").length,
      cancelledTrips: trips.filter((trip) => trip.status === "Cancelled").length,
      joinRequests,
      travelers: totalTravelers,
      revenue: calculateRevenue(trips),
      revenueTracked: true,
      averageRating: calculateAverageRating(reviews),
      reviewsCount: reviews.length,
      verificationStatus,
    },
  });
});

const getTravelers = asyncHandler(async (req, res) => {
  const trips = await Trip.find(organizerTripFilter(req))
    .select("title startDate endDate status members organizer")
    .populate("members.user", "fullName username profileImage location");
  const travelerMap = new Map();
  for (const trip of trips) {
    for (const member of trip.members) {
      if (!member.user || member.role !== "TripMate") continue;
      const id = member.user._id.toString();
      if (!travelerMap.has(id)) {
        travelerMap.set(id, {
          user: member.user,
          trips: [],
        });
      }
      travelerMap.get(id).trips.push({
        id: trip._id,
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        status: trip.status,
      });
    }
  }
  const data = [...travelerMap.values()];
  res.json({ success: true, count: data.length, data });
});

const getOrganizerReviews = asyncHandler(async (req, res) => {
  const organizerTrips = await Trip.find(organizerTripFilter(req)).select("_id");
  const reviewFilter = {
    trip: { $in: organizerTrips.map((trip) => trip._id) },
  };
  if (!isAdmin(req)) reviewFilter.user = organizerId(req);
  const reviews = await Review.find(reviewFilter)
    .populate("reviewer", "fullName username profileImage")
    .populate("trip", "title destination country startDate")
    .sort({ createdAt: -1 });
  res.json({ success: true, count: reviews.length, data: reviews });
});

const getAnalytics = asyncHandler(async (req, res) => {
  const trips = await Trip.find(organizerTripFilter(req)).select(
    "title status approvalStatus startDate endDate totalBudget pricePerPerson members country city"
  ).lean();
  const monthlyTrips = new Map();
  for (const trip of trips) {
    const date = new Date(trip.startDate);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    monthlyTrips.set(key, (monthlyTrips.get(key) || 0) + 1);
  }
  res.json({
    success: true,
    data: {
      totalTrips: trips.length,
      completedTrips: trips.filter((trip) => trip.status === "Completed").length,
      travelers: new Set(
        trips.flatMap((trip) => (trip.members || [])
          .filter((member) => member.role === "TripMate" && member.user)
          .map((member) => (member.user._id || member.user).toString()))
      ).size,
      revenue: calculateRevenue(trips),
      revenueTracked: true,
      monthlyTrips: [...monthlyTrips.entries()]
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    },
  });
});

const getNotifications = asyncHandler(async (req, res) => {
  const user = await User.findById(organizerId(req))
    .select("notifications")
    .lean();
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  const data = [...user.notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
  res.json({ success: true, count: data.length, data });
});

module.exports = {
  getDashboard,
  getOrganizerTrips,
  getPendingTrips: getOrganizerTrips({ approvalStatus: "Pending" }),
  getCompletedTrips: getOrganizerTrips({ status: "Completed" }),
  getTravelers,
  getOrganizerReviews,
  getAnalytics,
  getNotifications,
};
