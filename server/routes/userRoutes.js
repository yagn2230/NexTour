const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();

const {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  deleteAccount,
  applyOrganizer,
} = require("../controllers/userController");

const { isAuthenticated } = require("../middleware/authMiddleware");

const validateAuthInput = (rules) => [
  ...rules,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
      });
    }
    next();
  },
];

router.post(
  "/register",
  validateAuthInput([
    body("fullName").isString().trim().isLength({ min: 1, max: 100 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 8, max: 128 }),
    body("phone").optional().isString().trim().isLength({ max: 30 }),
  ]),
  registerUser
);

router.post(
  "/login",
  validateAuthInput([
    body("email").isEmail().normalizeEmail(),
    body("password").isString().notEmpty().isLength({ max: 128 }),
  ]),
  loginUser
);

// Logout
router.get("/logout", logoutUser);

// =======================
// User Routes
// =======================

// Get Logged In User Profile
router.get("/profile", isAuthenticated, getProfile);

// Update Profile
router.put("/profile/update", isAuthenticated, updateProfile);

router.post("/apply-organizer", isAuthenticated, applyOrganizer);

// Delete Account
router.delete("/delete", isAuthenticated, deleteAccount);

module.exports = router;