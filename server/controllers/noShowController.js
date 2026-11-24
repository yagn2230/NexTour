const mongoose = require("mongoose");
const path = require("node:path");
const BookingPayment = require("../models/BookingPayment");
const ChatConversation = require("../models/ChatConversation");
const NoShowAppeal = require("../models/NoShowAppeal");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const { asyncHandler } = require("../middleware/errorMiddleware");
const {
  noShowEvidenceRoot,
  removeUploadedFile,
} = require("../middleware/uploadMiddleware");
const withTransaction = require("../services/withTransaction");
const razorpayService = require("../services/razorpay");
const { refundCancelledRazorpayPayment } = require("./bookingPaymentController");

const NO_SHOW_RESTRICTION_THRESHOLD = 3;
const NO_SHOW_RESTRICTION_DAYS = 30;

const addNotification = (userId, notification, session) => User.updateOne(
  { _id: userId },
  {
    $push: {
      notifications: {
        $each: [notification],
        $sort: { createdAt: -1 },
        $slice: 100,
      },
    },
  },
  { session }
);

const notifyAdmins = async (notification, session) => {
  const admins = await User.find({ role: "Admin" }).select("_id").session(session);
  await Promise.all(admins.map((admin) => addNotification(admin._id, notification, session)));
};

const markAttendance = asyncHandler(async (req, res) => {
  if (req.authUser?.role === "Admin") {
    return res.status(403).json({ success: false, message: "Only the trip organizer can mark attendance." });
  }
  const { bookingId } = req.params;
  const { attendanceStatus } = req.body;
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID." });
  }
  if (!["Present", "Late", "No-Show"].includes(attendanceStatus)) {
    return res.status(400).json({ success: false, message: "Choose Present, Late, or No-Show." });
  }

  const now = new Date();
  const result = await withTransaction(async (session) => {
    const booking = await BookingPayment.findOne({
      _id: bookingId,
      organizer: req.authUser.id,
      bookingStatus: { $in: ["Accepted", "Confirmed"] },
      $or: [{ attendanceStatus: "Unmarked" }, { attendanceStatus: { $exists: false } }],
    }).session(session);
    if (!booking) return { status: "not-found" };
    const trip = await Trip.findById(booking.trip).session(session);
    if (!trip) return { status: "trip-not-found" };
    if (new Date(trip.startDate) > now) return { status: "not-started" };
    const tripEnd = new Date(trip.endDate);
    tripEnd.setUTCHours(23, 59, 59, 999);
    if (attendanceStatus === "No-Show" && tripEnd >= now) {
      return { status: "trip-not-ended" };
    }

    booking.attendanceStatus = attendanceStatus;
    booking.attendanceMarkedAt = now;
    booking.attendanceMarkedBy = req.authUser.id;
    await booking.save({ session });

    let noShowCount;
    if (attendanceStatus === "No-Show") {
      const traveler = await User.findOneAndUpdate(
        { _id: booking.traveler },
        { $inc: { noShowCount: 1 } },
        { new: true, session }
      );
      if (!traveler) throw new Error("The Trip Mate account could not be updated.");
      noShowCount = traveler.noShowCount;
      if (noShowCount >= NO_SHOW_RESTRICTION_THRESHOLD) {
        traveler.noShowRestrictedUntil = new Date(now.getTime() + NO_SHOW_RESTRICTION_DAYS * 24 * 60 * 60 * 1000);
        await traveler.save({ session });
      }
    }

    const tripTitle = trip.title || "the trip";
    await addNotification(booking.traveler, {
      type: attendanceStatus === "No-Show" ? "trip-no-show-recorded" : "trip-attendance-recorded",
      title: attendanceStatus === "No-Show" ? "Trip no-show recorded" : "Trip attendance recorded",
      detail: attendanceStatus === "No-Show"
        ? `The organizer recorded you as a no-show for ${tripTitle}.${noShowCount >= 2 ? ` You now have ${noShowCount} no-shows.` : ""}`
        : `The organizer marked you ${attendanceStatus.toLowerCase()} for ${tripTitle}.`,
      relatedTrip: trip._id,
    }, session);

    if (attendanceStatus === "No-Show" && noShowCount >= NO_SHOW_RESTRICTION_THRESHOLD) {
      await notifyAdmins({
        type: "frequent-trip-no-show",
        title: "Frequent no-show review",
        detail: `${booking.traveler} has ${noShowCount} recorded no-shows and is temporarily restricted from new trip requests.`,
        relatedTrip: trip._id,
      }, session);
    }

    return { status: "marked", booking, noShowCount };
  });

  if (result.status === "not-found") {
    return res.status(409).json({ success: false, message: "This active booking is not yours or attendance has already been marked." });
  }
  if (result.status === "trip-not-found") return res.status(404).json({ success: false, message: "Trip not found." });
  if (result.status === "not-started") return res.status(409).json({ success: false, message: "Attendance can only be marked after the trip starts." });
  if (result.status === "trip-not-ended") return res.status(409).json({ success: false, message: "Mark a Trip Mate as a no-show only after the trip ends." });

  res.json({
    success: true,
    message: result.status === "marked" && attendanceStatus === "No-Show" && result.noShowCount >= NO_SHOW_RESTRICTION_THRESHOLD
      ? "No-show recorded. The traveler has been warned, temporarily restricted, and flagged for admin review."
      : `Attendance marked ${attendanceStatus.toLowerCase()}.`,
    data: result.booking,
  });
});

const cancelTripMateBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID." });
  }
  if (reason.length < 3 || reason.length > 500) {
    return res.status(400).json({ success: false, message: "Cancellation reason must contain 3 to 500 characters." });
  }

  const existing = await BookingPayment.findOne({ _id: bookingId, traveler: req.authUser.id });
  if (
    existing?.bookingStatus === "Cancelled"
    && existing.cancellationBy === "Traveler"
    && existing.paymentMethod === "Razorpay"
    && ["Paid", "Refund Pending"].includes(existing.paymentStatus)
    && existing.razorpayPaymentId
  ) {
    if (!razorpayService.isRazorpayConfigured()) {
      return res.status(503).json({ success: false, message: "Your booking is cancelled, but the Razorpay refund cannot be retried until payment credentials are configured." });
    }
    try {
      await refundCancelledRazorpayPayment(razorpayService.getRazorpayClient(), existing._id, {
        id: existing.razorpayPaymentId,
        order_id: existing.razorpayOrderId,
      });
    } catch {
      return res.status(502).json({ success: false, message: "Your booking remains cancelled, but the Razorpay refund could not be completed. Please retry or contact support." });
    }
    return res.json({ success: true, message: "Your cancelled booking's Razorpay refund was processed." });
  }

  const now = new Date();
  const result = await withTransaction(async (session) => {
    const booking = await BookingPayment.findOne({
      _id: bookingId,
      traveler: req.authUser.id,
      bookingStatus: { $in: ["Accepted", "Confirmed"] },
      $or: [{ attendanceStatus: "Unmarked" }, { attendanceStatus: { $exists: false } }],
    }).session(session);
    if (!booking) return { status: "not-found" };
    const trip = await Trip.findById(booking.trip).session(session);
    if (!trip) return { status: "trip-not-found" };
    if (new Date(trip.startDate) <= now) return { status: "trip-started" };
    const needsRazorpayRefund = booking.paymentMethod === "Razorpay"
      && booking.paymentStatus === "Paid"
      && Boolean(booking.razorpayPaymentId);

    booking.bookingStatus = "Cancelled";
    booking.cancelledAt = now;
    booking.cancellationReason = reason;
    booking.cancellationBy = "Traveler";
    const isCashRefund = booking.paymentMethod === "Cash" && booking.paymentStatus === "Paid";
    if (isCashRefund) {
      booking.paymentStatus = "Refund Pending";
      booking.transactionHistory.push({
        status: "Refund Pending",
        amount: booking.amount,
        actor: req.authUser.id,
        createdAt: now,
        note: "Traveler cancelled before trip start; organizer must return confirmed cash payment.",
      });
    } else if (booking.paymentMethod === "Razorpay" && booking.paymentStatus === "Paid") {
      booking.paymentStatus = "Refund Pending";
      booking.transactionHistory.push({
        status: "Refund Pending",
        amount: booking.amount,
        actor: req.authUser.id,
        createdAt: now,
        note: "Traveler cancelled before trip start; Razorpay refund is being processed.",
      });
    } else {
      booking.paymentStatus = "Cancelled";
      booking.transactionHistory.push({
        status: "Cancelled",
        amount: booking.amount,
        actor: req.authUser.id,
        createdAt: now,
        note: booking.paymentMethod === "Demo" && booking.paidAt
          ? "Traveler cancelled a simulated payment; no real funds were moved."
          : "Traveler cancelled before the trip start date.",
      });
    }
    await booking.save({ session });

    const hadMembership = trip.members.some((member) =>
      member.role === "TripMate" && member.user.toString() === req.authUser.id
    );
    if (hadMembership) {
      const memberUpdate = await Trip.updateOne(
        {
          _id: trip._id,
          members: { $elemMatch: { user: req.authUser.id, role: "TripMate" } },
        },
        {
          $pull: { members: { user: req.authUser.id, role: "TripMate" } },
          $inc: { currentMembers: -1 },
          $set: {
            "joinRequests.$[accepted].status": "Cancelled",
            "joinRequests.$[accepted].respondedAt": now,
          },
        },
        { arrayFilters: [{ "accepted.user": req.authUser.id, "accepted.status": "Accepted" }], session }
      );
      if (!memberUpdate.modifiedCount) throw new Error("Could not release the cancelled Trip Mate's seat.");
      if (trip.status === "Full" && trip.currentMembers - 1 < trip.maxMembers) {
        await Trip.updateOne({ _id: trip._id, status: "Full" }, { $set: { status: "Open" } }, { session });
      }
      await User.updateOne(
        { _id: req.authUser.id, joinedTrips: trip._id },
        { $pull: { joinedTrips: trip._id }, $inc: { totalTripsJoined: -1 } },
        { session }
      );
    }
    await ChatConversation.updateOne(
      { trip: trip._id, traveler: req.authUser.id },
      { $set: { status: "Disabled" } },
      { session }
    );
    await Promise.all([
      addNotification(req.authUser.id, {
        type: "trip-booking-cancelled",
        title: "Trip cancellation recorded",
        detail: `Your booking for ${trip.title} was cancelled before the trip started. ${isCashRefund ? "The organizer must return the cash payment." : ""}`,
        relatedTrip: trip._id,
      }, session),
      addNotification(booking.organizer, {
        type: "tripmate-cancelled",
        title: "Trip Mate cancelled",
        detail: `A Trip Mate cancelled ${trip.title} before it started. Reason: ${reason}${isCashRefund ? " Confirm the cash refund after returning the payment." : ""}`,
        relatedTrip: trip._id,
      }, session),
    ]);

    return {
      status: "cancelled",
      booking,
      tripTitle: trip.title,
      needsRazorpayRefund,
      cashRefundPending: isCashRefund,
    };
  });

  if (result.status === "not-found") {
    return res.status(409).json({ success: false, message: "Only your active, unmarked booking can be cancelled." });
  }
  if (result.status === "trip-not-found") return res.status(404).json({ success: false, message: "Trip not found." });
  if (result.status === "trip-started") return res.status(409).json({ success: false, message: "Bookings can only be cancelled before the trip starts." });

  if (result.needsRazorpayRefund) {
    if (!razorpayService.isRazorpayConfigured()) {
      return res.status(503).json({ success: false, message: "Your booking is cancelled, but the Razorpay refund cannot be processed until payment credentials are configured." });
    }
    try {
      await refundCancelledRazorpayPayment(razorpayService.getRazorpayClient(), result.booking._id, {
        id: result.booking.razorpayPaymentId,
        order_id: result.booking.razorpayOrderId,
      });
    } catch {
      return res.status(502).json({ success: false, message: "Your booking is cancelled, but the Razorpay refund could not be completed. Please retry or contact support." });
    }
  }

  res.json({
    success: true,
    message: result.cashRefundPending
      ? "Booking cancelled and the seat released. The organizer must return your cash payment and confirm the refund."
      : result.needsRazorpayRefund
        ? "Booking cancelled and the Razorpay refund was initiated."
        : "Booking cancelled and the trip seat released.",
    data: result.booking,
  });
});

