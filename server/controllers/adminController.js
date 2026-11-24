// controllers/adminController.js

const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const PlatformSettings = require("../models/PlatformSettings");
const mongoose = require("mongoose");
const { asyncHandler } = require("../middleware/errorMiddleware");
const defaultTripCategories = require("../config/defaultTripCategories");

const getAdminJoinRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const allowedStatuses = ["Pending", "Accepted", "Declined", "Cancelled"];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid join request status.",
    });
  }

  const filter = status
    ? { joinRequests: { $elemMatch: { status } } }
    : { "joinRequests.0": { $exists: true } };
  const trips = await Trip.find(filter)
    .select("title destination city state country startDate organizer joinRequests")
    .populate("organizer", "fullName email profileImage")
    .populate("joinRequests.user", "fullName username email profileImage")
    .sort({ updatedAt: -1 })
    .lean();
  const requests = trips.flatMap((trip) =>
    (trip.joinRequests || [])
      .filter((request) => !status || request.status === status)
      .map((request) => ({
        id: request._id,
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
          startDate: trip.startDate,
          organizer: trip.organizer,
        },
        user: request.user,
      }))
  ).sort((first, second) => new Date(second.requestedAt) - new Date(first.requestedAt));

  res.status(200).json({ success: true, count: requests.length, data: requests });
});

const sendAdminNotification = asyncHandler(async (req, res) => {
  const { audience, title, message } = req.body;
  if (!["all", "organizers"].includes(audience)) {
    return res.status(400).json({
      success: false,
      message: "Audience must be all or organizers.",
    });
  }
  if (typeof title !== "string" || !title.trim() || title.trim().length > 150) {
    return res.status(400).json({
      success: false,
      message: "Notification title is required and must be 150 characters or fewer.",
    });
  }
  if (typeof message !== "string" || !message.trim() || message.trim().length > 500) {
    return res.status(400).json({
      success: false,
      message: "Notification message is required and must be 500 characters or fewer.",
    });
  }

  const filter = audience === "organizers"
    ? {
      isActive: true,
      $or: [
        { organizerVerified: true },
        { "organizer.isOrganizer": true, "organizer.status": "Approved" },
        { "organizer.status": "Approved" },
      ],
    }
    : { isActive: true };
  const notification = {
    type: "admin-announcement",
    title: title.trim(),
    detail: message.trim(),
    createdAt: new Date(),
  };
  const result = await User.updateMany(
    filter,
    {
      $push: {
        notifications: {
          $each: [notification],
          $sort: { createdAt: -1 },
          $slice: 100,
        },
      },
    }
  );
  if (!result.matchedCount) {
    return res.status(404).json({
      success: false,
      message: "No active recipients were found for this announcement.",
    });
  }

  res.status(200).json({
    success: true,
    message: "Announcement sent successfully.",
    recipientCount: result.modifiedCount,
  });
});

// Get a trip for the admin trip-management screens
const getTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid trip ID.",
    });
  }

  const trip = await Trip.findById(id)
    .populate("organizer", "fullName email profileImage")
    .populate("members.user", "fullName email profileImage");

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  res.status(200).json({ success: true, trip });
});

// Update editable trip fields from the admin trip-management screen
const updateTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid trip ID.",
    });
  }

  const trip = await Trip.findById(id);
  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }
  const categoriesToValidate = [];
  if (req.body.category !== undefined) categoriesToValidate.push(req.body.category);
  if (Array.isArray(req.body.itinerary)) {
    for (const day of req.body.itinerary) {
      if (Array.isArray(day?.activities)) {
        categoriesToValidate.push(...day.activities.map((activity) => activity.category).filter(Boolean));
      }
    }
  }
  if (categoriesToValidate.length) {
    const settings = await PlatformSettings.findOne({ key: "main" }).select("tripCategories").lean();
    const categories = settings?.tripCategories?.length ? settings.tripCategories : defaultTripCategories;
    if (categoriesToValidate.some((category) => !categories.includes(category))) {
      return res.status(400).json({ success: false, message: "Choose an active trip or activity category." });
    }
  }
  if (req.body.isFeatured === true && trip.approvalStatus !== "Approved") {
    return res.status(409).json({
      success: false,
      message: "Only approved trips can be featured.",
    });
  }

  const editableFields = [
    "title",
    "description",
    "destination",
    "category",
    "coverImage",
    "startDate",
    "endDate",
    "totalBudget",
    "pricePerPerson",
    "maxMembers",
    "itinerary",
    "status",
    "isPublic",
    "isFeatured",
  ];

  for (const field of editableFields) {
    if (req.body[field] !== undefined) trip[field] = req.body[field];
  }

  const updatedTrip = await trip.save();
  await updatedTrip.populate("organizer", "fullName email profileImage");
  await updatedTrip.populate("members.user", "fullName email profileImage");

  res.status(200).json({
    success: true,
    message: "Trip updated successfully.",
    trip: updatedTrip,
  });
});

// Get Pending Trips
const getPendingTrips = asyncHandler(async (req, res) => {
  const pendingTrips = await Trip.find({
    approvalStatus: "Pending",
  })
    .populate("organizer", "fullName email profileImage")
    .populate("members.user", "fullName email profileImage")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: pendingTrips.length,
    trips: pendingTrips,
  });
});

