// routes/tripRoutes.js

const express = require("express");
const router = express.Router();

const {
  createTrip,
  getMyTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getExploreTrips,
  getPublicTripById,
  getRelatedTrips,
  leaveTrip,
} = require("../controllers/tripController");

const {
  getItinerary,
  addItineraryDay,
  updateItineraryDay,
  deleteItineraryDay,
  addActivity,
  updateActivity,
  deleteActivity,
} = require("../controllers/itineraryController");

const authMiddleware = require("../middleware/authMiddleware");
const organizerMiddleware = require("../middleware/organizerMiddleware");
const organizerAccessMiddleware = require("../middleware/organizerAccessMiddleware");
const { validateTripInput } = require("../middleware/validationMiddleware");
const {
  createTripRequest,
  getMyTripRequests,
  cancelMyTripRequest,
  acceptTripRequest,
  declineTripRequest,
} = require("../controllers/tripRequestController");

// Explore approved public trips
router.get("/explore", getExploreTrips);
router.get("/related/:id", getRelatedTrips);
router.get("/public/:id", getPublicTripById);

// Protected routes (User must be logged in)
router.use(authMiddleware);

// Trip routes
router.post("/create", organizerMiddleware, validateTripInput, createTrip);
router.get("/my", getMyTrips);
router.get("/requests/mine", getMyTripRequests);
router.post("/:id/join", (req, res, next) => {
  req.params.tripId = req.params.id;
  return createTripRequest(req, res, next);
});
router.post("/:id/leave", leaveTrip);
router.post("/:tripId/requests", createTripRequest);
router.patch("/:tripId/requests/:requestId/cancel", cancelMyTripRequest);
router.post("/:tripId/requests/:requestId/accept", acceptTripRequest);
router.post("/:tripId/requests/:requestId/decline", declineTripRequest);
router.get("/:id", getTripById);
router.put("/:id", organizerAccessMiddleware, validateTripInput, updateTrip);
router.delete("/:id", organizerAccessMiddleware, deleteTrip);

// Itinerary routes
router.get("/:tripId/itinerary", getItinerary);
router.post("/:tripId/itinerary/days", organizerMiddleware, addItineraryDay);
router.put("/:tripId/itinerary/days/:dayId", organizerMiddleware, updateItineraryDay);
router.delete("/:tripId/itinerary/days/:dayId", organizerMiddleware, deleteItineraryDay);

// Activity routes
router.post("/:tripId/itinerary/days/:dayId/activities", organizerMiddleware, addActivity);
router.put("/:tripId/itinerary/days/:dayId/activities/:activityId", organizerMiddleware, updateActivity);
router.delete("/:tripId/itinerary/days/:dayId/activities/:activityId", organizerMiddleware, deleteActivity);

module.exports = router;
