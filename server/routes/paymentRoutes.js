const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getMyBookings,
  getMyBooking,
  completeDemoPayment,
  selectCashPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
} = require("../controllers/bookingPaymentController");
const { cancelTripMateBooking } = require("../controllers/noShowController");

const router = express.Router();

router.post("/razorpay/webhook", handleRazorpayWebhook);
router.use(authMiddleware);
router.get("/mine", getMyBookings);
router.patch("/:bookingId/cancel", cancelTripMateBooking);
router.post("/:bookingId/demo/complete", completeDemoPayment);
router.patch("/:bookingId/payment-method", selectCashPayment);
router.post("/:bookingId/razorpay/order", createRazorpayOrder);
router.post("/:bookingId/razorpay/verify", verifyRazorpayPayment);
router.get("/:bookingId", getMyBooking);

module.exports = router;
