const mongoose = require("mongoose");
const BookingPayment = require("../models/BookingPayment");
const NoShowAppeal = require("../models/NoShowAppeal");
const ChatConversation = require("../models/ChatConversation");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const { asyncHandler } = require("../middleware/errorMiddleware");
const withTransaction = require("../services/withTransaction");
const { isDemoPaymentsEnabled } = require("../services/paymentMode");
const razorpayService = require("../services/razorpay");
const { buildRevenueAnalytics } = require("../utils/revenueAnalytics");

const paymentPopulate = [
  { path: "trip", select: "title destination city state country startDate endDate coverImage status" },
  { path: "organizer", select: "fullName username email profileImage" },
  { path: "traveler", select: "fullName username email phone profileImage noShowCount noShowRestrictedUntil" },
];

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

const recordCapturedRazorpayPayment = async ({ orderId, payment }) => withTransaction(async (session) => {
  const booking = await BookingPayment.findOne({ razorpayOrderId: orderId }).session(session);
  if (!booking) return { status: "not-found" };
  if (
    Number(payment.amount) !== Math.round(Number(booking.amount) * 100)
    || payment.currency !== "INR"
  ) {
    return { status: "amount-mismatch" };
  }
  if (booking.razorpayPaymentId === payment.id && ["Paid", "Refunded"].includes(booking.paymentStatus)) {
    return { status: booking.paymentStatus === "Refunded" ? "refunded" : "already-paid" };
  }
  if (booking.bookingStatus === "Cancelled") {
    return { status: "cancelled", bookingId: booking._id, travelerId: booking.traveler };
  }
  if (
    booking.bookingStatus !== "Accepted"
    || !["Pending", "Cash Payment Pending"].includes(booking.paymentStatus)
  ) {
    return { status: "conflict" };
  }

  const now = new Date();
  booking.paymentMethod = "Razorpay";
  booking.paymentStatus = "Paid";
  booking.bookingStatus = "Confirmed";
  booking.razorpayPaymentId = payment.id;
  booking.paidAt = now;
  booking.transactionHistory.push({
    status: "Paid",
    amount: booking.amount,
    actor: booking.traveler,
    createdAt: now,
    note: `Razorpay payment ${payment.id} captured successfully.`,
  });
  await booking.save({ session });

  const trip = await Trip.findById(booking.trip).select("title").session(session);
  const title = trip?.title || "the trip";
  await addNotification(booking.organizer, {
    type: "razorpay-payment-completed",
    title: "Online payment received",
    detail: `Razorpay payment for ${title} was captured.`,
    relatedTrip: booking.trip,
  }, session);
  await addNotification(booking.traveler, {
    type: "razorpay-payment-completed",
    title: "Online payment confirmed",
    detail: `Your Razorpay payment for ${title} was confirmed.`,
    relatedTrip: booking.trip,
  }, session);
  return { status: "paid", booking };
});

