const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const organizerAccessMiddleware = require("../middleware/organizerAccessMiddleware");
const {
  getOrganizerRequestTrips,
  getTripJoinRequests,
  getOrganizerDashboardStats,
  removeTripMember,
  deleteOrganizerTrip,
  updateTripPricePerPerson,
  updateOrganizerTripStatus,
} = require("../controllers/organizerRequestController");
const {
  acceptOrganizerRequest,
  rejectOrganizerRequest,
} = require("../controllers/tripRequestController");
const {
  getOrganizerPayments,
  getOrganizerPaymentAnalytics,
  getOrganizerPayment,
  markCashPaymentPaid,
  cancelPendingBooking,
} = require("../controllers/bookingPaymentController");
const { markCashRefunded, markAttendance } = require("../controllers/noShowController");
const {
  getDashboard,
  getOrganizerTrips,
  getPendingTrips,
  getCompletedTrips,
  getTravelers,
  getOrganizerReviews,
  getAnalytics,
  getNotifications,
} = require("../controllers/organizerController");

const router = express.Router();
router.get("/trips", authMiddleware, organizerAccessMiddleware, getOrganizerRequestTrips);
router.get("/trips/:tripId/requests", authMiddleware, organizerAccessMiddleware, getTripJoinRequests);
router.patch("/requests/:requestId/accept", authMiddleware, organizerAccessMiddleware, acceptOrganizerRequest);
router.patch("/requests/:requestId/reject", authMiddleware, organizerAccessMiddleware, rejectOrganizerRequest);
router.get("/payments", authMiddleware, organizerAccessMiddleware, getOrganizerPayments);
router.get("/payments/analytics", authMiddleware, organizerAccessMiddleware, getOrganizerPaymentAnalytics);
router.get("/payments/:bookingId", authMiddleware, organizerAccessMiddleware, getOrganizerPayment);
router.patch("/payments/:bookingId/mark-cash-paid", authMiddleware, organizerAccessMiddleware, markCashPaymentPaid);
router.patch("/payments/:bookingId/mark-cash-refunded", authMiddleware, organizerAccessMiddleware, markCashRefunded);
router.patch("/payments/:bookingId/attendance", authMiddleware, organizerAccessMiddleware, markAttendance);
router.patch("/payments/:bookingId/cancel", authMiddleware, organizerAccessMiddleware, cancelPendingBooking);
router.get("/dashboard/stats", authMiddleware, organizerAccessMiddleware, getOrganizerDashboardStats);
router.patch("/trips/:tripId/price", authMiddleware, organizerAccessMiddleware, updateTripPricePerPerson);
router.patch("/trips/:tripId/status", authMiddleware, organizerAccessMiddleware, updateOrganizerTripStatus);
router.delete("/trips/:tripId", authMiddleware, organizerAccessMiddleware, deleteOrganizerTrip);
router.delete("/trips/:tripId/members/:memberId", authMiddleware, organizerAccessMiddleware, removeTripMember);

router.use(authMiddleware, organizerAccessMiddleware);
router.get("/dashboard", getDashboard);
router.get("/trips/pending", getPendingTrips);
router.get("/trips/completed", getCompletedTrips);
router.get("/travelers", getTravelers);
router.get("/reviews", getOrganizerReviews);
router.get("/analytics", getAnalytics);
router.get("/notifications", getNotifications);

module.exports = router;