const submitNoShowAppeal = asyncHandler(async (req, res) => {
  const cleanup = async () => removeUploadedFile(req.file?.path);
  const { bookingId } = req.body;
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    await cleanup();
    return res.status(400).json({ success: false, message: "Invalid booking ID." });
  }
  if (reason.length < 3 || reason.length > 1000) {
    await cleanup();
    return res.status(400).json({ success: false, message: "Appeal reason must contain 3 to 1000 characters." });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Upload supporting evidence with your appeal." });
  }

  try {
    const booking = await BookingPayment.findOne({
      _id: bookingId,
      traveler: req.authUser.id,
      attendanceStatus: "No-Show",
    }).select("trip");
    if (!booking) {
      await cleanup();
      return res.status(404).json({ success: false, message: "No-show booking not found for your account." });
    }
    const appeal = await NoShowAppeal.create({
      booking: booking._id,
      trip: booking.trip,
      traveler: req.authUser.id,
      reason,
      evidenceFilename: path.basename(req.file.filename),
      evidenceMimeType: req.file.mimetype,
    });
    res.status(201).json({
      success: true,
      message: "Appeal submitted for administrator review.",
      data: { id: appeal._id, status: appeal.status },
    });
  } catch (error) {
    await cleanup();
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already submitted an appeal for this no-show." });
    }
    throw error;
  }
});