const refundCancelledRazorpayPayment = async (client, bookingId, payment) => {
  const filter = {
    _id: bookingId,
    bookingStatus: "Cancelled",
    razorpayOrderId: payment.order_id,
  };
  const booking = await BookingPayment.findOne(filter);
  if (!booking) return { status: "not-found" };
  if (booking.razorpayRefundId) return { status: "refunded" };

  const claim = await BookingPayment.findOneAndUpdate(
    {
      ...filter,
      razorpayRefundId: { $in: ["", null] },
      $or: [
        { razorpayRefundPending: { $ne: true } },
        { razorpayRefundStartedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } },
      ],
    },
    {
      $set: {
        razorpayRefundPending: true,
        razorpayPaymentId: payment.id,
        razorpayRefundStartedAt: new Date(),
      },
    },
    { new: true }
  );
  if (!claim) {
    const current = await BookingPayment.findOne(filter).select("razorpayRefundId razorpayRefundPending");
    return { status: current?.razorpayRefundId ? "refunded" : "refund-pending" };
  }

  try {
    const priorRefunds = await client.payments.fetchMultipleRefund(payment.id, { count: 100 });
    const existingRefund = priorRefunds.items?.find(
      (refund) => refund.notes?.bookingId === bookingId.toString()
    );
    const refund = existingRefund || await client.payments.refund(payment.id, {
      notes: { bookingId: bookingId.toString() },
    });
    const updated = await BookingPayment.findOneAndUpdate(
      { ...filter, razorpayRefundPending: true },
      {
        $set: {
          razorpayRefundId: refund.id,
          razorpayRefundPending: false,
          razorpayRefundStartedAt: null,
          paymentStatus: "Refunded",
        },
        $push: {
          transactionHistory: {
            status: "Refunded",
            amount: booking.amount,
            actor: booking.traveler,
            createdAt: new Date(),
            note: `Razorpay refund ${refund.id} initiated for a cancelled booking.`,
          },
        },
      },
      { new: true, runValidators: true }
    );
    if (!updated) throw new Error("The cancelled booking changed while the refund was processing.");
    await Promise.all([
      addNotification(booking.traveler, {
        type: "razorpay-payment-refunded",
        title: "Payment refund initiated",
        detail: "Your Razorpay payment was refunded because the booking had already been cancelled.",
        relatedTrip: booking.trip,
      }),
      addNotification(booking.organizer, {
        type: "razorpay-payment-refunded",
        title: "Cancelled booking refunded",
        detail: "A captured Razorpay payment for a cancelled booking was refunded.",
        relatedTrip: booking.trip,
      }),
    ]);
    return { status: "refunded" };
  } catch (error) {
    await BookingPayment.updateOne(
      { ...filter, razorpayRefundPending: true },
      { $set: { razorpayRefundPending: false, razorpayRefundStartedAt: null } }
    );
    throw error;
  }
};

const handleCapturedRazorpayPayment = async (client, orderId, payment) => {
  const result = await recordCapturedRazorpayPayment({ orderId, payment });
  if (result.status !== "cancelled") return result;
  return refundCancelledRazorpayPayment(client, result.bookingId, payment);
};

const createRazorpayOrder = asyncHandler(async (req, res) => {
  if (!razorpayService.isRazorpayConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Online payments are not configured. Contact support or choose cash payment.",
    });
  }
  const { bookingId } = req.params;
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID." });
  }
  const booking = await BookingPayment.findOne({
    _id: bookingId,
    traveler: req.authUser.id,
    bookingStatus: "Accepted",
    paymentStatus: { $in: ["Pending", "Cash Payment Pending"] },
  });
  if (!booking) {
    return res.status(409).json({
      success: false,
      message: "This booking is not awaiting payment.",
    });
  }
  const amount = Math.round(Number(booking.amount) * 100);
  if (!Number.isSafeInteger(amount) || amount < 100) {
    return res.status(400).json({
      success: false,
      message: "Razorpay requires a valid payment of at least INR 1.00.",
    });
  }

  let order;
  const client = razorpayService.getRazorpayClient();
  try {
    order = booking.razorpayOrderId
      ? await client.orders.fetch(booking.razorpayOrderId)
      : await client.orders.create({
        amount,
        currency: "INR",
        receipt: `${booking._id}_${Date.now()}`,
        notes: { bookingId: booking._id.toString() },
      });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    return res.status(502).json({
      success: false,
      message: "Unable to start online checkout. Please try again.",
    });
  }
  if (Number(order.amount) !== amount || order.currency !== "INR") {
    return res.status(409).json({
      success: false,
      message: "The online payment order does not match this booking amount.",
    });
  }
  if (order.status === "paid") {
    const payments = await client.orders.fetchPayments(order.id);
    const captured = payments.items?.find((payment) => payment.status === "captured");
    if (captured) {
      await handleCapturedRazorpayPayment(client, order.id, captured);
    }
    return res.status(409).json({
      success: false,
      message: "This payment was already completed. Refresh your bookings.",
    });
  }

  if (booking.paymentMethod !== "Razorpay") {
    booking.transactionHistory.push({
      status: "Pending",
      amount: booking.amount,
      actor: req.authUser.id,
      note: "Traveler selected Razorpay online payment.",
    });
  }
  booking.paymentMethod = "Razorpay";
  booking.paymentStatus = "Pending";
  booking.razorpayOrderId = order.id;
  await booking.save();

  res.json({
    success: true,
    data: {
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId: booking._id,
    },
  });
});

