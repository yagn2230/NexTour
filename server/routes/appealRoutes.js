const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  noShowEvidenceUpload,
  validateUploadedContent,
} = require("../middleware/uploadMiddleware");
const { submitNoShowAppeal } = require("../controllers/noShowController");

const router = express.Router();

router.post("/no-show", authMiddleware, noShowEvidenceUpload, validateUploadedContent, submitNoShowAppeal);

module.exports = router;