const getNoShowAppeals = asyncHandler(async (req, res) => {
  const { status } = req.query;
  if (status && !["Pending", "Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid appeal status." });
  }
  const filter = status ? { status } : {};
  const appeals = await NoShowAppeal.find(filter)
    .populate("traveler", "fullName username email noShowCount noShowRestrictedUntil")
    .populate("trip", "title destination startDate endDate")
    .populate("booking", "attendanceStatus paymentStatus")
    .populate("reviewedBy", "fullName")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  res.json({ success: true, count: appeals.length, data: appeals });
});

const getNoShowOffenders = asyncHandler(async (req, res) => {
  const offenders = await User.find({ noShowCount: { $gte: NO_SHOW_RESTRICTION_THRESHOLD } })
    .select("fullName username email noShowCount noShowRestrictedUntil")
    .sort({ noShowCount: -1, noShowRestrictedUntil: -1 })
    .limit(500)
    .lean();
  res.json({ success: true, count: offenders.length, data: offenders });
});

const downloadNoShowEvidence = asyncHandler(async (req, res) => {
  const appeal = await NoShowAppeal.findById(req.params.appealId).select("evidenceFilename evidenceMimeType");
  if (!appeal) return res.status(404).json({ success: false, message: "Appeal evidence not found." });
  const filename = path.basename(appeal.evidenceFilename);
  res.type(appeal.evidenceMimeType);
  res.sendFile(path.join(noShowEvidenceRoot, filename), (error) => {
    if (error && !res.headersSent) res.status(error.statusCode || 404).json({ success: false, message: "Appeal evidence could not be found." });
  });
});

