const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  verificationDocumentUpload,
  validateUploadedContent,
} = require("../middleware/uploadMiddleware");
const {
  applyForOrganizer,
  getVerificationStatus,
} = require("../controllers/verificationController");

const router = express.Router();
router.post("/apply", authMiddleware, verificationDocumentUpload, validateUploadedContent, applyForOrganizer);
router.get("/status", authMiddleware, getVerificationStatus);

module.exports = router;
