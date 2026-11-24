// routes/adminRoutes.js

const express = require("express");
const router = express.Router();

const {
  getPendingTrips,
  getAdminJoinRequests,
  sendAdminNotification,
  getOrganizerRequests,
  approveOrganizer,
  rejectOrganizer,
  revokeOrganizer,
  getApprovedTrips,
  getRejectedTrips,
  getTrip,
  updateTrip,
  approveTrip,
  rejectTrip,
  deleteTrip,
  restoreTrip,
} = require("../controllers/adminController");
const {
  acceptOrganizerRequest,
  rejectOrganizerRequest,
} = require("../controllers/tripRequestController");
const {
  getReports,
  updateReport,
  moderateReport,
} = require("../controllers/reportController");
const {
  getAdminSettings,
  updateAdminSettings,
  getAdminDestinations,
  createAdminDestination,
  updateAdminDestination,
  deleteAdminDestination,
} = require("../controllers/adminSettingsController");
const {
  getNoShowAppeals,
  getNoShowOffenders,
  downloadNoShowEvidence,
  decideNoShowAppeal,
} = require("../controllers/noShowController");


const {
  getAdminStats,
  getAllUsers,
  getUserById,
  updateUser,
  changeUserRole,
  changeUserStatus,
  deleteUser,
  getUserTrips,
} = require("../controllers/adminUserController");

const adminMiddleware = require("../middleware/adminMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const {
  approveVerification,
  rejectVerification,
  getPendingVerifications,
  getVerificationDocument,
} = require("../controllers/verificationController");


router.use(authMiddleware, adminMiddleware);

router.put("/verification/:id/approve", approveVerification);
router.put("/verification/:id/reject", rejectVerification);
router.get("/verification/pending", getPendingVerifications);
router.get("/verification/:id/documents/:field", getVerificationDocument);


router.get("/stats", getAdminStats);
router.get("/no-show-appeals", getNoShowAppeals);
router.get("/no-show-offenders", getNoShowOffenders);
router.get("/no-show-appeals/:appealId/evidence", downloadNoShowEvidence);
router.patch("/no-show-appeals/:appealId/decision", decideNoShowAppeal);
router.get("/join-requests", getAdminJoinRequests);
router.patch("/join-requests/:requestId/accept", acceptOrganizerRequest);
router.patch("/join-requests/:requestId/reject", rejectOrganizerRequest);
router.post("/notifications", sendAdminNotification);
router.get("/reports", getReports);
router.patch("/reports/:reportId", updateReport);
router.post("/reports/:reportId/moderate", moderateReport);
router.get("/settings", getAdminSettings);
router.put("/settings", updateAdminSettings);
router.get("/destinations", getAdminDestinations);
router.post("/destinations", createAdminDestination);
router.put("/destinations/:destinationId", updateAdminDestination);
router.delete("/destinations/:destinationId", deleteAdminDestination);

router.get("/organizer-requests", getOrganizerRequests);
router.put("/users/:id/approve-organizer", approveOrganizer);
router.put("/users/:id/reject-organizer", rejectOrganizer);
router.patch("/users/:id/revoke-organizer", revokeOrganizer);

router.get("/users", getAllUsers);

router.get("/users/:id", getUserById);

router.put("/users/:id", updateUser);

router.patch("/users/:id/role", changeUserRole);

router.patch("/users/:id/status", changeUserStatus);

router.delete("/users/:id", deleteUser);


router.get("/users/:id/trips", getUserTrips);


router.get("/trips/pending", getPendingTrips);

router.get("/trips/approved", getApprovedTrips);

router.get("/trips/rejected", getRejectedTrips);

router.get("/trips/:id", getTrip);

router.put("/trips/:id", updateTrip);

router.patch("/trips/:id/approve", approveTrip);
router.put("/trips/:id/approve", approveTrip);

router.patch("/trips/:id/reject", rejectTrip);
router.put("/trips/:id/reject", rejectTrip);

router.delete("/trips/:id", deleteTrip);

router.patch("/trips/:id/restore", restoreTrip);



module.exports = router;