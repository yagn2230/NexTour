const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/userSchme");
const Trip = require("../models/Trip");
const Review = require("../models/Review");
const BookingPayment = require("../models/BookingPayment");
const { asyncHandler } = require("../middleware/errorMiddleware");
const {
  getPublicProfile,
} = require("../services/profileService");
const { calculateAverageRating, calculateTravelPoints, calculateRevenue } = require("../utils/calculateStats");
const { calculateTravelerReliability } = require("../utils/travelerReliability");
const {
  removeProfileImage,
  storeProfileImage,
} = require("../services/profileImageStorage");

const requestUserId = (req) => req.authUser?.id || req.session?.user?.id;

const getMyProfile = asyncHandler(async (req, res) => {
  const userId = requestUserId(req);
  const user = await User.findById(userId)
    .select("-password")
    .populate({ path: "wishlist", select: "title destination country city coverImage startDate endDate" });
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  const [trips, reviews, bookingHistory] = await Promise.all([
    Trip.find({ $or: [{ organizer: userId }, { "members.user": userId }] })
      .populate("organizer", "fullName username profileImage")
      .populate("members.user", "fullName username profileImage location")
      .populate("joinRequests.user", "fullName username email phone profileImage location city country")
      .sort({ startDate: 1 }),
    Review.find({ user: userId })
      .populate("reviewer", "fullName username profileImage")
      .populate("trip", "title destination country startDate")
      .sort({ createdAt: -1 }),
    BookingPayment.find({ traveler: userId })
      .select("trip attendanceStatus cancellationBy bookingStatus")
      .populate("trip", "status")
      .lean(),
  ]);
  const userIdString = userId.toString();
  const createdTrips = trips.filter((trip) => trip.organizer?._id?.toString() === userIdString);
  const joinedTrips = trips.filter((trip) =>
    trip.organizer?._id?.toString() !== userIdString
    && trip.members.some((member) => member.user?._id?.toString() === userIdString)
  );
  const now = new Date();
  const participatingTrips = [...createdTrips, ...joinedTrips];
  const upcomingTrips = participatingTrips.filter(
    (trip) => new Date(trip.startDate) >= now && trip.status !== "Completed" && trip.status !== "Cancelled"
  );
  const completedTrips = participatingTrips.filter((trip) => trip.status === "Completed");
  const noShowCount = Math.max(
    Number(user.noShowCount || 0),
    bookingHistory.filter((booking) => booking.attendanceStatus === "No-Show").length
  );
  const reliability = calculateTravelerReliability(bookingHistory, noShowCount);
  const bookingTripIds = new Set(bookingHistory.map((booking) => booking.trip?._id?.toString() || booking.trip?.toString()));
  const legacyJoinedTrips = joinedTrips.filter((trip) => !bookingTripIds.has(trip._id.toString()));
  const countriesVisited = [...new Set(completedTrips.map((trip) => trip.country).filter(Boolean))];
  const citiesVisited = [...new Set(completedTrips.map((trip) => trip.city || trip.destination).filter(Boolean))];
  const statistics = {
    ...reliability,
    totalTripsJoined: bookingHistory.length + legacyJoinedTrips.length,
    totalTripsCreated: createdTrips.length,
    completedTrips: reliability.tripsCompleted + legacyJoinedTrips.filter((trip) => trip.status === "Completed").length,
    countriesVisited,
    citiesVisited,
    travelPoints: calculateTravelPoints({
      completedTrips: completedTrips.length,
      tripsJoined: joinedTrips.length,
      tripsCreated: createdTrips.length,
    }),
    averageRating: calculateAverageRating(reviews),
    reviewsCount: reviews.length,
    badgesCount: user.badges.length,
    achievementsCount: user.achievements.length,
  };
  const pendingTrips = createdTrips.filter((trip) => trip.approvalStatus === "Pending");
  const activeTrips = createdTrips.filter(
    (trip) => trip.approvalStatus === "Approved" && trip.status === "Open"
  );
  const travelHistory = participatingTrips
    .filter((trip) => trip.status === "Completed")
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  const joinRequests = createdTrips.flatMap((trip) =>
    trip.joinRequests
      .filter((request) => request.status === "Pending")
      .map((request) => ({
        id: request._id,
        tripId: trip._id,
        trip: trip.title,
        name: request.user?.fullName || "Traveler",
        user: request.user,
        avatar: request.user?.profileImage || "",
        note: request.message,
        status: request.status,
        email: request.user?.email || "",
        phone: request.user?.phone || "",
        location: request.user?.location || "",
        city: request.user?.city || "",
        country: request.user?.country || "",
        requestedAt: request.requestedAt,
      }))
  );
  const travelerMap = new Map();
  for (const trip of createdTrips) {
    for (const member of trip.members) {
      if (!member.user || member.user._id.toString() === userIdString) continue;
      const travelerId = member.user._id.toString();
      const traveler = travelerMap.get(travelerId) || {
        id: travelerId,
        name: member.user.fullName,
        avatar: member.user.profileImage || "",
        location: member.user.location || "",
        trips: [],
      };
      traveler.trips.push({ id: trip._id, title: trip.title, startDate: trip.startDate, status: trip.status });
      travelerMap.set(travelerId, traveler);
    }
  }
  const completedDestinations = new Map();
  for (const trip of completedTrips) {
    const destination = trip.city || trip.destination;
    if (!destination) continue;
    const key = `${destination}\u0000${trip.country || ""}`;
    const entry = completedDestinations.get(key) || { name: destination, country: trip.country || "", visits: 0 };
    entry.visits += 1;
    completedDestinations.set(key, entry);
  }
  const verificationStatus = user.organizerVerified || user.organizer?.status === "Approved"
    ? "Approved"
    : user.organizerVerificationStatus !== "Not Applied"
      ? user.organizerVerificationStatus
      : user.organizer?.status || "Not Applied";
  const notifications = [...user.notifications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);
  const data = {
    user: {
      id: user._id,
      fullName: user.fullName,
      username: user.username || "",
      email: user.email,
      phone: user.phone,
      noShowRestrictedUntil: user.noShowRestrictedUntil,
      city: user.city,
      country: user.country,
      profileImage: user.profileImage,
      coverImage: user.coverImage,
      bio: user.bio,
      location: user.location,
      travelPreferences: user.travelPreferences,
      languages: user.languages,
      socialLinks: user.socialLinks,
      memberSince: user.memberSince || user.createdAt,
      averageRating: statistics.averageRating,
      reviewsCount: statistics.reviewsCount,
      isVerified: user.isVerified,
      gallery: user.gallery,
      badges: user.badges,
      achievements: user.achievements,
    },
    statistics,
    trips: {
      upcoming: upcomingTrips,
      joined: joinedTrips,
      completed: completedTrips,
      created: createdTrips,
      pending: pendingTrips,
      active: activeTrips,
      history: travelHistory,
    },
    wishlist: user.wishlist,
    favoriteDestinations: [...completedDestinations.values()]
      .sort((a, b) => b.visits - a.visits),
    reviews,
    organizer: {
      status: verificationStatus,
      verified: verificationStatus === "Approved",
      experience: user.organizer?.experience || "",
      dashboard: {
        totalTrips: createdTrips.length,
        activeTrips: activeTrips.length,
        pendingTrips: pendingTrips.length,
        completedTrips: createdTrips.filter((trip) => trip.status === "Completed").length,
        travelers: travelerMap.size,
        averageRating: statistics.averageRating,
        reviewsCount: reviews.length,
        joinRequestsCount: joinRequests.length,
        pendingRequests: createdTrips.reduce((count, trip) => count + trip.joinRequests.filter((request) => request.status === "Pending").length, 0),
        acceptedRequests: createdTrips.reduce((count, trip) => count + trip.joinRequests.filter((request) => request.status === "Accepted").length, 0),
        rejectedRequests: createdTrips.reduce((count, trip) => count + trip.joinRequests.filter((request) => ["Declined", "Rejected"].includes(request.status)).length, 0),
        totalMembers: createdTrips.reduce((count, trip) => count + trip.members.filter((member) => member.role === "TripMate").length, 0),
        revenue: calculateRevenue(createdTrips),
        revenueTracked: true,
      },
      joinRequests,
      travelers: [...travelerMap.values()],
      notifications,
      documents: user.organizer?.documents || [],
      analytics: {
        totalTrips: createdTrips.length,
        completedTrips: createdTrips.filter((trip) => trip.status === "Completed").length,
        travelers: travelerMap.size,
      },
    },
  };
  res.json({ success: true, data });
});

