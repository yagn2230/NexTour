const express = require("express");
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createReview,
  getReviewsForUser,
  getMyTripReviews,
  deleteReview,
} = require("../controllers/reviewController");

const router = express.Router();
const validateReview = [
  body("userId").isMongoId(),
  body("tripId").isMongoId(),
  body("rating").isInt({ min: 1, max: 5 }),
  body("comment").optional().isString().isLength({ max: 2000 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: errors.array().map((error) => ({ field: error.path, message: error.msg })),
      });
    }
    next();
  },
];

router.get("/user/:userId", getReviewsForUser);
router.get("/user", authMiddleware, getReviewsForUser);
router.get("/organizer/:userId", getReviewsForUser);
router.get("/organizer", authMiddleware, getReviewsForUser);
router.get("/trips/:tripId/mine", authMiddleware, getMyTripReviews);
router.post("/", authMiddleware, validateReview, createReview);
router.delete("/:reviewId", authMiddleware, deleteReview);
router.delete("/", authMiddleware, deleteReview);

module.exports = router;
