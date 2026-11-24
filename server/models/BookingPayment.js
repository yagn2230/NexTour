const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Pending", "Cash Payment Pending", "Paid", "Failed", "Refund Pending", "Refunded", "Cancelled"],
      required: true,
    },
    amount: { type: Number, min: 0, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { _id: true }
);

const bookingPaymentSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    traveler: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinRequest: { type: mongoose.Schema.Types.ObjectId, required: true },
    paymentMethod: { type: String, enum: ["Demo", "Razorpay", "Free", "Cash"], default: "Demo", required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Cash Payment Pending", "Paid", "Failed", "Refund Pending", "Refunded", "Not Required", "Cancelled"],
      default: "Pending",
      required: true,
    },
    bookingStatus: {
      type: String,
      enum: ["Accepted", "Confirmed", "Cancelled"],
      default: "Accepted",
      required: true,
    },
    attendanceStatus: {
      type: String,
      enum: ["Unmarked", "Present", "Late", "No-Show", "Excused"],
      default: "Unmarked",
      required: true,
    },
    attendanceMarkedAt: { type: Date, default: null },
    attendanceMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, maxlength: 500, default: "" },
    cancellationBy: { type: String, enum: ["", "Traveler", "Organizer", "Admin"], default: "" },
    amount: { type: Number, min: 0, required: true },
    paidAt: { type: Date, default: null },
    razorpayOrderId: { type: String, trim: true, default: "" },
    razorpayPaymentId: { type: String, trim: true, default: "" },
    razorpayRefundId: { type: String, trim: true, default: "" },
    razorpayRefundPending: { type: Boolean, default: false },
    razorpayRefundStartedAt: { type: Date, default: null },
    transactionHistory: { type: [transactionSchema], default: [] },
  },
  { timestamps: true }
);

bookingPaymentSchema.index({ trip: 1, traveler: 1 }, { unique: true });
bookingPaymentSchema.index({ organizer: 1, paymentStatus: 1, updatedAt: -1 });
bookingPaymentSchema.index({ traveler: 1, updatedAt: -1 });

module.exports = mongoose.model("BookingPayment", bookingPaymentSchema);
