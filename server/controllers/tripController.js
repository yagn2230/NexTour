// controllers/tripController.js

const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const Destination = require("../models/Destination");
const PlatformSettings = require("../models/PlatformSettings");
const defaultTripCategories = require("../config/defaultTripCategories");
const { City, Country, State } = require("country-state-city");
const mongoose = require("mongoose");
const BookingPayment = require("../models/BookingPayment");
const ChatConversation = require("../models/ChatConversation");
const withTransaction = require("../services/withTransaction");
const { asyncHandler } = require("../middleware/errorMiddleware");

const asIdString = (value) => value?._id?.toString() || value?.toString();
const notifyTripParticipants = async (trip, notification, session) => {
  const recipients = [...new Set([
    asIdString(trip.organizer),
    ...(trip.members || []).map((member) => asIdString(member.user)),
  ].filter(Boolean))];
  if (!recipients.length) return;
  await User.updateMany(
    { _id: { $in: recipients } },
    {
      $push: {
        notifications: {
          $each: [{ ...notification, relatedTrip: trip._id }],
          $sort: { createdAt: -1 },
          $slice: 100,
        },
      },
    },
    session ? { session } : undefined
  );
};

const validateSelectedPlaces = async ({ country, state, city, famousPlaces }) => {
  const countryEntry = Country.getAllCountries().find(
    (entry) => entry.name.toLowerCase() === String(country).toLowerCase()
  );
  const stateEntry = countryEntry && State.getStatesOfCountry(countryEntry.isoCode).find(
    (entry) => entry.name.toLowerCase() === String(state).toLowerCase()
  );
  const cityExists = stateEntry && City.getCitiesOfState(countryEntry.isoCode, stateEntry.isoCode)
    .some((entry) => entry.name.toLowerCase() === String(city).toLowerCase());

  if (!countryEntry || !stateEntry || !cityExists) {
    return "Select a valid country, state, and city from the destination lists.";
  }

  const destination = await Destination.findOne({ country, state, city }).select("famousPlaces");
  if (!destination) {
    return famousPlaces.length === 0
      ? null
      : "No famous places are available for the selected city.";
  }

  if (famousPlaces.some((place) => !destination.famousPlaces.includes(place))) {
    return "One or more selected places are not available for this city.";
  }

  return null;
};

//create the trip
const createTrip = asyncHandler(async (req, res) => {
  const userId = req.authUser?.id || req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login first.",
    });
  }

  const user = await User.findById(userId).select("organizerVerified organizer");
  const isVerifiedOrganizer = user?.organizerVerified
    || (user?.organizer?.isOrganizer && user.organizer.status === "Approved");
  if (!isVerifiedOrganizer) {
    return res.status(403).json({
      success: false,
      message: "Only verified organizers can create trips",
    });
  }

  const {
    title,
    description,
    destination,
    category,
    coverImage,
    images,
    startDate,
    endDate,
    totalBudget,
    pricePerPerson,
    maxMembers,
    transportation,
    hotelPreference,
    foodPreference,
    activityPreference,
    isPublic,
    itinerary,
    country,
    state,
    city,
    famousPlaces = [],
  } = req.body;

  const placesError = await validateSelectedPlaces({ country, state, city, famousPlaces });
  if (placesError) {
    return res.status(400).json({ success: false, message: placesError });
  }

  const trip = new Trip({
    title,
    description: description || "",
    destination: city,
    country,
    state,
    city,
    famousPlaces,
    category,
    coverImage,
    images,
    startDate,
    endDate,
    totalBudget,
    pricePerPerson,
    maxMembers,
    currentMembers: 1,
    organizer: userId,
    members: [
      {
        user: userId,
        role: "Organizer",
        joinedAt: new Date(),
      },
    ],
    itinerary: itinerary === undefined ? [] : itinerary,
    transportation: transportation || "Other",
    hotelPreference: hotelPreference || "Budget",
    foodPreference: foodPreference || "Both",
    activityPreference: activityPreference || "",
    approvalStatus: "Pending",
    status: "Open",
    isPublic: isPublic !== undefined ? isPublic : true,
  });

  const createdTrip = await trip.save();
  await createdTrip.populate("organizer", "fullName email profileImage");
  await createdTrip.populate("members.user", "fullName email profileImage");

  res.status(201).json({
    success: true,
    message: "Trip created successfully and submitted for Admin approval.",
    trip: createdTrip,
  });
});

