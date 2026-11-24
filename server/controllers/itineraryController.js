// controllers/itineraryController.js

const Trip = require("../models/Trip");
const PlatformSettings = require("../models/PlatformSettings");
const defaultTripCategories = require("../config/defaultTripCategories");
const { asyncHandler } = require("../middleware/errorMiddleware");

const isConfiguredCategory = async (category) => {
  const settings = await PlatformSettings.findOne({ key: "main" }).select("tripCategories").lean();
  const categories = settings?.tripCategories?.length
    ? settings.tripCategories
    : defaultTripCategories;
  return categories.includes(category);
};

// Helper function to validate time format "HH:MM"
const isValidTime = (timeStr) => {
  if (!timeStr) return true;
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(timeStr);
};

// Helper function to check if startTime <= endTime
const isTimeSequenceValid = (startTime, endTime) => {
  if (!startTime || !endTime) return true;
  return startTime <= endTime;
};

/**
 * @desc    Get complete itinerary of a trip
 * @route   GET /trips/:tripId/itinerary
 * @access  Private
 */
const getItinerary = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.session.user ? req.session.user.id : null;

  const trip = await Trip.findById(tripId).select("title destination startDate endDate organizer approvalStatus itinerary members");

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  const isOrganizer = userId && trip.organizer.toString() === userId;

  // Authorization rule: TripMates can only view itinerary if trip is approved (or if they are the organizer)
  if (!isOrganizer && trip.approvalStatus !== "Approved") {
    return res.status(403).json({
      success: false,
      message: "Itinerary is available for viewing only after the trip has been approved by Admin.",
    });
  }

  // Sort itinerary days by dayNumber
  const sortedItinerary = trip.itinerary.sort((a, b) => a.dayNumber - b.dayNumber);

  res.status(200).json({
    success: true,
    tripId: trip._id,
    tripTitle: trip.title,
    startDate: trip.startDate,
    endDate: trip.endDate,
    isOrganizer,
    itinerary: sortedItinerary,
  });
});

//add the itinerary day
const addItineraryDay = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.session.user.id;
  const { dayNumber, date, title } = req.body;

  const trip = await Trip.findById(tripId);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  // Check if user is organizer
  if (trip.organizer.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only the Trip Organizer can manage the itinerary.",
    });
  }

  const calculatedDayNumber = dayNumber || trip.itinerary.length + 1;

  // Validate day date against trip boundaries if date provided
  if (date) {
    const dayDate = new Date(date);
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);

    // Set hours to 0 to compare dates only
    dayDate.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (dayDate < startDate || dayDate > endDate) {
      return res.status(400).json({
        success: false,
        message: `Day date must fall between trip start date (${trip.startDate.toISOString().split('T')[0]}) and end date (${trip.endDate.toISOString().split('T')[0]}).`,
      });
    }
  }

  trip.itinerary.push({
    dayNumber: Number(calculatedDayNumber),
    date: date ? new Date(date) : undefined,
    title: title || `Day ${calculatedDayNumber}`,
    activities: [],
  });

  await trip.save();

  res.status(201).json({
    success: true,
    message: "Itinerary day added successfully.",
    itinerary: trip.itinerary,
  });
});

//update the itinerary day
const updateItineraryDay = asyncHandler(async (req, res) => {
  const { tripId, dayId } = req.params;
  const userId = req.session.user.id;
  const { dayNumber, date, title } = req.body;

  const trip = await Trip.findById(tripId);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  if (trip.organizer.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only the Trip Organizer can edit the itinerary.",
    });
  }

  const day = trip.itinerary.id(dayId);
  if (!day) {
    return res.status(404).json({
      success: false,
      message: "Itinerary day not found.",
    });
  }

  if (date) {
    const dayDate = new Date(date);
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    dayDate.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (dayDate < startDate || dayDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "Day date must fall between trip start date and end date.",
      });
    }
    day.date = new Date(date);
  }

  if (dayNumber !== undefined) day.dayNumber = Number(dayNumber);
  if (title !== undefined) day.title = title;

  await trip.save();

  res.status(200).json({
    success: true,
    message: "Itinerary day updated successfully.",
    day,
  });
});

//delete the itinerary day
const deleteItineraryDay = asyncHandler(async (req, res) => {
  const { tripId, dayId } = req.params;
  const userId = req.session.user.id;

  const trip = await Trip.findById(tripId);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  if (trip.organizer.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only the Trip Organizer can edit the itinerary.",
    });
  }

  const dayIndex = trip.itinerary.findIndex((d) => d._id.toString() === dayId);
  if (dayIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Itinerary day not found.",
    });
  }

  trip.itinerary.splice(dayIndex, 1);
  await trip.save();

  res.status(200).json({
    success: true,
    message: "Itinerary day deleted successfully.",
    itinerary: trip.itinerary,
  });
});

