const mongoose = require("mongoose");
const Review = require("../models/Review");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const { asyncHandler } = require("../middleware/errorMiddleware");
const { calculateAverageRating } = require("../utils/calculateStats");

const createReview = asyncHandler(async (req, res) => {
  const { userId, tripId, rating, comment = "" } = req.body;
  const reviewerId = req.authUser?.id || req.session?.user?.id;
  if (!mongoose.isObjectIdOrHexString(userId) || !mongoose.isObjectIdOrHexString(tripId)) {
    return res.status(400).json({ success: false, message: "Valid userId and tripId are required." });
  }
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ success: false, message: "Rating must be an integer from 1 to 5." });
  }
  if (typeof comment !== "string" || comment.length > 2000) {
    return res.status(400).json({ success: false, message: "Comment must be 2000 characters or fewer." });
  }
  if (userId === reviewerId) {
    return res.status(400).json({ success: false, message: "You cannot review yourself." });
  }
  const [trip, targetUser] = await Promise.all([
    Trip.findById(tripId),
    User.findById(userId),
  ]);
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
  if (!targetUser) return res.status(404).json({ success: false, message: "User not found." });
  if (trip.status !== "Completed") {
    return res.status(403).json({ success: false, message: "Reviews are allowed only after a trip is completed." });
  }
  const reviewerParticipated = trip.organizer.toString() === reviewerId
    || trip.members.some((member) => member.user.toString() === reviewerId);
  const targetParticipated = trip.organizer.toString() === userId
    || trip.members.some((member) => member.user.toString() === userId);
  if (!reviewerParticipated || !targetParticipated) {
    return res.status(403).json({ success: false, message: "Both users must have participated in the completed trip." });
  }

  let review;
  try {
    review = await Review.create({
      reviewer: reviewerId,
      user: userId,
      trip: tripId,
      rating: Number(rating),
      comment: comment.trim(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already reviewed this user for this trip." });
    }
    throw error;
  }
  targetUser.reviews.addToSet(review._id);
  const ratings = await Review.find({ user: userId }).select("rating");
  targetUser.averageRating = calculateAverageRating(ratings);
  targetUser.notifications.unshift({
    type: "review-received",
    title: "New review received",
    detail: `${req.authUser?.fullName || req.session?.user?.fullName || "A traveler"} left you a ${Number(rating)}-star review for ${trip.title}.`,
    relatedTrip: trip._id,
  });
  if (targetUser.notifications.length > 100) targetUser.notifications.splice(100);
  await targetUser.save();
  await review.populate([
    { path: "reviewer", select: "fullName username profileImage" },
    { path: "user", select: "fullName username profileImage" },
    { path: "trip", select: "title destination country" },
  ]);
  res.status(201).json({ success: true, message: "Review created successfully.", data: review });
});

const getReviewsForUser = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.authUser?.id || req.session?.user?.id;
  if (!mongoose.isObjectIdOrHexString(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID." });
  }
  const reviews = await Review.find({ user: userId })
    .populate("reviewer", "fullName username profileImage")
    .populate("trip", "title destination country startDate")
    .sort({ createdAt: -1 });
  res.json({ success: true, count: reviews.length, data: reviews });
});

const getMyTripReviews = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const reviewerId = req.authUser?.id || req.session?.user?.id;
  if (!mongoose.isObjectIdOrHexString(tripId)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID." });
  }
  const trip = await Trip.findById(tripId).select("organizer members status");
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
  const isParticipant = trip.organizer.toString() === reviewerId
    || trip.members.some((member) => member.user.toString() === reviewerId);
  if (!isParticipant) {
    return res.status(403).json({ success: false, message: "Only trip participants can view their reviews for this trip." });
  }
  const reviews = await Review.find({ trip: tripId, reviewer: reviewerId })
    .populate("user", "fullName username profileImage")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, count: reviews.length, data: reviews });
});

const deleteReview = asyncHandler(async (req, res) => {
  const reviewId = req.params.reviewId || req.body.reviewId;
  if (!mongoose.isObjectIdOrHexString(reviewId)) {
    return res.status(400).json({ success: false, message: "Invalid review ID." });
  }
  const review = await Review.findById(reviewId);
  if (!review) return res.status(404).json({ success: false, message: "Review not found." });
  const reviewerId = req.authUser?.id || req.session?.user?.id;
  const role = req.authUser?.role || req.session?.user?.role;
  if (review.reviewer.toString() !== reviewerId && role !== "Admin") {
    return res.status(403).json({ success: false, message: "You may delete only your own reviews." });
  }
  await review.deleteOne();
  const target = await User.findById(review.user);
  if (target) {
    target.reviews.pull(review._id);
    const ratings = await Review.find({ user: target._id }).select("rating");
    target.averageRating = calculateAverageRating(ratings);
    await target.save();
  }
  res.json({ success: true, message: "Review deleted successfully." });
});

module.exports = { createReview, getReviewsForUser, getMyTripReviews, deleteReview };
