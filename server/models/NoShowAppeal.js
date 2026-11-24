const mongoose = require("mongoose");

const noShowAppealSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "BookingPayment", required: true, unique: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    traveler: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, trim: true, minlength: 3, maxlength: 1000, required: true },
    evidenceFilename: { type: String, required: true, trim: true },
    evidenceMimeType: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending", required: true },
    decisionReason: { type: String, trim: true, maxlength: 1000, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

noShowAppealSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("NoShowAppeal", noShowAppealSchema);