const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  if (!razorpayService.isRazorpayConfigured()) {
    return res.status(503).json({ success: false, message: "Online payments are not configured." });
  }
  const { bookingId } = req.params;
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID." });
  }
  if (![orderId, paymentId, signature].every((value) => typeof value === "string" && value.trim())) {
    return res.status(400).json({ success: false, message: "Razorpay payment verification details are required." });
  }
  if (!razorpayService.isValidPaymentSignature(orderId, paymentId, signature)) {
    return res.status(400).json({ success: false, message: "Razorpay payment signature is invalid." });
  }

  const booking = await BookingPayment.findOne({
    _id: bookingId,
    traveler: req.authUser.id,
    razorpayOrderId: orderId,
  });
  if (!booking) {
    return res.status(404).json({ success: false, message: "Razorpay order was not found for this booking." });
  }
  if (booking.razorpayPaymentId === paymentId && ["Paid", "Refunded"].includes(booking.paymentStatus)) {
    return res.json({
      success: true,
      message: booking.paymentStatus === "Refunded" ? "Payment was refunded." : "Payment is already confirmed.",
      data: { bookingId: booking._id, paymentStatus: booking.paymentStatus },
    });
  }

  const client = razorpayService.getRazorpayClient();
  let payment;
  try {
    payment = await client.payments.fetch(paymentId);
    if (payment.order_id !== orderId || Number(payment.amount) !== Math.round(Number(booking.amount) * 100) || payment.currency !== "INR") {
      return res.status(400).json({ success: false, message: "Razorpay payment does not match this booking." });
    }
    if (payment.status === "authorized") {
      payment = await client.payments.capture(paymentId, payment.amount, payment.currency);
    }
  } catch (error) {
    console.error("Razorpay payment verification failed:", error);
    return res.status(502).json({
      success: false,
      message: "Unable to verify the payment with Razorpay. Your booking status has not been changed.",
    });
  }
  if (payment.status !== "captured") {
    return res.status(409).json({
      success: false,
      message: "Razorpay has not captured this payment yet. Please check again shortly.",
    });
  }

  const result = await handleCapturedRazorpayPayment(client, orderId, payment);
  if (result.status === "refund-pending") {
    return res.status(202).json({
      success: true,
      message: "The booking was cancelled; its captured payment refund is being processed.",
      data: { bookingId, paymentStatus: "Refund Pending" },
    });
  }
  if (
    result.status === "paid"
    || result.status === "already-paid"
    || result.status === "refunded"
  ) {
    return res.json({
      success: true,
      message: result.status === "refunded"
        ? "The cancelled booking payment was refunded."
        : "Razorpay payment confirmed.",
      data: result.booking
        ? { bookingId: result.booking._id, paymentStatus: result.booking.paymentStatus }
        : { bookingId, paymentStatus: result.status === "refunded" ? "Refunded" : "Paid" },
    });
  }
  return res.status(409).json({
    success: false,
    message: result.status === "amount-mismatch"
      ? "Razorpay payment amount does not match the booking."
      : "This booking can no longer be confirmed with the payment.",
  });
});

const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return res.status(503).json({ success: false, message: "Razorpay webhook verification is not configured." });
  }
  if (!razorpayService.isValidWebhookSignature(req.rawBody, req.get("x-razorpay-signature"))) {
    return res.status(400).json({ success: false, message: "Invalid Razorpay webhook signature." });
  }
  if (req.body?.event !== "payment.captured") {
    return res.json({ success: true, ignored: true });
  }
  const payment = req.body?.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id || payment.status !== "captured") {
    return res.status(400).json({ success: false, message: "Captured Razorpay payment data is incomplete." });
  }
  const result = await handleCapturedRazorpayPayment(razorpayService.getRazorpayClient(), payment.order_id, payment);
  if (result.status === "amount-mismatch") {
    return res.status(400).json({ success: false, message: "Razorpay payment amount does not match the booking." });
  }
  if (result.status === "refund-pending") {
    return res.status(503).json({ success: false, message: "The booking refund is still processing." });
  }
  res.json({ success: true, status: result.status });
});

