export const getTripId = (trip) => trip?._id || trip?.id;

export const getTripValue = (trip, keys, fallback = "") => {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], trip);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

export const getTripImage = (trip) => {
  const candidates = [
    trip?.coverImage,
    trip?.image,
    trip?.coverImageUrl,
    trip?.imageUrl,
    ...(Array.isArray(trip?.images) ? trip.images : []),
  ];

  for (const candidate of candidates) {
    const url = typeof candidate === "string"
      ? candidate
      : candidate?.url || candidate?.src;
    if (typeof url === "string" && url.trim()) return url.trim();
  }

  return "";
};

export const getTripLocation = (trip) => {
  const location = [
    getTripValue(trip, ["city", "destination", "location"]),
    getTripValue(trip, ["state", "region"]),
    getTripValue(trip, ["country"]),
  ].filter(Boolean);

  return [...new Set(location)].join(", ") || "Destination TBD";
};

export const getTripStatus = (trip, fallback = "pending") =>
  String(trip?.approvalStatus || trip?._adminStatus || trip?.status || fallback).toLowerCase();

export const getTripOrganizer = (trip) =>
  getTripValue(trip, [
    "organizer.fullName",
    "organizer.name",
    "organizer.username",
    "createdBy.fullName",
    "createdBy.name",
    "user.fullName",
    "user.name",
    "organizerName",
  ], "Unknown organizer");

export const getTripsFromResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.trips)) return response.trips;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.trips)) return response.data.trips;
  return null;
};

export const getTripFromResponse = (response) =>
  response?.trip || response?.data?.trip || response?.data || response;