const getPublicUserProfile = asyncHandler(async (req, res) => {
  const identifier = req.params.identifier || req.query.username || req.query.userId;
  if (typeof identifier !== "string" || !identifier.trim()) {
    return res.status(400).json({
      success: false,
      message: "Provide a public profile username or userId.",
    });
  }
  const profile = await getPublicProfile(identifier.trim());
  if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
  res.json({ success: true, data: profile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const editableFields = [
    "fullName", "username", "email", "phone", "bio", "location", "city", "country", "gender", "dob",
    "languages", "travelPreferences", "socialLinks", "emergencyContact",
    "gallery",
  ];
  const updates = Object.fromEntries(
    editableFields
      .filter((field) => req.body[field] !== undefined)
      .map((field) => [field, req.body[field]])
  );
  if (req.body.organizerExperience !== undefined) {
    const user = await User.findById(requestUserId(req)).select("role organizerVerified organizer.status");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const verifiedOrganizer = user.organizerVerified || user.organizer?.status === "Approved";
    if (!verifiedOrganizer && user.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Only verified organizers can update organizer experience." });
    }
    updates["organizer.experience"] = req.body.organizerExperience;
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ success: false, message: "Provide at least one profile field to update." });
  }
  if (updates.username) {
    updates.username = updates.username.trim().toLowerCase();
    const existing = await User.findOne({ username: updates.username, _id: { $ne: requestUserId(req) } });
    if (existing) return res.status(409).json({ success: false, message: "Username is already in use." });
  }
  if (updates.email) updates.email = updates.email.trim().toLowerCase();

  const user = await User.findByIdAndUpdate(
    requestUserId(req),
    { $set: updates },
    { new: true, runValidators: true }
  ).select("-password");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });

  res.json({
    success: true,
    message: "Profile updated successfully.",
    data: user,
  });
});