const getOrganizerPayments = asyncHandler(async (req, res) => {
  const isAdmin = req.authUser?.role === "Admin";
  const filter = isAdmin ? {} : { organizer: req.authUser.id };
  const validStatuses = ["Pending", "Cash Payment Pending", "Paid", "Failed", "Refund Pending", "Refunded", "Not Required", "Cancelled"];
  if (req.query.status && !validStatuses.includes(req.query.status)) {
    return res.status(400).json({ success: false, message: "Invalid payment status filter." });
  }
  if (req.query.status) {
    filter.paymentStatus = req.query.status;
  }
  const [bookings, totals] = await Promise.all([
    BookingPayment.find(filter)
      .populate(paymentPopulate)
      .sort({ updatedAt: -1 })
      .lean(),
    BookingPayment.aggregate([
      { $match: isAdmin ? {} : { organizer: new mongoose.Types.ObjectId(req.authUser.id) } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          pendingPayments: {
            $sum: { $cond: [{ $in: ["$paymentStatus", ["Pending", "Cash Payment Pending"]] }, 1, 0] },
          },
          paidPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0] } },
          paidRevenue: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, "$amount", 0] },
          },
        },
      },
    ]),
  ]);
  res.json({
    success: true,
    count: bookings.length,
    data: bookings,
    stats: totals[0] || { totalBookings: 0, pendingPayments: 0, paidPayments: 0, paidRevenue: 0 },
  });
});

const getOrganizerPaymentAnalytics = asyncHandler(async (req, res) => {
  const period = req.query.period || "monthly";
  if (!["daily", "weekly", "monthly", "yearly"].includes(period)) {
    return res.status(400).json({ success: false, message: "Invalid revenue analytics period." });
  }
  const filter = req.authUser?.role === "Admin" ? {} : { organizer: req.authUser.id };
  const bookings = await BookingPayment.find(filter)
    .select("trip paymentStatus amount paidAt createdAt")
    .populate("trip", "title")
    .sort({ paidAt: 1 })
    .lean();
  res.json({ success: true, data: buildRevenueAnalytics(bookings, period) });
});

const getOrganizerPayment = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID." });
  }
  const filter = { _id: bookingId };
  if (req.authUser?.role !== "Admin") filter.organizer = req.authUser.id;
  const booking = await BookingPayment.findOne(filter).populate(paymentPopulate).lean();
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
  res.json({ success: true, data: booking });
});

const completeDemoPayment = asyncHandler(async (req, res) => {
  if (!isDemoPaymentsEnabled()) {
    return res.status(403).json({
      success: false,
      message: "Demo payments are disabled in production.",
    });
  }
  const { bookingId } = req.params;
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID." });
  }
  const now = new Date();
  const booking = await withTransaction(async (session) => {
    const updated = await BookingPayment.findOne(
      {
        _id: bookingId,
        traveler: req.authUser.id,
        paymentMethod: { $in: ["Demo", "Cash"] },
        bookingStatus: "Accepted",
        paymentStatus: { $in: ["Pending", "Cash Payment Pending"] },
      }
    ).session(session);
    if (!updated) return null;
    updated.paymentMethod = "Demo";
    updated.paymentStatus = "Paid";
    updated.bookingStatus = "Confirmed";
    updated.paidAt = now;
    updated.transactionHistory.push({
      status: "Paid",
      amount: updated.amount,
      actor: req.authUser.id,
      createdAt: now,
      note: "Demo payment simulated successfully; no real funds moved.",
    });
    await updated.save({ session });
    const trip = await Trip.findById(updated.trip).select("title").session(session);
    await addNotification(updated.organizer, {
      type: "demo-payment-completed",
      title: "Demo payment completed",
      detail: `A simulated payment for ${trip?.title || "your trip"} was completed. No real money was transferred.`,
      relatedTrip: updated.trip,
    }, session);
    await addNotification(updated.traveler, {
      type: "demo-payment-completed",
      title: "Demo payment completed",
      detail: `Your simulated payment for ${trip?.title || "the trip"} is complete. No real money was charged.`,
      relatedTrip: updated.trip,
    }, session);
    return updated;
  });
  if (!booking) {
    return res.status(409).json({
      success: false,
      message: "This is not a pending demo booking owned by you.",
    });
  }
  res.json({
    success: true,
    message: "Demo payment completed. No real money was charged or transferred.",
    data: booking,
  });
});

