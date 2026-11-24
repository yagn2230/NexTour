const express = require("express");
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");
const {
  profileImageUpload,
  validateUploadedContent,
} = require("../middleware/uploadMiddleware");
const { asyncHandler } = require("../middleware/errorMiddleware");
const {
  getMyProfile,
  getPublicUserProfile,
  updateProfile,
  updateProfileImage,
  deleteProfileImage,
  getUpcomingTrips,
  getCompletedTrips,
  getJoinedTrips,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  getFavoriteDestinations,
  getTravelHistory,
  markNotificationRead,
  deleteNotification,
  changePassword,
} = require("../controllers/profileController");

const router = express.Router();
const validate = (rules) => [
  ...rules,
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

router.get("/me", authMiddleware, getMyProfile);
router.get("/upcoming-trips", authMiddleware, getUpcomingTrips);
router.get("/completed-trips", authMiddleware, getCompletedTrips);
router.get("/joined-trips", authMiddleware, getJoinedTrips);
router.get("/wishlist", authMiddleware, getWishlist);
router.post("/wishlist", authMiddleware, addWishlistItem);
router.post("/wishlist/:tripId", authMiddleware, addWishlistItem);
router.delete("/wishlist", authMiddleware, removeWishlistItem);
router.delete("/wishlist/:tripId", authMiddleware, removeWishlistItem);
router.get("/favorite-destinations", authMiddleware, getFavoriteDestinations);
router.get("/travel-history", authMiddleware, getTravelHistory);
router.patch("/notifications/:notificationId/read", authMiddleware, markNotificationRead);
router.delete("/notifications/:notificationId", authMiddleware, deleteNotification);
router.patch(
  "/change-password",
  authMiddleware,
  validate([
    body("currentPassword").isString().notEmpty().isLength({ max: 128 }),
    body("newPassword").isString().isLength({ min: 8, max: 128 }),
  ]),
  changePassword
);
router.put(
  "/update",
  authMiddleware,
  validate([
    body("fullName").optional().isString().trim().isLength({ min: 1, max: 100 }),
    body("username").optional().isString().trim().matches(/^[a-zA-Z0-9_]{3,30}$/),
    body("email").optional().isEmail(),
    body("phone").optional().isString().trim().isLength({ max: 30 }),
    body("bio").optional().isString().trim().isLength({ max: 1000 }),
    body("organizerExperience").optional().isString().trim().isLength({ max: 2000 }),
    body("location").optional().isString().trim().isLength({ max: 200 }),
    body("city").optional().isString().trim().isLength({ max: 100 }),
    body("country").optional().isString().trim().isLength({ max: 100 }),
    body("gender").optional().isString().trim().isLength({ max: 50 }),
    body("dob").optional().isISO8601().toDate().custom((value) => {
      if (value > new Date()) throw new Error("Date of birth cannot be in the future.");
      return true;
    }),
    body("languages").optional().isArray({ max: 30 }),
    body("languages.*").optional().isString().trim().isLength({ min: 1, max: 50 }),
    body("travelPreferences").optional().isArray({ max: 50 }),
    body("travelPreferences.*").optional().isString().trim().isLength({ min: 1, max: 100 }),
    body("gallery").optional().isArray({ max: 30 }),
    body("gallery.*").optional().isString().trim().isLength({ min: 1, max: 1000 }).custom((value) => {
      if (value.startsWith("/uploads/profiles/")) return true;
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Gallery images must use HTTP or HTTPS.");
      }
      return true;
    }),
    body("socialLinks").optional().isObject(),
    body("socialLinks.*").optional().isString().trim().isLength({ max: 500 }),
    body("emergencyContact").optional().isObject(),
    body("emergencyContact.name").optional().isString().trim().isLength({ max: 100 }),
    body("emergencyContact.phone").optional().isString().trim().isLength({ max: 30 }),
    body("emergencyContact.relationship").optional().isString().trim().isLength({ max: 50 }),
  ]),
  updateProfile
);
router.patch("/profile-image", authMiddleware, profileImageUpload, validateUploadedContent, updateProfileImage("profileImage"));
router.patch("/cover-image", authMiddleware, profileImageUpload, validateUploadedContent, updateProfileImage("coverImage"));
router.delete("/profile-image", authMiddleware, deleteProfileImage("profileImage"));
router.delete("/cover-image", authMiddleware, deleteProfileImage("coverImage"));
router.get("/", getPublicUserProfile);
router.get("/:identifier", getPublicUserProfile);

module.exports = router;
