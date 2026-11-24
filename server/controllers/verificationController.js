const mongoose = require("mongoose");
const path = require("node:path");
const OrganizerVerification = require("../models/OrganizerVerification");
const User = require("../models/userSchme");
const { asyncHandler } = require("../middleware/errorMiddleware");
const {
  storedFileUrl,
  removeUploadedFile,
  verificationRoot,
} = require("../middleware/uploadMiddleware");

const requestUserId = (req) => req.authUser?.id || req.session?.user?.id;

const applyForOrganizer = asyncHandler(async (req, res) => {
  const uploadedFiles = Object.values(req.files || {}).flat();
  const removeNewFiles = async () => Promise.all(uploadedFiles.map((file) => removeUploadedFile(file.path)));
  const user = await User.findById(requestUserId(req));
  if (!user) {
    await removeNewFiles();
    return res.status(404).json({ success: false, message: "User not found." });
  }
  const existing = await OrganizerVerification.findOne({ user: user._id });
  if (existing?.status === "Pending" || existing?.status === "Approved") {
    await removeNewFiles();
    return res.status(409).json({
      success: false,
      message: existing.status === "Pending"
        ? "Your verification application is already pending."
        : "Your organizer account is already verified.",
    });
  }
  const files = req.files || {};
  for (const field of ["governmentId", "selfie", "addressProof"]) {
    if (!files[field]?.[0]) {
      await removeNewFiles();
      return res.status(400).json({
        success: false,
        message: `${field} document is required.`,
      });
    }
  }
  const previousDocuments = existing
    ? await OrganizerVerification.findById(existing._id)
      .select("+governmentId +passport +drivingLicense +selfie +addressProof")
    : null;
  const documentData = {
    governmentId: storedFileUrl(files.governmentId[0]),
    selfie: storedFileUrl(files.selfie[0]),
    addressProof: storedFileUrl(files.addressProof[0]),
    passport: files.passport?.[0] ? storedFileUrl(files.passport[0]) : "",
    drivingLicense: files.drivingLicense?.[0] ? storedFileUrl(files.drivingLicense[0]) : "",
    phoneVerified: false,
    emailVerified: Boolean(user.isVerified),
    submittedAt: new Date(),
    verifiedAt: null,
    status: "Pending",
    rejectionReason: "",
    verifiedBy: null,
  };
  const verification = existing
    ? await OrganizerVerification.findOneAndUpdate(
      { _id: existing._id },
      { $set: documentData },
      { new: true, runValidators: true }
    )
    : await OrganizerVerification.create({ user: user._id, ...documentData });
  if (previousDocuments) {
    const oldDocumentPaths = [
      previousDocuments.governmentId,
      previousDocuments.passport,
      previousDocuments.drivingLicense,
      previousDocuments.selfie,
      previousDocuments.addressProof,
    ].filter(Boolean);
    await Promise.all(oldDocumentPaths.map((documentPath) => {
      const fileName = path.basename(documentPath);
      return removeUploadedFile(path.join(verificationRoot, fileName));
    }));
  }
  user.organizerVerificationStatus = "Pending";
  user.organizerVerified = false;
  user.isOrganizer = false;
  user.organizer.isOrganizer = false;
  user.organizer.status = "Pending";
  user.organizer.appliedAt = documentData.submittedAt;
  await user.save();

  res.status(201).json({
    success: true,
    message: "Organizer verification application submitted.",
    data: {
      id: verification._id,
      status: verification.status,
      submittedAt: verification.submittedAt,
      emailVerified: verification.emailVerified,
      phoneVerified: verification.phoneVerified,
    },
  });
});

const getVerificationStatus = asyncHandler(async (req, res) => {
  const verification = await OrganizerVerification.findOne({ user: requestUserId(req) })
    .select("status submittedAt verifiedAt rejectionReason phoneVerified emailVerified");
  const user = await User.findById(requestUserId(req))
    .select("organizerVerificationStatus organizerVerified organizer.status");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  res.json({
    success: true,
    data: verification || {
      status: user.organizerVerified || user.organizer?.status === "Approved"
        ? "Approved"
        : user.organizerVerificationStatus !== "Not Applied"
          ? user.organizerVerificationStatus
          : user.organizer?.status || "Not Applied",
      submittedAt: null,
      verifiedAt: null,
      rejectionReason: "",
      phoneVerified: false,
      emailVerified: false,
    },
  });
});