const selectCashPayment = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID." });
  }
  const booking = await withTransaction(async (session) => {
    const pending = await BookingPayment.findOne({
      _id: bookingId,
      traveler: req.authUser.id,
      bookingStatus: "Accepted",
      paymentMethod: { $in: ["Demo", "Razorpay", "Cash"] },
      paymentStatus: { $in: ["Pending", "Cash Payment Pending"] },
    }).session(session);
    if (!pending) return null;
    if (pending.paymentMethod !== "Cash") {
      pending.paymentMethod = "Cash";
      pending.paymentStatus = "Pending";
      pending.transactionHistory.push({
        status: "Pending",
        amount: pending.amount,
        actor: req.authUser.id,
        note: "Traveler selected cash payment; awaiting organizer confirmation.",
      });
      await pending.save({ session });
      const trip = await Trip.findById(pending.trip).select("title").session(session);
      await addNotification(pending.organizer, {
        type: "cash-payment-selected",
        title: "Cash payment selected",
        detail: `A traveler selected cash for ${trip?.title || "a trip booking"}. Confirm receipt after collecting the payment.`,
        relatedTrip: pending.trip,
      }, session);
    }
    return pending;
  });
  if (!booking) {
    return res.status(409).json({
      success: false,
      message: "This booking cannot be switched to cash payment.",
    });
  }
  res.json({
    success: true,
    message: "Cash selected. Pay the organizer directly; they must confirm receipt.",
    data: booking,
  });
});

const markCashPaymentPaid = asyncHandler(async (req, res) => {
  if (req.authUser?.role === "Admin") {
    return res.status(403).json({ success: false, message: "Only the trip organizer can confirm cash received." });
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
      bookingStatus: "Accepted",
      paymentStatus: { $in: ["Pending", "Cash Payment Pending"] },
    }).session(session);
    if (!pending) return null;
    pending.paymentStatus = "Paid";
    pending.bookingStatus = "Confirmed";
    pending.paidAt = now;
    pending.transactionHistory.push({
      status: "Paid",
      amount: pending.amount,
      actor: req.authUser.id,
      createdAt: now,
      note: "Organizer confirmed receipt of cash payment.",
    });
    await pending.save({ session });
    const trip = await Trip.findById(pending.trip).select("title").session(session);
    await addNotification(pending.traveler, {
      type: "cash-payment-confirmed",
      title: "Cash payment confirmed",
      detail: `The organizer confirmed your cash payment for ${trip?.title || "the trip"}.`,
      relatedTrip: pending.trip,
    }, session);
    return pending;
  });
  if (!booking) {
    return res.status(409).json({
      success: false,
      message: "This is not a pending cash booking owned by you.",
    });
  }
  res.json({ success: true, message: "Cash payment confirmed.", data: booking });
});