const updateProfileImage = (field) => asyncHandler(async (req, res) => {
  const uploadedFile = req.file
    || req.files?.[field]?.[0]
    || req.files?.image?.[0];
  if (!uploadedFile) {
    return res.status(400).json({ success: false, message: "An image file is required in the image field." });
  }
  const user = await User.findById(requestUserId(req));
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }
  const priorImage = user[field];
  const imageUrl = await storeProfileImage(uploadedFile);
  user[field] = imageUrl;
  try {
    await user.save();
  } catch (error) {
    await removeProfileImage(imageUrl);
    throw error;
  }
  await removeProfileImage(priorImage);
  res.json({ success: true, message: "Image updated successfully.", data: { [field]: imageUrl } });
});

const deleteProfileImage = (field) => asyncHandler(async (req, res) => {
  const user = await User.findById(requestUserId(req));
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  const priorImage = user[field];
  user[field] = "";
  await user.save();
  await removeProfileImage(priorImage);
  res.json({ success: true, message: "Image deleted successfully.", data: { [field]: "" } });
});

const getTrips = (filter) => asyncHandler(async (req, res) => {
  const userId = requestUserId(req);
  const trips = await Trip.find({
    $and: [
      { $or: [{ organizer: userId }, { "members.user": userId }] },
      filter,
    ],
  })
    .populate("organizer", "fullName username profileImage")
    .populate("members.user", "fullName username profileImage")
    .sort({ startDate: 1 });
  res.json({ success: true, count: trips.length, data: trips });
});

const getJoinedTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({
    "members.user": requestUserId(req),
    organizer: { $ne: requestUserId(req) },
  })
    .populate("organizer", "fullName username profileImage")
    .sort({ startDate: -1 });
  res.json({ success: true, count: trips.length, data: trips });
});

const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(requestUserId(req))
    .populate({ path: "wishlist", select: "title destination country city coverImage startDate endDate status" });
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  res.json({ success: true, count: user.wishlist.length, data: user.wishlist });
});

