const mongoose = require("mongoose");
const Report = require("../models/Report");
const Review = require("../models/Review");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const { asyncHandler } = require("../middleware/errorMiddleware");
const { calculateAverageRating } = require("../utils/calculateStats");

const targetModels = { User, Trip, Review };

const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, contextTripId } = req.body;
  const reporterId = req.authUser?.id || req.session?.user?.id;
  if (!Object.hasOwn(targetModels, targetType) || !mongoose.isObjectIdOrHexString(targetId)) {
    return res.status(400).json({ success: false, message: "Choose a valid user, trip, or review to report." });
  }
  if (typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000) {
    return res.status(400).json({ success: false, message: "Report reason must contain 3 to 1000 characters." });
  }
  if (targetType === "User" && targetId === reporterId) {
    return res.status(400).json({ success: false, message: "You cannot report your own account." });
  }

  const target = await targetModels[targetType].findById(targetId);
  if (!target) {
    return res.status(404).json({ success: false, message: "The reported content was not found." });
  }
  if (targetType === "User" && target.role === "Admin") {
    return res.status(400).json({ success: false, message: "Administrator accounts cannot be reported here." });
  }
  let relatedOrganizer = null;
  if (contextTripId !== undefined) {
    if (!["Trip", "User"].includes(targetType) || !mongoose.isObjectIdOrHexString(contextTripId)) {
      return res.status(400).json({ success: false, message: "Choose a valid joined trip for this report." });
    }
    const contextTrip = targetType === "Trip" && contextTripId === targetId
      ? target
      : await Trip.findById(contextTripId);
    if (!contextTrip) {
      return res.status(404).json({ success: false, message: "The joined trip was not found." });
    }
    if (targetType === "Trip" && contextTrip._id.toString() !== targetId) {
      return res.status(400).json({ success: false, message: "A trip report must target its joined trip." });
    }
    if (targetType === "User" && contextTrip.organizer?.toString() !== targetId) {
      return res.status(400).json({ success: false, message: "The reported organizer does not organize this trip." });
    }
    const isAcceptedTraveler = (contextTrip.joinRequests || []).some(
      (request) => request.user?.toString() === reporterId.toString() && request.status === "Accepted"
    );
    if (!isAcceptedTraveler) {
      return res.status(403).json({ success: false, message: "Only an accepted Trip Mate can report this trip or its organizer." });
    }
    if (targetType === "Trip") relatedOrganizer = contextTrip.organizer;
  }
  const existingReport = await Report.findOne({
    reporter: reporterId,
    targetType,
    target: targetId,
    status: "Open",
  }).select("_id");
  if (existingReport) {
    return res.status(409).json({ success: false, message: "You already have an open report for this content." });
  }

  const report = await Report.create({
    reporter: reporterId,
    targetType,
    target: targetId,
    relatedOrganizer,
    reason: reason.trim(),
  });
  res.status(201).json({
    success: true,
    message: "Report submitted for administrator review.",
    data: { id: report._id, status: report.status },
  });
});

const getReports = asyncHandler(async (req, res) => {
  const { status, targetType } = req.query;
  if (status && !["Open", "Resolved", "Dismissed"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid report status." });
  }
  if (targetType && !Object.hasOwn(targetModels, targetType)) {
    return res.status(400).json({ success: false, message: "Invalid report target type." });
  }
  const filter = {};
  if (status) filter.status = status;
  if (targetType) filter.targetType = targetType;
  const reports = await Report.find(filter)
    .populate("reporter", "fullName email profileImage")
    .populate("target", "fullName email title destination city comment rating")
    .populate("relatedOrganizer", "fullName email")
    .populate("moderator", "fullName")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  res.json({ success: true, count: reports.length, data: reports });
});

const updateReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status, resolution = "" } = req.body;
  if (!mongoose.isObjectIdOrHexString(reportId)) {
    return res.status(400).json({ success: false, message: "Invalid report ID." });
  }
  if (!["Resolved", "Dismissed"].includes(status)) {
    return res.status(400).json({ success: false, message: "Report status must be Resolved or Dismissed." });
  }
  if (typeof resolution !== "string" || resolution.trim().length > 1000) {
    return res.status(400).json({ success: false, message: "Resolution must be 1000 characters or fewer." });
  }
  const report = await Report.findOneAndUpdate(
    { _id: reportId, status: "Open" },
    {
      $set: {
        status,
        resolution: resolution.trim(),
        moderator: req.authUser?.id || req.session?.user?.id,
      },
    },
    { new: true, runValidators: true }
  );
  if (!report) {
    return res.status(404).json({ success: false, message: "Open report not found." });
  }
  res.json({ success: true, message: `Report ${status.toLowerCase()}.`, data: report });
});

const moderateReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { action } = req.body;
  if (!mongoose.isObjectIdOrHexString(reportId)) {
    return res.status(400).json({ success: false, message: "Invalid report ID." });
  }
  const report = await Report.findOne({ _id: reportId, status: "Open" });
  if (!report) return res.status(404).json({ success: false, message: "Open report not found." });

  const targetId = report.target.toString();
  let resolution;
  const suspendAccount = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "Reported user no longer exists." });
    if (user.role === "Admin") {
      return res.status(400).json({ success: false, message: "Administrator accounts cannot be suspended through reports." });
    }
    user.isActive = false;
    user.organizerVerified = false;
    user.isOrganizer = false;
    user.organizerVerificationStatus = "Not Applied";
    user.organizer = user.organizer || {};
    user.organizer.isOrganizer = false;
    user.organizer.status = "Not Applied";
    user.organizer.verifiedAt = null;
    await user.save();
    return null;
  };
  if (action === "suspend-user" && report.targetType === "User") {
    const errorResponse = await suspendAccount(targetId);
    if (errorResponse) return errorResponse;
    resolution = "Reported user account suspended.";
  } else if (action === "suspend-organizer" && report.targetType === "Trip" && report.relatedOrganizer) {
    const errorResponse = await suspendAccount(report.relatedOrganizer.toString());
    if (errorResponse) return errorResponse;
    resolution = "Reported trip organizer account suspended.";
  } else if (action === "hide-trip" && report.targetType === "Trip") {
    const trip = await Trip.findByIdAndUpdate(
      targetId,
      { $set: { isPublic: false } },
      { new: true, runValidators: true }
    );
    if (!trip) return res.status(404).json({ success: false, message: "Reported trip no longer exists." });
    resolution = "Reported trip hidden from public listings.";
  } else if (action === "delete-review" && report.targetType === "Review") {
    const review = await Review.findById(targetId);
    if (!review) return res.status(404).json({ success: false, message: "Reported review no longer exists." });
    const targetUser = await User.findById(review.user);
    await review.deleteOne();
    if (targetUser) {
      targetUser.reviews.pull(review._id);
      const ratings = await Review.find({ user: targetUser._id }).select("rating");
      targetUser.averageRating = calculateAverageRating(ratings);
      await targetUser.save();
    }
    resolution = "Reported review removed.";
  } else {
    return res.status(400).json({ success: false, message: "That moderation action does not match the reported content." });
  }

  report.status = "Resolved";
  report.moderator = req.authUser?.id || req.session?.user?.id;
  report.resolution = resolution;
  await report.save();
  res.json({ success: true, message: resolution, data: { id: report._id, status: report.status } });
});

module.exports = { createReport, getReports, updateReport, moderateReport };