//get the trips created and joined by the user
const getMyTrips = asyncHandler(async (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login first.",
    });
  }

  const trips = await Trip.find({
    $or: [{ organizer: userId }, { "members.user": userId }],
  })
    .populate("organizer", "fullName email profileImage")
    .populate("members.user", "fullName email profileImage")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: trips.length,
    trips,
    createdTrips: trips.filter((trip) => trip.organizer?._id?.toString() === userId),
    joinedTrips: trips.filter((trip) =>
      trip.organizer?._id?.toString() !== userId
      && trip.members.some((member) => member.user?._id?.toString() === userId)
    ),
  });
});

const joinTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.authUser?.id || req.session?.user?.id;
  const trip = await Trip.findById(id);

  if (!trip) {
    return res.status(404).json({ success: false, message: "Trip not found." });
  }
  if (trip.approvalStatus !== "Approved") {
    return res.status(403).json({
      success: false,
      message: "You can only join approved trips.",
    });
  }
  if (trip.members.some((member) => member.user.toString() === userId)) {
    return res.status(409).json({
      success: false,
      message: "You have already joined this trip.",
    });
  }
  if (trip.status !== "Open" || trip.currentMembers >= trip.maxMembers) {
    return res.status(409).json({ success: false, message: "This trip is full." });
  }

  trip.members.push({ user: userId, role: "TripMate", joinedAt: new Date() });
  await trip.save();
  await trip.populate("organizer", "fullName email profileImage");
  await trip.populate("members.user", "fullName email profileImage");

  res.status(200).json({
    success: true,
    message: "You joined the trip successfully.",
    trip,
  });
});

const leaveTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.authUser?.id || req.session?.user?.id;
  const result = await withTransaction(async (session) => {
    const trip = await Trip.findById(id).session(session);
    if (!trip) return { notFound: true };
    if (trip.organizer.toString() === userId) return { organizer: true };

    const booking = await BookingPayment.findOne({
      trip: trip._id,
      traveler: userId,
      bookingStatus: { $in: ["Accepted", "Confirmed"] },
    }).session(session);
    if (booking) return { activeBooking: true };

    const memberIndex = trip.members.findIndex((member) => member.user.toString() === userId);
    if (memberIndex === -1) return { notMember: true };

    trip.members.splice(memberIndex, 1);
    trip.joinRequests.forEach((request) => {
      if (request.user.toString() === userId && request.status === "Accepted") {
        request.status = "Cancelled";
        request.respondedAt = new Date();
      }
    });
    await trip.save({ session });
    await User.updateOne(
      { _id: userId, joinedTrips: trip._id },
      { $pull: { joinedTrips: trip._id }, $inc: { totalTripsJoined: -1 } },
      { session }
    );
    await ChatConversation.updateOne(
      { trip: trip._id, traveler: userId },
      { $set: { status: "Disabled" } },
      { session }
    );
    return { trip };
  });
  if (result.notFound) return res.status(404).json({ success: false, message: "Trip not found." });
  if (result.organizer) {
    return res.status(400).json({ success: false, message: "Trip organizers cannot leave their own trip." });
  }
  if (result.activeBooking) {
    return res.status(409).json({
      success: false,
      message: "This trip has an active booking. Contact the organizer to resolve the booking before leaving.",
    });
  }
  if (result.notMember) {
    return res.status(404).json({ success: false, message: "You are not a member of this trip." });
  }
  res.status(200).json({ success: true, message: "You left the trip successfully." });
});

//get the trip by id
const getTripById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid trip ID.",
    });
  }

  const sessionUser = req.session?.user;
  const userId = sessionUser?.id || null;

  const trip = await Trip.findById(id)
    .populate("organizer", "fullName email profileImage")
    .populate("members.user", "fullName email profileImage");

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  const isOrganizer = userId && trip.organizer._id.toString() === userId;
  const isAdmin = sessionUser?.role === "Admin";
  const isMember = userId && trip.members.some((m) => m.user._id.toString() === userId);

  // Authorization rule: Non-organizers and non-admins can view trip details if public or approved
  if (!isOrganizer && !isAdmin && trip.approvalStatus !== "Approved" && !isMember) {
    return res.status(403).json({
      success: false,
      message: "This trip is currently pending approval.",
    });
  }

  res.status(200).json({
    success: true,
    isOrganizer,
    trip,
  });
});

