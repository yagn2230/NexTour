const mongoose = require("mongoose");

const organizerVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    governmentId: { type: String, required: true, select: false },
    passport: { type: String, default: "", select: false },
    drivingLicense: { type: String, default: "", select: false },
    selfie: { type: String, required: true, select: false },
    addressProof: { type: String, required: true, select: false },
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    rejectionReason: { type: String, default: "", maxlength: 1000 },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrganizerVerification", organizerVerificationSchema);