//add the activity
const addActivity = asyncHandler(async (req, res) => {
  const { tripId, dayId } = req.params;
  const userId = req.session.user.id;
  const {
    title,
    description,
    location,
    date,
    startTime,
    endTime,
    estimatedCost,
    category,
    notes,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "Activity title is required.",
    });
  }
  const selectedCategory = category || "Other";
  if (!await isConfiguredCategory(selectedCategory)) {
    return res.status(400).json({ success: false, message: "Choose an active activity category." });
  }

  const trip = await Trip.findById(tripId);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  if (trip.organizer.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only the Trip Organizer can edit the itinerary.",
    });
  }

  const day = trip.itinerary.id(dayId);
  if (!day) {
    return res.status(404).json({
      success: false,
      message: "Itinerary day not found.",
    });
  }

  // Validation 1: Estimated cost cannot be negative
  if (estimatedCost !== undefined && Number(estimatedCost) < 0) {
    return res.status(400).json({
      success: false,
      message: "Estimated cost cannot be negative.",
    });
  }

  // Validation 2: End time cannot be earlier than start time
  if (startTime && endTime && !isTimeSequenceValid(startTime, endTime)) {
    return res.status(400).json({
      success: false,
      message: "End time cannot be earlier than start time.",
    });
  }

  // Validation 3: Activity date must fall between trip startDate and endDate
  if (date) {
    const actDate = new Date(date);
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    actDate.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (actDate < startDate || actDate > endDate) {
      return res.status(400).json({
        success: false,
        message: `Activity date must fall between trip start date (${trip.startDate.toISOString().split('T')[0]}) and end date (${trip.endDate.toISOString().split('T')[0]}).`,
      });
    }
  }

  const newActivity = {
    title,
    description: description || "",
    location: location || "",
    date: date ? new Date(date) : day.date || undefined,
    startTime: startTime || "",
    endTime: endTime || "",
    estimatedCost: estimatedCost ? Number(estimatedCost) : 0,
    category: selectedCategory,
    notes: notes || "",
  };

  day.activities.push(newActivity);
  await trip.save();

  res.status(201).json({
    success: true,
    message: "Activity added successfully.",
    day,
  });
});

//update the activity
const updateActivity = asyncHandler(async (req, res) => {
  const { tripId, dayId, activityId } = req.params;
  const userId = req.session.user.id;
  const {
    title,
    description,
    location,
    date,
    startTime,
    endTime,
    estimatedCost,
    category,
    notes,
  } = req.body;

  const trip = await Trip.findById(tripId);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  if (trip.organizer.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only the Trip Organizer can edit the itinerary.",
    });
  }
  if (category && !await isConfiguredCategory(category)) {
    return res.status(400).json({ success: false, message: "Choose an active activity category." });
  }

  const day = trip.itinerary.id(dayId);
  if (!day) {
    return res.status(404).json({
      success: false,
      message: "Itinerary day not found.",
    });
  }

  const activity = day.activities.id(activityId);
  if (!activity) {
    return res.status(404).json({
      success: false,
      message: "Activity not found.",
    });
  }

  if (estimatedCost !== undefined && Number(estimatedCost) < 0) {
    return res.status(400).json({
      success: false,
      message: "Estimated cost cannot be negative.",
    });
  }

  const finalStartTime = startTime !== undefined ? startTime : activity.startTime;
  const finalEndTime = endTime !== undefined ? endTime : activity.endTime;

  if (finalStartTime && finalEndTime && !isTimeSequenceValid(finalStartTime, finalEndTime)) {
    return res.status(400).json({
      success: false,
      message: "End time cannot be earlier than start time.",
    });
  }

  if (date) {
    const actDate = new Date(date);
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    actDate.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (actDate < startDate || actDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "Activity date must fall between trip start date and end date.",
      });
    }
    activity.date = new Date(date);
  }

  if (title) activity.title = title;
  if (description !== undefined) activity.description = description;
  if (location !== undefined) activity.location = location;
  if (startTime !== undefined) activity.startTime = startTime;
  if (endTime !== undefined) activity.endTime = endTime;
  if (estimatedCost !== undefined) activity.estimatedCost = Number(estimatedCost);
  if (category) activity.category = category;
  if (notes !== undefined) activity.notes = notes;

  await trip.save();

  res.status(200).json({
    success: true,
    message: "Activity updated successfully.",
    day,
  });
});

//delete the activity
const deleteActivity = asyncHandler(async (req, res) => {
  const { tripId, dayId, activityId } = req.params;
  const userId = req.session.user.id;

  const trip = await Trip.findById(tripId);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  if (trip.organizer.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only the Trip Organizer can edit the itinerary.",
    });
  }

  const day = trip.itinerary.id(dayId);
  if (!day) {
    return res.status(404).json({
      success: false,
      message: "Itinerary day not found.",
    });
  }

  const actIndex = day.activities.findIndex((a) => a._id.toString() === activityId);
  if (actIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Activity not found.",
    });
  }

  day.activities.splice(actIndex, 1);
  await trip.save();

  res.status(200).json({
    success: true,
    message: "Activity deleted successfully.",
    day,
  });
});

module.exports = {
  getItinerary,
  addItineraryDay,
  updateItineraryDay,
  deleteItineraryDay,
  addActivity,
  updateActivity,
  deleteActivity,
};
