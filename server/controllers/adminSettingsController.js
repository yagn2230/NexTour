const mongoose = require("mongoose");
const Destination = require("../models/Destination");
const PlatformSettings = require("../models/PlatformSettings");
const Trip = require("../models/Trip");
const { asyncHandler } = require("../middleware/errorMiddleware");
const defaultTripCategories = require("../config/defaultTripCategories");

const editableSettings = ["termsAndConditions", "privacyPolicy", "contactEmail", "contactPhone", "supportUrl", "tripCategories"];

const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await PlatformSettings.findOne({ key: "main" })
    .select("-__v")
    .lean();
  res.json({
    success: true,
    data: settings || {
      termsAndConditions: "",
      privacyPolicy: "",
      contactEmail: "",
      contactPhone: "",
      supportUrl: "",
      tripCategories: defaultTripCategories,
      updatedAt: null,
    },
  });
});

const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await PlatformSettings.findOne({ key: "main" })
    .select("termsAndConditions privacyPolicy contactEmail contactPhone supportUrl tripCategories")
    .lean();
  res.json({
    success: true,
    data: settings || {
      termsAndConditions: "",
      privacyPolicy: "",
      contactEmail: "",
      contactPhone: "",
      supportUrl: "",
      tripCategories: defaultTripCategories,
    },
  });
});

const updateAdminSettings = asyncHandler(async (req, res) => {
  const updates = Object.fromEntries(
    editableSettings
      .filter((field) => req.body[field] !== undefined)
      .map((field) => [field, req.body[field]])
  );
  if (!Object.keys(updates).length) {
    return res.status(400).json({ success: false, message: "Provide at least one setting to update." });
  }
  for (const field of ["termsAndConditions", "privacyPolicy", "contactEmail", "contactPhone", "supportUrl"]) {
    if (updates[field] !== undefined && typeof updates[field] !== "string") {
      return res.status(400).json({ success: false, message: `${field} must be a string.` });
    }
  }
  if (updates.tripCategories !== undefined) {
    if (
      !Array.isArray(updates.tripCategories)
      || updates.tripCategories.length < 1
      || updates.tripCategories.length > 50
      || updates.tripCategories.some((category) => typeof category !== "string" || !category.trim() || category.trim().length > 50)
    ) {
      return res.status(400).json({ success: false, message: "Keep between 1 and 50 non-empty trip categories, each 50 characters or fewer." });
    }
    const categories = updates.tripCategories.map((category) => category.trim());
    if (new Set(categories.map((category) => category.toLowerCase())).size !== categories.length) {
      return res.status(400).json({ success: false, message: "Trip categories must be unique." });
    }
    updates.tripCategories = categories;
  }
  if (updates.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.contactEmail.trim())) {
    return res.status(400).json({ success: false, message: "Contact email must be valid." });
  }
  if (updates.tripCategories) {
    const existingSettings = await PlatformSettings.findOne({ key: "main" }).select("tripCategories").lean();
    const currentCategories = existingSettings?.tripCategories || defaultTripCategories;
    const categoriesChanged = currentCategories.length !== updates.tripCategories.length
      || currentCategories.some((category, index) => category !== updates.tripCategories[index]);
    if (categoriesChanged) {
      const removedTripCategories = await Trip.distinct("category", {
        category: { $exists: true, $nin: updates.tripCategories },
      });
      const removedActivityCategories = await Trip.aggregate([
        { $unwind: "$itinerary" },
        { $unwind: "$itinerary.activities" },
        { $match: { "itinerary.activities.category": { $exists: true, $nin: updates.tripCategories } } },
        { $group: { _id: "$itinerary.activities.category" } },
      ]);
      const inUse = [...new Set([
        ...removedTripCategories,
        ...removedActivityCategories.map((entry) => entry._id),
      ])];
      if (inUse.length) {
        return res.status(409).json({
          success: false,
          message: `Cannot remove categories currently used by trips or activities: ${inUse.join(", ")}.`,
        });
      }
    }
  }
  if (updates.supportUrl) {
    let url;
    try {
      url = new URL(updates.supportUrl.trim());
    } catch {
      return res.status(400).json({ success: false, message: "Support URL must be a valid HTTP or HTTPS URL." });
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      return res.status(400).json({ success: false, message: "Support URL must use HTTP or HTTPS." });
    }
  }
  const settings = await PlatformSettings.findOneAndUpdate(
    { key: "main" },
    {
      $set: {
        ...Object.fromEntries(Object.entries(updates).map(([field, value]) => [
          field,
          typeof value === "string" ? value.trim() : value,
        ])),
        updatedBy: req.authUser?.id || req.session?.user?.id,
      },
      $setOnInsert: { key: "main" },
    },
    { new: true, upsert: true, runValidators: true }
  ).select("-__v");
  res.json({ success: true, message: "Platform settings saved.", data: settings });
});