const getPublicTripById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid trip ID.",
    });
  }

  const trip = await Trip.findOne({
    _id: id,
    approvalStatus: "Approved",
    isPublic: true,
  })
    .select("-joinRequests")
    .populate("organizer", "fullName username profileImage averageRating")
    .populate("members.user", "fullName username profileImage");

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Public trip not found.",
    });
  }

  res.status(200).json({ success: true, isOrganizer: false, trip });
});

const normalizeRecommendationText = (value) => String(value || "")
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .filter((word) => word.length > 2);

const getTripDurationDays = (trip) => {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.ceil((end - start) / 86_400_000) + 1;
};

const scoreRelatedTrip = (trip, candidate) => {
  let score = 0;
  const same = (left, right) => left && right && left.toLowerCase() === right.toLowerCase();

  if (same(trip.city, candidate.city)) score += 8;
  else if (same(trip.state, candidate.state)) score += 6;
  else if (same(trip.country, candidate.country)) score += 4;

  const tripPlaces = new Set((trip.famousPlaces || []).map((place) => place.toLowerCase()));
  if ((candidate.famousPlaces || []).some((place) => tripPlaces.has(place.toLowerCase()))) score += 2;
  if (same(trip.category, candidate.category)) score += 4;

  const tripBudget = Number(trip.totalBudget);
  const candidateBudget = Number(candidate.totalBudget);
  if (tripBudget > 0 && candidateBudget > 0) {
    const difference = Math.abs(tripBudget - candidateBudget) / tripBudget;
    if (difference <= 0.15) score += 2;
    else if (difference <= 0.35) score += 1;
  }

  const tripDuration = getTripDurationDays(trip);
  const candidateDuration = getTripDurationDays(candidate);
  if (tripDuration && candidateDuration) {
    const difference = Math.abs(tripDuration - candidateDuration);
    if (difference <= 1) score += 2;
    else if (difference <= 3) score += 1;
  }

  const tripActivities = new Set([
    ...normalizeRecommendationText(trip.activityPreference),
    ...(trip.itinerary || []).flatMap((day) => (day.activities || [])
      .flatMap((activity) => normalizeRecommendationText(`${activity.title} ${activity.category}`))),
  ]);
  const candidateActivities = [
    ...normalizeRecommendationText(candidate.activityPreference),
    ...(candidate.itinerary || []).flatMap((day) => (day.activities || [])
      .flatMap((activity) => normalizeRecommendationText(`${activity.title} ${activity.category}`))),
  ];
  if (candidateActivities.some((activity) => tripActivities.has(activity))) score += 3;
  if (same(trip.transportation, candidate.transportation)) score += 1;

  return score;
};

const toRecommendationTrip = (trip) => ({
  _id: trip._id,
  title: trip.title,
  description: trip.description,
  destination: trip.destination,
  country: trip.country,
  state: trip.state,
  city: trip.city,
  coverImage: trip.coverImage,
  startDate: trip.startDate,
  endDate: trip.endDate,
  totalBudget: trip.totalBudget,
  pricePerPerson: trip.pricePerPerson,
  category: trip.category,
  currentMembers: trip.currentMembers,
  maxMembers: trip.maxMembers,
  rating: Number(trip.organizer?.averageRating || 0),
});

const getRelatedTrips = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID." });
  }

  const trip = await Trip.findOne({ _id: id, approvalStatus: "Approved", isPublic: true })
    .select("city state country destination category totalBudget startDate endDate famousPlaces activityPreference transportation itinerary")
    .lean();
  if (!trip) {
    return res.status(404).json({ success: false, message: "Public trip not found." });
  }

  const candidates = await Trip.find({
    _id: { $ne: trip._id },
    approvalStatus: "Approved",
    isPublic: true,
    status: "Open",
    startDate: { $gte: new Date() },
  })
    .select("title description destination country state city coverImage startDate endDate totalBudget pricePerPerson category currentMembers maxMembers famousPlaces activityPreference transportation itinerary.activities.title itinerary.activities.category organizer")
    .populate("organizer", "averageRating")
    .sort({ currentMembers: -1, createdAt: -1 })
    .limit(200)
    .lean();

  const recommendations = candidates
    .map((candidate) => ({
      trip: candidate,
      relevance: scoreRelatedTrip(trip, candidate),
      rating: Number(candidate.organizer?.averageRating || 0),
      popularity: Number(candidate.currentMembers || 0),
    }))
    .filter((candidate) => candidate.relevance >= 3)
    .sort((left, right) => (
      right.relevance - left.relevance
      || right.rating - left.rating
      || right.popularity - left.popularity
    ))
    .slice(0, 6);

  const relatedTrips = recommendations.length
    ? recommendations.map(({ trip: candidate }) => toRecommendationTrip(candidate))
    : candidates
      .sort((left, right) => (
        Number(right.currentMembers || 0) - Number(left.currentMembers || 0)
        || Number(right.organizer?.averageRating || 0) - Number(left.organizer?.averageRating || 0)
      ))
      .slice(0, 6)
      .map(toRecommendationTrip);

  res.json({
    success: true,
    mode: recommendations.length ? "related" : "trending",
    count: relatedTrips.length,
    data: relatedTrips,
  });
});