const approveVerification = asyncHandler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid verification ID." });
  }
  const verification = await OrganizerVerification.findById(req.params.id);
  if (!verification) return res.status(404).json({ success: false, message: "Verification application not found." });
  if (verification.status !== "Pending") {
    return res.status(409).json({ success: false, message: "Only pending applications can be approved." });
  }
  const user = await User.findById(verification.user);
  if (!user) return res.status(404).json({ success: false, message: "Applicant account not found." });
  verification.status = "Approved";
  verification.verifiedAt = new Date();
  verification.verifiedBy = requestUserId(req);
  verification.rejectionReason = "";
  await verification.save();
  user.organizerVerified = true;
  user.isOrganizer = true;
  user.organizerVerificationStatus = "Approved";
  user.organizer.isOrganizer = true;
  user.organizer.status = "Approved";
  user.organizer.verifiedAt = verification.verifiedAt;
  await user.save();
  res.json({
    success: true,
    message: "Organizer verification approved.",
    data: { id: verification._id, user: user._id, status: verification.status },
  });
});

const rejectVerification = asyncHandler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid verification ID." });
  }
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
  if (!reason || reason.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "A rejection reason between 1 and 1000 characters is required.",
    });
  }
  const verification = await OrganizerVerification.findById(req.params.id);
  if (!verification) return res.status(404).json({ success: false, message: "Verification application not found." });
  if (verification.status !== "Pending") {
    return res.status(409).json({ success: false, message: "Only pending applications can be rejected." });
  }
  const user = await User.findById(verification.user);
  if (!user) return res.status(404).json({ success: false, message: "Applicant account not found." });
  verification.status = "Rejected";
  verification.rejectionReason = reason;
  verification.verifiedAt = new Date();
  verification.verifiedBy = requestUserId(req);
  await verification.save();
  user.organizerVerified = false;
  user.isOrganizer = false;
  user.organizerVerificationStatus = "Rejected";
  user.organizer.isOrganizer = false;
  user.organizer.status = "Rejected";
  user.organizer.reason = reason;
  user.organizer.verifiedAt = null;
  await user.save();
  res.json({
    success: true,
    message: "Organizer verification rejected.",
    data: { id: verification._id, user: user._id, status: verification.status, rejectionReason: reason },
  });
});

const getPendingVerifications = asyncHandler(async (req, res) => {
  const applications = await OrganizerVerification.find({ status: "Pending" })
    .select("+governmentId +passport +drivingLicense +selfie +addressProof")
    .populate("user", "fullName username email profileImage")
    .sort({ submittedAt: 1 });
  res.json({
    success: true,
    count: applications.length,
    data: applications.map((application) => ({
      id: application._id,
      user: application.user,
      status: application.status,
      submittedAt: application.submittedAt,
      documents: Object.fromEntries(
        ["governmentId", "passport", "drivingLicense", "selfie", "addressProof"]
          .filter((field) => application[field])
          .map((field) => [
            field,
            `/admin/verification/${application._id}/documents/${field}`,
          ])
      ),
    })),
  });
});

const getVerificationDocument = asyncHandler(async (req, res, next) => {
  const validFields = ["governmentId", "passport", "drivingLicense", "selfie", "addressProof"];
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !validFields.includes(req.params.field)) {
    return res.status(400).json({ success: false, message: "Invalid verification document request." });
  }
  const verification = await OrganizerVerification.findById(req.params.id)
    .select("+governmentId +passport +drivingLicense +selfie +addressProof");
  if (!verification) {
    return res.status(404).json({ success: false, message: "Verification application not found." });
  }
  const storedPath = verification[req.params.field];
  if (!storedPath) {
    return res.status(404).json({ success: false, message: "Verification document not found." });
  }
  const filePath = path.join(verificationRoot, path.basename(storedPath));
  res.set("Cache-Control", "private, no-store");
  res.set("X-Content-Type-Options", "nosniff");
  res.sendFile(filePath, (error) => {
    if (error && !res.headersSent) next(error);
  });
});

module.exports = {
  applyForOrganizer,
  getVerificationStatus,
  approveVerification,
  rejectVerification,
  getPendingVerifications,
  getVerificationDocument,
};