const getAdminDestinations = asyncHandler(async (req, res) => {
  const destinations = await Destination.find()
    .sort({ country: 1, state: 1, city: 1 })
    .lean();
  res.json({ success: true, count: destinations.length, data: destinations });
});

const normalizeDestination = (body) => {
  const fields = ["country", "state", "city"];
  const normalized = {};
  for (const field of fields) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string" || !body[field].trim() || body[field].trim().length > 100) {
        return { error: `${field} must be a non-empty string of at most 100 characters.` };
      }
      normalized[field] = body[field].trim();
    }
  }
  if (body.famousPlaces !== undefined) {
    if (
      !Array.isArray(body.famousPlaces)
      || body.famousPlaces.length > 100
      || body.famousPlaces.some((place) => typeof place !== "string" || !place.trim() || place.trim().length > 100)
    ) {
      return { error: "Famous places must be a list of at most 100 non-empty names of 100 characters or fewer." };
    }
    normalized.famousPlaces = [...new Set(body.famousPlaces.map((place) => place.trim()))];
  }
  return { data: normalized };
};

const createAdminDestination = asyncHandler(async (req, res) => {
  const normalized = normalizeDestination(req.body);
  if (normalized.error) return res.status(400).json({ success: false, message: normalized.error });
  if (["country", "state", "city"].some((field) => !normalized.data[field])) {
    return res.status(400).json({ success: false, message: "Country, state, and city are required." });
  }
  const exists = await Destination.exists({
    country: normalized.data.country,
    state: normalized.data.state,
    city: normalized.data.city,
  });
  if (exists) return res.status(409).json({ success: false, message: "This destination already exists." });

  const destination = await Destination.create(normalized.data);
  res.status(201).json({ success: true, message: "Destination added.", data: destination });
});

const updateAdminDestination = asyncHandler(async (req, res) => {
  const { destinationId } = req.params;
  if (!mongoose.isObjectIdOrHexString(destinationId)) {
    return res.status(400).json({ success: false, message: "Invalid destination ID." });
  }
  const normalized = normalizeDestination(req.body);
  if (normalized.error) return res.status(400).json({ success: false, message: normalized.error });
  if (!Object.keys(normalized.data).length) {
    return res.status(400).json({ success: false, message: "Provide destination details to update." });
  }
  const destination = await Destination.findById(destinationId);
  if (!destination) return res.status(404).json({ success: false, message: "Destination not found." });
  Object.assign(destination, normalized.data);
  const duplicate = await Destination.exists({
    _id: { $ne: destination._id },
    country: destination.country,
    state: destination.state,
    city: destination.city,
  });
  if (duplicate) return res.status(409).json({ success: false, message: "This destination already exists." });
  await destination.save();
  res.json({ success: true, message: "Destination updated.", data: destination });
});

const deleteAdminDestination = asyncHandler(async (req, res) => {
  const { destinationId } = req.params;
  if (!mongoose.isObjectIdOrHexString(destinationId)) {
    return res.status(400).json({ success: false, message: "Invalid destination ID." });
  }
  const destination = await Destination.findByIdAndDelete(destinationId);
  if (!destination) return res.status(404).json({ success: false, message: "Destination not found." });
  res.json({ success: true, message: "Destination removed." });
});

module.exports = {
  getAdminSettings,
  getPublicSettings,
  updateAdminSettings,
  getAdminDestinations,
  createAdminDestination,
  updateAdminDestination,
  deleteAdminDestination,
};