//update the trip
const updateTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID." });
  }
  const filter = { _id: id };
  if (req.authUser?.role !== "Admin") filter.organizer = req.authUser?.id || req.session?.user?.id;
  const trip = await Trip.findOne(filter);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found.",
    });
  }

  // Authorization check: Only organizer can update their trip
  const {
    title,
    description,
    destination,
    category,
    coverImage,
    images,
    startDate,
    endDate,
    totalBudget,
    pricePerPerson,
    maxMembers,
    transportation,
    hotelPreference,
    foodPreference,
    activityPreference,
    isPublic,
    status,
    itinerary,
    country,
    state,
    city,
    famousPlaces,
  } = req.body;

  if (famousPlaces !== undefined) {
    if (!Array.isArray(famousPlaces) || famousPlaces.some((place) => typeof place !== "string")) {
      return res.status(400).json({
        success: false,
        message: "Selected famous places must be an array of place names.",
      });
    }
    const placesError = await validateSelectedPlaces({
      country: country ?? trip.country,
      state: state ?? trip.state,
      city: city ?? trip.city,
      famousPlaces,
    });
    if (placesError) {
      return res.status(400).json({ success: false, message: placesError });
    }
    trip.famousPlaces = famousPlaces;
  } else if (
    (country !== undefined && country !== trip.country)
    || (state !== undefined && state !== trip.state)
    || (city !== undefined && city !== trip.city)
  ) {
    trip.famousPlaces = [];
  }

  if (title !== undefined) trip.title = title;
  if (description !== undefined) trip.description = description;
  if (destination !== undefined) trip.destination = destination;
  if (country !== undefined) trip.country = country;
  if (state !== undefined) trip.state = state;
  if (city !== undefined) {
    trip.city = city;
    trip.destination = city;
  }
  if (category !== undefined) trip.category = category;
  if (coverImage !== undefined) trip.coverImage = coverImage;
  if (images !== undefined) trip.images = images;
  if (startDate !== undefined) trip.startDate = startDate;
  if (endDate !== undefined) trip.endDate = endDate;
  if (totalBudget !== undefined) trip.totalBudget = totalBudget;
  if (pricePerPerson !== undefined) trip.pricePerPerson = pricePerPerson;
  if (maxMembers !== undefined) trip.maxMembers = maxMembers;
  if (transportation !== undefined) trip.transportation = transportation;
  if (hotelPreference !== undefined) trip.hotelPreference = hotelPreference;
  if (foodPreference !== undefined) trip.foodPreference = foodPreference;
  if (activityPreference !== undefined) trip.activityPreference = activityPreference;
  if (isPublic !== undefined) trip.isPublic = isPublic;
  if (itinerary !== undefined) trip.itinerary = itinerary;
  if (status && ["Open", "Completed", "Cancelled"].includes(status)) {
    if (status === "Cancelled") {
      const activeBooking = await BookingPayment.findOne({
        trip: trip._id,
        bookingStatus: { $in: ["Accepted", "Confirmed"] },
      }).select("_id");
      if (activeBooking) {
        return res.status(409).json({
          success: false,
          message: "Resolve active bookings before cancelling this trip.",
        });
      }
    }
    trip.status = status;
  }

  const updatedTrip = await trip.save();
  await updatedTrip.populate("organizer", "fullName email profileImage");
  await updatedTrip.populate("members.user", "fullName email profileImage");
  if (updatedTrip.status === "Cancelled") {
    await ChatConversation.updateMany(
      { trip: updatedTrip._id, status: "Active" },
      { $set: { status: "Disabled" } }
    );
  }
  await notifyTripParticipants(updatedTrip, {
    type: "trip-updated",
    title: "Trip details updated",
    detail: `${updatedTrip.title} has new trip details. Check the latest information.`,
  });

  res.status(200).json({
    success: true,
    message: "Trip updated successfully.",
    trip: updatedTrip,
  });
});