const addWishlistItem = asyncHandler(async (req, res) => {
  const tripId = req.body.tripId || req.params.tripId;
  if (!mongoose.isObjectIdOrHexString(tripId)) {
    return res.status(400).json({ success: false, message: "A valid tripId is required." });
  }
  const [userExists, trip] = await Promise.all([
    User.exists({ _id: requestUserId(req) }),
    Trip.findById(tripId),
  ]);
  if (!userExists) return res.status(404).json({ success: false, message: "User not found." });
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
  const result = await User.updateOne(
    { _id: requestUserId(req), wishlist: { $ne: trip._id } },
    { $addToSet: { wishlist: trip._id } }
  );
  if (!result.matchedCount) {
    return res.status(409).json({ success: false, message: "Trip is already in your wishlist." });
  }
  res.status(201).json({ success: true, message: "Trip added to wishlist.", data: { tripId } });
});

const removeWishlistItem = asyncHandler(async (req, res) => {
  const tripId = req.body?.tripId || req.params?.tripId || req.query?.tripId;
  if (!mongoose.isObjectIdOrHexString(tripId)) {
    return res.status(400).json({ success: false, message: "A valid tripId is required." });
  }
  const result = await User.updateOne(
    { _id: requestUserId(req) },
    { $pull: { wishlist: tripId } }
  );
  if (!result.matchedCount) return res.status(404).json({ success: false, message: "User not found." });
  res.json({ success: true, message: "Trip removed from wishlist." });
});

const getFavoriteDestinations = asyncHandler(async (req, res) => {
  const userId = requestUserId(req);
  const trips = await Trip.find({
    $or: [{ organizer: userId }, { "members.user": userId }],
    status: "Completed",
  })
    .select("country city destination");
  const counts = new Map();
  for (const trip of trips) {
    const destination = trip.city || trip.destination;
    if (destination) {
      const key = `${destination}, ${trip.country || ""}`.trim().replace(/, $/, "");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  const data = [...counts.entries()]
    .map(([destination, tripsCount]) => ({ destination, tripsCount }))
    .sort((a, b) => b.tripsCount - a.tripsCount);
  res.json({ success: true, data });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.notificationId)) {
    return res.status(400).json({ success: false, message: "Invalid notification ID." });
  }
  const result = await User.updateOne(
    {
      _id: requestUserId(req),
      "notifications._id": req.params.notificationId,
    },
    { $set: { "notifications.$.readAt": new Date() } }
  );
  if (!result.matchedCount) {
    return res.status(404).json({ success: false, message: "Notification not found." });
  }
  res.json({ success: true, message: "Notification marked as read." });
});

const deleteNotification = asyncHandler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.notificationId)) {
    return res.status(400).json({ success: false, message: "Invalid notification ID." });
  }
  const result = await User.updateOne(
    { _id: requestUserId(req), "notifications._id": req.params.notificationId },
    { $pull: { notifications: { _id: req.params.notificationId } } }
  );
  if (!result.modifiedCount) {
    return res.status(404).json({ success: false, message: "Notification not found." });
  }
  res.json({ success: true, message: "Notification deleted." });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(requestUserId(req)).select("+password");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  const currentPasswordMatches = await bcrypt.compare(currentPassword, user.password);
  if (!currentPasswordMatches) {
    return res.status(400).json({ success: false, message: "Current password is incorrect." });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ success: false, message: "Choose a new password different from your current password." });
  }
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ success: true, message: "Password changed successfully." });
});

const getTravelHistory = getTrips({ status: "Completed" });
const getUpcomingTripsNow = asyncHandler(async (req, res) => {
  const trips = await Trip.find({
    $and: [
      { $or: [{ organizer: requestUserId(req) }, { "members.user": requestUserId(req) }] },
      { startDate: { $gte: new Date() }, status: { $nin: ["Completed", "Cancelled"] } },
    ],
  })
    .populate("organizer", "fullName username profileImage")
    .populate("members.user", "fullName username profileImage")
    .sort({ startDate: 1 });
  res.json({ success: true, count: trips.length, data: trips });
});

module.exports = {
  getMyProfile,
  getPublicUserProfile,
  updateProfile,
  updateProfileImage,
  deleteProfileImage,
  getUpcomingTrips: getUpcomingTripsNow,
  getCompletedTrips: getTrips({ status: "Completed" }),
  getJoinedTrips,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  getFavoriteDestinations,
  getTravelHistory,
  markNotificationRead,
  deleteNotification,
  changePassword,
};