const decideNoShowAppeal = asyncHandler(async (req, res) => {
  const { appealId } = req.params;
  const { decision, reason = "" } = req.body;
  if (!mongoose.isObjectIdOrHexString(appealId)) {
    return res.status(400).json({ success: false, message: "Invalid appeal ID." });
  }
  if (!["Approved", "Rejected"].includes(decision)) {
    return res.status(400).json({ success: false, message: "Appeal decision must be Approved or Rejected." });
  }
  if (typeof reason !== "string" || reason.trim().length > 1000 || (decision === "Rejected" && reason.trim().length < 3)) {
    return res.status(400).json({ success: false, message: "A rejection reason of 3 to 1000 characters is required." });
  }

  const now = new Date();
  const appeal = await withTransaction(async (session) => {
    const pendingAppeal = await NoShowAppeal.findOne({ _id: appealId, status: "Pending" }).session(session);
    if (!pendingAppeal) return null;
    pendingAppeal.status = decision;
    pendingAppeal.decisionReason = reason.trim();
    pendingAppeal.reviewedBy = req.authUser.id;
    pendingAppeal.reviewedAt = now;
    await pendingAppeal.save({ session });

    if (decision === "Approved") {
      const booking = await BookingPayment.findOne({
        _id: pendingAppeal.booking,
        traveler: pendingAppeal.traveler,
        attendanceStatus: "No-Show",
      }).session(session);
      if (!booking) throw new Error("The appealed no-show record could not be found.");
      booking.attendanceStatus = "Excused";
      booking.attendanceMarkedAt = now;
      booking.attendanceMarkedBy = req.authUser.id;
      await booking.save({ session });
      const traveler = await User.findById(pendingAppeal.traveler).session(session);
      if (!traveler) throw new Error("The traveler account could not be found.");
      traveler.noShowCount = Math.max(0, traveler.noShowCount - 1);
      if (traveler.noShowCount < NO_SHOW_RESTRICTION_THRESHOLD) traveler.noShowRestrictedUntil = null;
      await traveler.save({ session });
      await addNotification(traveler._id, {
        type: "no-show-appeal-approved",
        title: "No-show appeal approved",
        detail: `Your appeal was approved. The no-show is now excused and removed from your count.${reason.trim() ? ` ${reason.trim()}` : ""}`,
        relatedTrip: pendingAppeal.trip,
      }, session);
    } else {
      await addNotification(pendingAppeal.traveler, {
        type: "no-show-appeal-rejected",
        title: "No-show appeal reviewed",
        detail: `Your appeal was not approved. ${reason.trim()}`,
        relatedTrip: pendingAppeal.trip,
      }, session);
    }
    return pendingAppeal;
  });
  if (!appeal) return res.status(404).json({ success: false, message: "Pending appeal not found." });
  res.json({
    success: true,
    message: `No-show appeal ${decision.toLowerCase()}.`,
    data: { id: appeal._id, status: appeal.status },
  });
});

const markCashRefunded = asyncHandler(async (req, res) => {
  if (req.authUser?.role === "Admin") {
    return res.status(403).json({ success: false, message: "Only the trip organizer can confirm a cash refund." });
  }
  const { bookingId } = req.params;
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID." });
  }
  const now = new Date();
  const booking = await withTransaction(async (session) => {
    const pending = await BookingPayment.findOne({
      _id: bookingId,
      organizer: req.authUser.id,
      paymentMethod: "Cash",
      bookingStatus: "Cancelled",
      paymentStatus: "Refund Pending",
      cancellationBy: "Traveler",
    }).session(session);
    if (!pending) return null;
    pending.paymentStatus = "Refunded";
    pending.transactionHistory.push({
      status: "Refunded",
      amount: pending.amount,
      actor: req.authUser.id,
      createdAt: now,
      note: "Organizer confirmed that the traveler's cash payment was returned.",
    });
    await pending.save({ session });
    await addNotification(pending.traveler, {
      type: "cash-refund-confirmed",
      title: "Cash refund confirmed",
      detail: "The organizer confirmed that your cash payment was returned.",
      relatedTrip: pending.trip,
    }, session);
    return pending;
  });
  if (!booking) return res.status(409).json({ success: false, message: "This is not a cancelled booking with a pending cash refund owned by you." });
  res.json({ success: true, message: "Cash refund confirmed.", data: booking });
});

module.exports = {
  markAttendance,
  cancelTripMateBooking,
  submitNoShowAppeal,
  getNoShowAppeals,
  getNoShowOffenders,
  downloadNoShowEvidence,
  decideNoShowAppeal,
  markCashRefunded,
};