//delete the trip
const deleteTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID." });
  }
  const filter = { _id: id };
  if (req.authUser?.role !== "Admin") filter.organizer = req.authUser?.id || req.session?.user?.id;
  const deletion = await withTransaction(async (session) => {
    const activeBooking = await BookingPayment.findOne({
      trip: id,
      bookingStatus: { $in: ["Accepted", "Confirmed"] },
    }).session(session);
    if (activeBooking) return { activeBooking: true };
    const trip = await Trip.findOneAndDelete(filter, { session });
    if (!trip) return { notFound: true };
    await notifyTripParticipants(trip, {
      type: "trip-deleted",
      title: "Trip deleted",
      detail: `${trip.title} has been deleted.`,
    }, session);
    await ChatConversation.updateMany(
      { trip: trip._id, status: "Active" },
      { $set: { status: "Disabled" } },
      { session }
    );
    await User.updateMany(
      { $or: [{ wishlist: trip._id }, { joinedTrips: trip._id }, { createdTrips: trip._id }] },
      { $pull: { wishlist: trip._id, joinedTrips: trip._id, createdTrips: trip._id } },
      { session }
    );
    return { trip };
  });
  if (deletion.activeBooking) {
    return res.status(409).json({
      success: false,
      message: "Resolve active bookings before deleting this trip. Pending bookings can be cancelled from the payment dashboard.",
    });
  }
  if (deletion.notFound) {
    return res.status(404).json({ success: false, message: "Trip not found." });
  }

  res.status(200).json({
    success: true,
    message: "Trip deleted successfully.",
  });
});
//get the explore trips
const getExploreTrips = asyncHandler(async (req, res) => {
  const query = {
    approvalStatus: "Approved",
    isPublic: true,
  };
  const regions = {
    Africa: ["South Africa", "Morocco", "Egypt", "Tanzania"],
    Asia: ["Thailand", "Japan", "Indonesia", "India"],
    Europe: ["Iceland", "Italy", "Spain", "Portugal", "Greece"],
    Americas: ["Canada", "United States", "Mexico", "Brazil", "Peru", "Colombia"],
    Oceania: ["Australia", "New Zealand"],
  };
  const indiaRegions = {
    North: ["Chandigarh", "Delhi", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Ladakh", "Punjab", "Uttar Pradesh", "Uttarakhand"],
    South: ["Andaman and Nicobar Islands", "Andhra Pradesh", "Karnataka", "Kerala", "Lakshadweep", "Puducherry", "Tamil Nadu", "Telangana"],
    "North East": ["Arunachal Pradesh", "Assam", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Sikkim", "Tripura"],
    West: ["Dadra and Nagar Haveli and Daman and Diu", "Goa", "Gujarat", "Maharashtra", "Rajasthan"],
  };
  const transportations = ["Car", "Bus", "Train", "Flight", "Bike", "Other"];
  const parseNumberFilter = (key, { integer = false, min = 0 } = {}) => {
    const rawValue = req.query[key];
    if (rawValue === undefined) return null;
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < min || (integer && !Number.isInteger(value))) {
      return NaN;
    }
    return value;
  };

  const locationFilters = [];
  if (typeof req.query.country === "string" && req.query.country.trim()) {
    const destination = req.query.country.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const destinationRegex = new RegExp(`^${destination}$`, "i");
    locationFilters.push({
      $or: [
        { country: destinationRegex },
        { state: destinationRegex },
        { city: destinationRegex },
        { destination: destinationRegex },
      ],
    });
  }

  if (typeof req.query.region === "string" && req.query.region.trim()) {
    const region = req.query.region.trim();
    if (!regions[region]) {
      return res.status(400).json({ success: false, message: "Choose a valid continent." });
    }
    locationFilters.push({ country: { $in: regions[region] } });
  }

  if (typeof req.query.indiaRegion === "string" && req.query.indiaRegion.trim()) {
    const indiaRegion = req.query.indiaRegion.trim();
    const states = indiaRegions[indiaRegion];
    if (!states) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid Indian region.",
      });
    }
    query.state = { $in: states };
    locationFilters.push({ country: /^India$/i });
  }
  if (locationFilters.length) {
    query.$and = locationFilters;
  }

  if (typeof req.query.category === "string" && req.query.category.trim()) {
    const category = req.query.category.trim();
    const settings = await PlatformSettings.findOne({ key: "main" }).select("tripCategories").lean();
    const categories = settings?.tripCategories?.length
      ? settings.tripCategories
      : defaultTripCategories;
    if (!categories.includes(category)) {
      return res.status(400).json({ success: false, message: "Choose a valid trip category." });
    }
    query.category = category;
  }

  if (typeof req.query.transportation === "string" && req.query.transportation.trim()) {
    const transportation = req.query.transportation.trim();
    if (!transportations.includes(transportation)) {
      return res.status(400).json({ success: false, message: "Choose a valid transportation type." });
    }
    query.transportation = transportation;
  }

  if (typeof req.query.departureMonth === "string" && req.query.departureMonth.trim()) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(req.query.departureMonth.trim());
    if (!match) {
      return res.status(400).json({ success: false, message: "Departure month must use YYYY-MM format." });
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    query.startDate = {
      $gte: new Date(Date.UTC(year, month, 1)),
      $lt: new Date(Date.UTC(year, month + 1, 1)),
    };
  }

  const minBudget = parseNumberFilter("minBudget");
  const maxBudget = parseNumberFilter("maxBudget");
  const minDurationDays = parseNumberFilter("minDurationDays", { integer: true, min: 1 });
  const maxDurationDays = parseNumberFilter("maxDurationDays", { integer: true, min: 1 });
  if ([minBudget, maxBudget, minDurationDays, maxDurationDays].some(Number.isNaN)) {
    return res.status(400).json({
      success: false,
      message: "Budget filters must be non-negative numbers and duration filters must be positive whole days.",
    });
  }
  if (minBudget !== null || maxBudget !== null) {
    query.totalBudget = {};
    if (minBudget !== null) query.totalBudget.$gte = minBudget;
    if (maxBudget !== null) query.totalBudget.$lte = maxBudget;
  }
  if (
    (minBudget !== null && maxBudget !== null && minBudget > maxBudget)
    || (minDurationDays !== null && maxDurationDays !== null && minDurationDays > maxDurationDays)
  ) {
    return res.status(400).json({ success: false, message: "Minimum filter values cannot exceed maximum values." });
  }
  if (minDurationDays !== null || maxDurationDays !== null) {
    const durationDays = {
      $add: [
        1,
        { $ceil: { $divide: [{ $subtract: ["$endDate", "$startDate"] }, 86_400_000] } },
      ],
    };
    query.$expr = {
      $and: [
        ...(minDurationDays !== null ? [{ $gte: [durationDays, minDurationDays] }] : []),
        ...(maxDurationDays !== null ? [{ $lte: [durationDays, maxDurationDays] }] : []),
      ],
    };
  }

  if (typeof req.query.organizerId === "string" && req.query.organizerId.trim()) {
    const organizerId = req.query.organizerId.trim();
    if (!mongoose.isObjectIdOrHexString(organizerId)) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid trip leader.",
      });
    }
    query.organizer = organizerId;
  }

  if (typeof req.query.organizerLanguage === "string" && req.query.organizerLanguage.trim()) {
    const language = req.query.organizerLanguage.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const organizerIds = await User.find({
      languages: new RegExp(`^${language}$`, "i"),
    }).distinct("_id");
    query.$and = [
      ...(query.$and || []),
      { organizer: { $in: organizerIds } },
    ];
  }

  if (typeof req.query.search === "string" && req.query.search.trim()) {
    const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(search, "i");
    query.$or = [
      { destination: searchRegex },
      { title: searchRegex },
      { city: searchRegex },
      { country: searchRegex },
    ];
  }

  const trips = await Trip.find(query)
    .populate("organizer", "fullName username profileImage averageRating totalTripsCreated")
    .populate("members.user", "fullName profileImage")
    .sort({ isFeatured: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: trips.length,
    trips,
  });
});

module.exports = {
  createTrip,
  getMyTrips,
  getTripById,
  getPublicTripById,
  getRelatedTrips,
  updateTrip,
  deleteTrip,
  getExploreTrips,
  joinTrip,
  leaveTrip,
};
