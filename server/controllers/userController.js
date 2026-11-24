const User = require("../models/userSchme");
const bcrypt = require("bcryptjs");
const { asyncHandler } = require("../middleware/errorMiddleware");
const {
  registerUser,
  loginUser,
  logoutUser,
} = require("./authController");

const requestUserId = (req) => req.authUser?.id || req.session?.user?.id;

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(requestUserId(req)).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Unable to load profile:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load your profile.",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;

    if (!fullName && !email) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    const user = await User.findById(requestUserId(req));

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Unable to update profile:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update your profile.",
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(requestUserId(req));

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Account deleted but session could not be cleared.",
        });
      }

      res.clearCookie("connect.sid");
      return res.status(200).json({
        success: true,
        message: "Account deleted successfully.",
      });
    });
  } catch (error) {
    console.error("Unable to delete account:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete your account.",
    });
  }
};

const applyOrganizer = asyncHandler(async (req, res) => {
  const { experience, reason, documents = [] } = req.body;

  if (typeof experience !== "string" || !experience.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please describe your organizing experience.",
    });
  }

  if (typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please explain why you want to become an organizer.",
    });
  }

  if (!Array.isArray(documents) || documents.some((document) =>
    !document
    || typeof document.name !== "string"
    || typeof document.mimeType !== "string"
    || typeof document.url !== "string"
    || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(document.mimeType)
    || !document.url.startsWith(`data:${document.mimeType};base64,`)
  )) {
    return res.status(400).json({
      success: false,
      message: "Documents must be PDF or image files with valid file data.",
    });
  }
  if (documents.length > 5 || documents.reduce((total, document) => total + document.url.length, 0) > 7 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      message: "Upload no more than five documents totaling 5 MB or less.",
    });
  }

  const user = await User.findById(requestUserId(req));
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  if (user.organizer.status === "Pending" || user.organizer.status === "Approved") {
    return res.status(409).json({
      success: false,
      message: user.organizer.status === "Pending"
        ? "Your organizer application is already pending."
        : "You are already an approved organizer.",
    });
  }

  user.organizer = {
    isOrganizer: false,
    status: "Pending",
    experience: experience.trim(),
    reason: reason.trim(),
    documents,
    appliedAt: new Date(),
    verifiedAt: null,
  };
  await user.save();

  res.status(201).json({
    success: true,
    message: "Organizer application submitted for review.",
    user: await User.findById(user._id).select("-password"),
  });
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  deleteAccount,
  applyOrganizer,
};
