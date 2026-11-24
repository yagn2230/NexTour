// middleware/validationMiddleware.js

const PlatformSettings = require("../models/PlatformSettings");
const defaultTripCategories = require("../config/defaultTripCategories");

const validateTripInput = async (req, res, next) => {
  const {
    title,
    destination,
    startDate,
    endDate,
    totalBudget,
    pricePerPerson,
    maxMembers,
    category,
    transportation,
    hotelPreference,
    foodPreference,
  } = req.body;
  const isCreate = req.method === "POST";

  const errors = [];

  for (const field of ["country", "state", "city"]) {
    const value = req.body[field];
    if (isCreate && (typeof value !== "string" || !value.trim())) {
      errors.push(`${field[0].toUpperCase()}${field.slice(1)} is required.`);
    } else if (value !== undefined && (typeof value !== "string" || !value.trim())) {
      errors.push(`${field[0].toUpperCase()}${field.slice(1)} must be a non-empty string.`);
    }
  }

  if (req.body.famousPlaces !== undefined && (
    !Array.isArray(req.body.famousPlaces)
    || req.body.famousPlaces.some((place) => typeof place !== "string" || !place.trim())
  )) {
    errors.push("Famous places must be an array of non-empty place names.");
  }

  if (req.body.itinerary !== undefined && !Array.isArray(req.body.itinerary)) {
    errors.push("Itinerary must be an array of days.");
  }

  if (isCreate && (!title || typeof title !== "string" || !title.trim())) {
    errors.push("Title is required.");
  } else if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    errors.push("Title must be a non-empty string.");
  }

  if (isCreate && (!destination || typeof destination !== "string" || !destination.trim())) {
    errors.push("Destination is required.");
  } else if (destination !== undefined && (typeof destination !== "string" || !destination.trim())) {
    errors.push("Destination must be a non-empty string.");
  }

  if (isCreate && (!startDate || isNaN(Date.parse(startDate)))) {
    errors.push("Valid start date is required.");
  } else if (startDate !== undefined && isNaN(Date.parse(startDate))) {
    errors.push("Valid start date is required.");
  }

  if (isCreate && (!endDate || isNaN(Date.parse(endDate)))) {
    errors.push("Valid end date is required.");
  } else if (endDate !== undefined && isNaN(Date.parse(endDate))) {
    errors.push("Valid end date is required.");
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    errors.push("Start date cannot be after end date.");
  }

  const parsedBudget = totalBudget === undefined ? undefined : Number(totalBudget);
  if (
    (isCreate && (totalBudget === undefined || totalBudget === null || totalBudget === "")) ||
    (totalBudget !== undefined &&
      (totalBudget === null ||
        (typeof totalBudget === "string" && !totalBudget.trim()) ||
        !Number.isFinite(parsedBudget) ||
        parsedBudget < 0))
  ) {
    errors.push("Total budget must be a positive number.");
  }

  const parsedPricePerPerson = pricePerPerson === undefined ? undefined : Number(pricePerPerson);
  if (
    (isCreate && (pricePerPerson === undefined || pricePerPerson === null || pricePerPerson === "")) ||
    (pricePerPerson !== undefined &&
      ((typeof pricePerPerson !== "number" && typeof pricePerPerson !== "string") ||
        pricePerPerson === null ||
        (typeof pricePerPerson === "string" && !pricePerPerson.trim()) ||
        !Number.isFinite(parsedPricePerPerson) ||
        parsedPricePerPerson < 0))
  ) {
    errors.push("Price per person must be a non-negative number.");
  }

  const parsedMaxMembers = maxMembers === undefined ? undefined : Number(maxMembers);
  if (
    (isCreate && (maxMembers === undefined || maxMembers === null || maxMembers === "")) ||
    (maxMembers !== undefined &&
      (maxMembers === null ||
        (typeof maxMembers === "string" && !maxMembers.trim()) ||
        !Number.isFinite(parsedMaxMembers) ||
        parsedMaxMembers < 1))
  ) {
    errors.push("Max members must be at least 1.");
  }

  const settings = await PlatformSettings.findOne({ key: "main" }).select("tripCategories").lean();
  const validCategories = settings?.tripCategories?.length
    ? settings.tripCategories
    : defaultTripCategories;
  if (isCreate && !category) {
    errors.push("Trip category is required.");
  } else if (category !== undefined && !validCategories.includes(category)) {
    errors.push(`Category must be one of: ${validCategories.join(", ")}`);
  }
  const activities = Array.isArray(req.body.itinerary)
    ? req.body.itinerary.flatMap((day) => Array.isArray(day?.activities) ? day.activities : [])
    : [];
  if (activities.some((activity) => activity.category && !validCategories.includes(activity.category))) {
    errors.push(`Activity category must be one of: ${validCategories.join(", ")}`);
  }

  const parseImage = (value) => {
    if (typeof value === "string") {
      const url = value.trim();
      return url ? { url } : null;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (typeof value.url !== "string" || !value.url.trim()) return null;
    return {
      url: value.url.trim(),
      ...(typeof value.publicId === "string" ? { publicId: value.publicId.trim() } : {}),
      ...(typeof value.alt === "string" ? { alt: value.alt.trim() } : {}),
    };
  };
  const parseImages = (value) => {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        value = [value];
      }
    }
    if (!Array.isArray(value)) return null;
    const normalized = value.map(parseImage);
    return normalized.every(Boolean) ? normalized : null;
  };

  if (req.body.coverImage !== undefined) {
    const coverImage = parseImage(req.body.coverImage);
    if (!coverImage) {
      errors.push("Cover image must include a valid image URL.");
    } else {
      req.body.coverImage = coverImage;
    }
  }

  if (req.body.images !== undefined) {
    const images = parseImages(req.body.images);
    if (!images) {
      errors.push("Images must be an array of valid image URLs.");
    } else {
      req.body.images = images;
    }
  }

  if (isCreate && !req.body.coverImage && !req.body.images?.length) {
    errors.push("At least one trip image is required.");
  } else if (isCreate && !req.body.coverImage && req.body.images?.length) {
    req.body.coverImage = req.body.images[0];
  }

  if (req.body.isPublic !== undefined) {
    if (typeof req.body.isPublic === "string") {
      const normalizedValue = req.body.isPublic.trim().toLowerCase();
      if (["true", "1"].includes(normalizedValue)) {
        req.body.isPublic = true;
      } else if (["false", "0"].includes(normalizedValue)) {
        req.body.isPublic = false;
      } else {
        errors.push("isPublic must be true or false.");
      }
    } else if (req.body.isPublic !== true && req.body.isPublic !== false) {
      errors.push("isPublic must be true or false.");
    }
  }

  if (req.body.status !== undefined) {
    const validStatuses = ["Open", "Completed", "Cancelled"];
    if (!validStatuses.includes(req.body.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(", ")}. Full status is determined by member count.`);
    }
  }

  const validTransportations = ["Car", "Bus", "Train", "Flight", "Bike", "Other"];
  if (transportation && !validTransportations.includes(transportation)) {
    errors.push(`Transportation must be one of: ${validTransportations.join(", ")}`);
  }

  const validHotels = ["Budget", "Standard", "Luxury"];
  if (hotelPreference && !validHotels.includes(hotelPreference)) {
    errors.push(`Hotel preference must be one of: ${validHotels.join(", ")}`);
  }

  const validFoods = ["Veg", "Non-Veg", "Both"];
  if (foodPreference && !validFoods.includes(foodPreference)) {
    errors.push(`Food preference must be one of: ${validFoods.join(", ")}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors,
    });
  }

  if (totalBudget !== undefined) req.body.totalBudget = parsedBudget;
  if (pricePerPerson !== undefined) req.body.pricePerPerson = parsedPricePerPerson;
  if (maxMembers !== undefined) req.body.maxMembers = parsedMaxMembers;

  next();
};

module.exports = {
  validateTripInput,
};