const getOrganizerRequests = asyncHandler(async (req, res) => {
  const users = await User.find({ "organizer.status": "Pending" })
    .select("-password")
    .sort({ "organizer.appliedAt": 1 });

  res.status(200).json({
    success: true,
    count: users.length,
    users,
  });
});

const approveOrganizer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }
  if (user.organizer.status !== "Pending") {
    return res.status(409).json({
      success: false,
      message: "Only pending organizer requests can be approved.",
    });
  }

  user.organizer.isOrganizer = true;
  user.organizer.status = "Approved";
  user.organizer.verifiedAt = new Date();
  user.organizerVerified = true;
  user.isOrganizer = true;
  user.organizerVerificationStatus = "Approved";
  await user.save();
  const approvedUser = await User.findById(user._id).select("-password");
  res.status(200).json({
    success: true,
    message: "Organizer approved successfully.",
    user: approvedUser,
  });
});

const rejectOrganizer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }
  if (user.organizer.status !== "Pending") {
    return res.status(409).json({
      success: false,
      message: "Only pending organizer requests can be rejected.",
    });
  }

  user.organizer.isOrganizer = false;
  user.organizer.status = "Rejected";
  user.organizer.verifiedAt = null;
  user.organizerVerified = false;
  user.isOrganizer = false;
  user.organizerVerificationStatus = "Rejected";
  await user.save();
  const rejectedUser = await User.findById(user._id).select("-password");
  res.status(200).json({
    success: true,
    message: "Organizer request rejected.",
    user: rejectedUser,
  });
});

const revokeOrganizer = asyncHandler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid user ID." });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  if (user.organizer?.status !== "Approved" && !user.organizerVerified && !user.isOrganizer) {
    return res.status(409).json({ success: false, message: "This account does not have organizer privileges." });
  }

  user.organizerVerified = false;
  user.isOrganizer = false;
  user.organizerVerificationStatus = "Not Applied";
  user.organizer = user.organizer || {};
  user.organizer.isOrganizer = false;
  user.organizer.status = "Not Applied";
  user.organizer.verifiedAt = null;
  user.notifications.unshift({
    type: "organizer-access-removed",
    title: "Organizer access updated",
    detail: "Your organizer privileges have been removed. You can apply again from your profile.",
  });
  if (user.notifications.length > 100) user.notifications.splice(100);
  await user.save();

  res.json({
    success: true,
    message: "Organizer privileges removed.",
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      organizer: user.organizer,
    },
  });
});

// Get Approved Trips
const getApprovedTrips = asyncHandler(async (req, res) => {
  const approvedTrips = await Trip.find({
    approvalStatus: "Approved",
  })
    .populate("organizer", "fullName email profileImage")
    .populate("members.user", "fullName email profileImage")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: approvedTrips.length,
    trips: approvedTrips,
  });
});

// Get Rejected Trips
const getRejectedTrips = asyncHandler(async (req, res) => {
  const rejectedTrips = await Trip.find({
    approvalStatus: "Rejected",
  })
    .populate("organizer", "fullName email profileImage")
    .populate("members.user", "fullName email profileImage")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: rejectedTrips.length,
    trips: rejectedTrips,
  });
});

// Approve Trip
const approveTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const trip = await Trip.findById(id);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  const updatedTrip = await Trip.findByIdAndUpdate(
    id,
    { $set: { approvalStatus: "Approved", status: "Open" } },
    { new: true, runValidators: true }
  );

  await updatedTrip.populate(
    "organizer",
    "fullName email profileImage"
  );

  res.status(200).json({
    success: true,
    message: "Trip approved successfully.",
    trip: updatedTrip,
  });
});

// Reject Trip
const rejectTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = "" } = req.body;

  const trip = await Trip.findById(id);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  trip.approvalStatus = "Rejected";
  trip.isFeatured = false;

  // Only use this if your Trip schema has rejectionReason
  if (reason && trip.schema.path("rejectionReason")) {
    trip.rejectionReason = reason;
  }

  const updatedTrip = await trip.save();

  await updatedTrip.populate(
    "organizer",
    "fullName email profileImage"
  );

  res.status(200).json({
    success: true,
    message: "Trip rejected successfully.",
    trip: updatedTrip,
  });
});

// Delete Trip
const deleteTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const trip = await Trip.findById(id);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  await Trip.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Trip deleted successfully.",
  });
});

// Restore Trip
const restoreTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const trip = await Trip.findById(id);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  // Restore rejected trip to pending for admin review
  trip.approvalStatus = "Pending";
  trip.isFeatured = false;

  const restoredTrip = await trip.save();

  await restoredTrip.populate(
    "organizer",
    "fullName email profileImage"
  );

  res.status(200).json({
    success: true,
    message: "Trip restored to pending successfully.",
    trip: restoredTrip,
  });
});

module.exports = {
  getAdminJoinRequests,
  sendAdminNotification,
  getTrip,
  updateTrip,
  getPendingTrips,
  getOrganizerRequests,
  approveOrganizer,
  rejectOrganizer,
  revokeOrganizer,
  getApprovedTrips,
  getRejectedTrips,
  approveTrip,
  rejectTrip,
  deleteTrip,
  restoreTrip,
};