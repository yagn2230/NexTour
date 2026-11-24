const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { test } = require("node:test");
const Review = require("../models/Review");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const { createReview, deleteReview, getMyTripReviews } = require("../controllers/reviewController");

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

test("bearer-authenticated participants can review after completion and retrieve their trip reviews", async () => {
  const originals = {
    tripFindById: Trip.findById,
    reviewCreate: Review.create,
    reviewFind: Review.find,
    userFindById: User.findById,
  };
  const reviewerId = new mongoose.Types.ObjectId();
  const targetId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const reviewId = new mongoose.Types.ObjectId();
  const review = {
    _id: reviewId,
    populate: async () => {},
  };
  let created;
  const target = {
    reviews: { addToSet: () => {} },
    notifications: [],
    save: async () => {},
  };

  try {
    Trip.findById = async () => ({
      _id: tripId,
      title: "Completed review trip",
      organizer: reviewerId,
      members: [{ user: targetId }],
      status: "Completed",
    });
    Review.create = async (data) => {
      created = data;
      return review;
    };
    Review.find = () => ({ select: async () => [{ rating: 5 }] });
    User.findById = async () => target;

    const createResponse = await invoke(createReview, {
      authUser: { id: reviewerId.toString(), fullName: "Traveler", role: "User" },
      body: { userId: targetId.toString(), tripId: tripId.toString(), rating: 5, comment: "Great trip" },
    });
    assert.equal(createResponse.statusCode, 201);
    assert.equal(created.reviewer, reviewerId.toString());
    assert.equal(created.user, targetId.toString());
    assert.equal(created.trip, tripId.toString());

    const trip = {
      organizer: reviewerId,
      members: [{ user: targetId }],
    };
    Trip.findById = () => ({ select: async () => trip });
    Review.find = () => ({
      populate() { return this; },
      sort() { return this; },
      lean: async () => [{ _id: reviewId, user: targetId }],
    });
    const listResponse = await invoke(getMyTripReviews, {
      authUser: { id: reviewerId.toString() },
      params: { tripId: tripId.toString() },
    });
    assert.equal(listResponse.body.count, 1);
    assert.equal(listResponse.body.data[0]._id, reviewId);
  } finally {
    Trip.findById = originals.tripFindById;
    Review.create = originals.reviewCreate;
    Review.find = originals.reviewFind;
    User.findById = originals.userFindById;
  }
});

test("duplicate review creation returns conflict instead of creating another review", async () => {
  const originalTripFindById = Trip.findById;
  const originalReviewCreate = Review.create;
  const originalUserFindById = User.findById;
  const reviewerId = new mongoose.Types.ObjectId();
  const targetId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();

  try {
    Trip.findById = async () => ({
      title: "Completed review trip",
      organizer: reviewerId,
      members: [{ user: targetId }],
      status: "Completed",
    });
    User.findById = async () => ({});
    Review.create = async () => {
      const error = new Error("Duplicate review");
      error.code = 11000;
      throw error;
    };
    const response = await invoke(createReview, {
      authUser: { id: reviewerId.toString() },
      body: { userId: targetId.toString(), tripId: tripId.toString(), rating: 4 },
    });
    assert.equal(response.statusCode, 409);
    assert.match(response.body.message, /already reviewed/i);
  } finally {
    Trip.findById = originalTripFindById;
    Review.create = originalReviewCreate;
    User.findById = originalUserFindById;
  }
});

test("bearer-authenticated reviewer can delete their own review", async () => {
  const originals = {
    reviewFindById: Review.findById,
    reviewFind: Review.find,
    userFindById: User.findById,
  };
  const reviewerId = new mongoose.Types.ObjectId();
  const targetId = new mongoose.Types.ObjectId();
  const reviewId = new mongoose.Types.ObjectId();
  let deleted = false;
  let saved = false;
  const target = {
    reviews: { pull: () => {} },
    save: async () => { saved = true; },
  };

  try {
    Review.findById = async () => ({
      _id: reviewId,
      reviewer: reviewerId,
      user: targetId,
      deleteOne: async () => { deleted = true; },
    });
    Review.find = () => ({ select: async () => [] });
    User.findById = async () => target;
    const response = await invoke(deleteReview, {
      authUser: { id: reviewerId.toString(), role: "User" },
      params: { reviewId: reviewId.toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(deleted, true);
    assert.equal(saved, true);
  } finally {
    Review.findById = originals.reviewFindById;
    Review.find = originals.reviewFind;
    User.findById = originals.userFindById;
  }
});