const cancelPendingBooking = asyncHandler(async (req, res) => {
  if (req.authUser?.role === "Admin") {
    return res.status(403).json({ success: false, message: "Only the trip organizer can cancel a pending booking." });
  }
  const { bookingId } = req.params;
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID." });
  }
  const now = new Date();
  const result = await withTransaction(async (session) => {
    const booking = await BookingPayment.findOne({
      _id: bookingId,
      organizer: req.authUser.id,
      bookingStatus: "Accepted",
      paymentStatus: { $in: ["Pending", "Cash Payment Pending"] },
    }).session(session);
    if (!booking) return null;

    booking.paymentStatus = "Cancelled";
    booking.bookingStatus = "Cancelled";
    booking.transactionHistory.push({
      status: "Cancelled",
      amount: booking.amount,
      actor: req.authUser.id,
      createdAt: now,
      note: "Organizer cancelled the pending payment and booking.",
    });
    await booking.save({ session });

    const trip = await Trip.findById(booking.trip).session(session);
    if (trip) {
      const hadMembership = trip.members.some(
        (member) => member.role === "TripMate" && member.user.toString() === booking.traveler.toString()
      );
      if (hadMembership) {
        const memberUpdate = await Trip.updateOne(
          {
            _id: trip._id,
            members: { $elemMatch: { user: booking.traveler, role: "TripMate" } },
          },
          {
            $pull: { members: { user: booking.traveler, role: "TripMate" } },
            $inc: { currentMembers: -1 },
            $set: {
              "joinRequests.$[accepted].status": "Cancelled",
              "joinRequests.$[accepted].respondedAt": now,
            },
          },
          {
            arrayFilters: [{ "accepted.user": booking.traveler, "accepted.status": "Accepted" }],
            session,
          }
        );
        if (!memberUpdate.modifiedCount) {
          throw new Error("Could not remove the cancelled booking from the trip.");
        }
        if (trip.status === "Full" && trip.currentMembers - 1 < trip.maxMembers) {
          await Trip.updateOne(
            { _id: trip._id, status: "Full" },
            { $set: { status: "Open" } },
            { session }
          );
        }
        await User.updateOne(
          { _id: booking.traveler, joinedTrips: trip._id },
          { $pull: { joinedTrips: trip._id }, $inc: { totalTripsJoined: -1 } },
          { session }
        );
      }
      await ChatConversation.updateOne(
        { trip: booking.trip, traveler: booking.traveler },
        { $set: { status: "Disabled" } },
        { session }
      );
    }

    await addNotification(booking.traveler, {
      type: "booking-cancelled",
      title: "Booking cancelled",
      detail: `Your unpaid booking${trip?.title ? ` for ${trip.title}` : ""} was cancelled and the trip seat was released.`,
      relatedTrip: booking.trip,
    }, session);
    return booking;
  });
  if (!result) {
    return res.status(409).json({
      success: false,
      message: "Only an accepted booking with a pending payment can be cancelled.",
    });
  }
  res.json({
    success: true,
    message: "Pending payment cancelled, booking removed, and the trip seat released.",
    data: result,
  });
});

const getMyBookings = asyncHandler(async (req, res) => {
  const [bookings, appeals] = await Promise.all([
    BookingPayment.find({ traveler: req.authUser.id })
      .populate(paymentPopulate)
      .sort({ updatedAt: -1 })
      .lean(),
    NoShowAppeal.find({ traveler: req.authUser.id })
      .select("booking status decisionReason")
      .lean(),
  ]);
  const appealsByBooking = new Map(appeals.map((appeal) => [appeal.booking.toString(), appeal]));
  const data = bookings.map((booking) => ({
    ...booking,
    noShowAppealStatus: appealsByBooking.get(booking._id.toString())?.status || "",
    noShowAppealDecisionReason: appealsByBooking.get(booking._id.toString())?.decisionReason || "",
  }));
  res.json({ success: true, count: data.length, data });
});

const getMyBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  if (!mongoose.isObjectIdOrHexString(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID." });
  }
  const isAdmin = req.authUser?.role === "Admin";
  const filter = isAdmin
    ? { _id: bookingId }
    : { _id: bookingId, traveler: req.authUser.id };
  const booking = await BookingPayment.findOne(filter).populate(paymentPopulate).lean();
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
  res.json({ success: true, data: booking });
});

module.exports = {
  getOrganizerPayments,
  getOrganizerPaymentAnalytics,
  getOrganizerPayment,
  completeDemoPayment,
  selectCashPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  markCashPaymentPaid,
  cancelPendingBooking,
  refundCancelledRazorpayPayment,
  getMyBookings,
  getMyBooking,
};
