import { API_BASE_URL } from "../../utils/api";
import { formatCurrency } from "../../utils/formatters";

const asArray = (value) => Array.isArray(value) ? value : [];
export const resolveProfileImageUrl = (value) => {
  const source = typeof value === "string" ? value : value?.url || "";
  if (!source || /^(data:|blob:|https?:\/\/)/i.test(source)) return source;
  return `${API_BASE_URL}${source.startsWith("/") ? source : `/${source}`}`;
};

const formatDateRange = (trip) => {
  if (!trip.startDate) return "";
  const start = new Date(trip.startDate);
  const end = trip.endDate ? new Date(trip.endDate) : null;
  const options = { month: "short", day: "numeric", year: "numeric" };
  return end
    ? `${start.toLocaleDateString(undefined, options)} – ${end.toLocaleDateString(undefined, options)}`
    : start.toLocaleDateString(undefined, options);
};

export const adaptTrip = (trip = {}) => ({
  ...trip,
  id: trip._id || trip.id,
  title: trip.title || trip.destination || "Trip",
  destination: [trip.city || trip.destination, trip.country].filter(Boolean).join(", "),
  date: formatDateRange(trip),
  image: resolveProfileImageUrl(trip.coverImage) || resolveProfileImageUrl(trip.images?.[0]),
  status: trip.approvalStatus === "Pending" ? "Pending approval" : trip.status || trip.approvalStatus || "Planned",
  people: trip.members?.length || trip.currentMembers || 0,
});

const adaptReview = (review) => ({
  id: review._id,
  name: review.reviewer?.fullName || "Traveler",
  date: review.createdAt ? new Date(review.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "",
  rating: review.rating,
  avatar: resolveProfileImageUrl(review.reviewer?.profileImage),
  text: review.comment || "",
  trip: review.trip?.title || review.trip?.destination || "",
});

const adaptNotification = (notification) => ({
  id: notification._id,
  title: notification.title,
  detail: notification.detail,
  time: notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : "",
  unread: !notification.readAt,
});

export const adaptProfile = (response) => {
  const result = response?.data || {};
  const statistics = result.statistics || {};
  const userData = result.user || {};
  const trips = result.trips || {};
  const organizer = result.organizer || {};
  const stats = organizer.dashboard || {};
  const user = {
    ...userData,
    fullName: userData.fullName || "NexTour traveler",
    username: userData.username ? `@${userData.username.replace(/^@/, "")}` : "",
    verified: Boolean(userData.isVerified),
    rating: Number(userData.averageRating || 0),
    reviewCount: Number(userData.reviewsCount || result.statistics?.reviewsCount || 0),
    organizerExperience: result.organizer?.experience || "",
    totalTripsCreated: Number(statistics.totalTripsCreated || 0),
    countriesVisited: asArray(statistics.countriesVisited),
    memberSince: userData.memberSince ? new Date(userData.memberSince).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "",
    avatar: resolveProfileImageUrl(userData.profileImage),
    cover: resolveProfileImageUrl(userData.coverImage),
    preferences: asArray(userData.travelPreferences),
    social: Object.entries(userData.socialLinks || {})
      .filter(([, value]) => value)
      .map(([label, value]) => ({
        label: label[0].toUpperCase() + label.slice(1),
        value,
        href: value.startsWith("http") ? value : `https://${value}`,
      })),
  };

  const joined = asArray(trips.joined).map(adaptTrip);
  const created = asArray(trips.created).map(adaptTrip);
  const upcoming = asArray(trips.upcoming).map(adaptTrip);
  const completed = asArray(trips.completed).map(adaptTrip);
  const requestList = asArray(organizer.joinRequests).map((request) => ({
    ...request,
    id: request.id || request._id,
    trip: request.trip || request.tripTitle || "Trip",
  }));
  const travelerList = asArray(organizer.travelers).map((traveler) => ({
    ...traveler,
    trip: traveler.trips?.[0]?.title || "Past traveler",
    status: "Confirmed",
    avatar: resolveProfileImageUrl(traveler.avatar || traveler.profileImage),
  }));
  const notificationList = asArray(organizer.notifications).map(adaptNotification);
  const wishlist = asArray(result.wishlist).map((trip) => ({
    id: trip._id || trip.id,
    name: trip.city || trip.destination || trip.title || "Saved trip",
    country: trip.country || "",
    image: resolveProfileImageUrl(trip.coverImage) || resolveProfileImageUrl(trip.images?.[0]),
  }));
  const favorites = asArray(result.favoriteDestinations).map((destination) => ({
    ...destination,
    name: destination.name || destination.destination || "",
    country: destination.country || "",
    image: "",
  }));
  const organizerStats = [
    { label: "Total trips", value: stats.totalTrips || 0, icon: "trips" },
    { label: "Active trips", value: stats.activeTrips || 0, icon: "active" },
    { label: "Pending approval", value: stats.pendingTrips || 0, icon: "pending" },
    { label: "Completed", value: stats.completedTrips || 0, icon: "completed" },
    { label: "Travelers hosted", value: stats.travelers || 0, icon: "travelers" },
    { label: "Accepted members", value: stats.totalMembers || 0, icon: "travelers" },
    { label: "Pending requests", value: stats.pendingRequests || 0, icon: "pending" },
    { label: "Accepted requests", value: stats.acceptedRequests || 0, icon: "completed" },
    { label: "Rejected requests", value: stats.rejectedRequests || 0, icon: "active" },
    { label: "Average rating", value: Number(stats.averageRating || 0).toFixed(1), icon: "rating" },
    { label: "Estimated revenue", value: stats.revenueTracked ? formatCurrency(Number(stats.revenue)) : "Not tracked", icon: "revenue", change: stats.revenueTracked ? "Accepted Trip Mates × price per person" : "No per-person prices set" },
  ];

  return {
    user,
    statistics: {
      ...statistics,
      completedOrganizerTrips: created.filter((trip) => trip.status === "Completed").length,
    },
    data: {
      trips: { upcoming, joined, previous: completed, history: asArray(trips.history).map(adaptTrip) },
      organizerTrips: {
        created,
        pending: asArray(trips.pending).map(adaptTrip),
        active: asArray(trips.active).map(adaptTrip),
        completed: created.filter((trip) => trip.status === "Completed"),
      },
      reviews: asArray(result.reviews).map(adaptReview),
      achievements: [...asArray(userData.badges), ...asArray(userData.achievements)].map((achievement) => (
        typeof achievement === "string"
          ? { title: achievement, detail: "NexTour achievement", icon: "✦" }
          : achievement
      )),
      gallery: asArray(userData.gallery).map(resolveProfileImageUrl).filter(Boolean),
      wishlist,
      favoriteDestinations: favorites,
      organizerStats,
      revenue: {
        tracked: Boolean(stats.revenueTracked),
        estimated: true,
        total: Number(stats.revenue || 0),
      },
      analytics: [
        { label: "Trips hosted", value: String(stats.totalTrips || 0), percentage: Math.min((stats.totalTrips || 0) * 8, 100) },
        { label: "Travelers welcomed", value: String(stats.travelers || 0), percentage: Math.min((stats.travelers || 0) * 2, 100) },
        { label: "Average rating", value: Number(stats.averageRating || 0).toFixed(1), percentage: Math.min((stats.averageRating || 0) * 20, 100) },
      ],
      joinRequests: requestList,
      travelers: travelerList,
      notifications: notificationList,
      documents: asArray(organizer.documents).map((document, index) => ({
        id: document._id || `${document.name}-${index}`,
        name: document.name || "Organizer document",
        detail: document.mimeType || "Document on file",
        url: document.url || "",
        status: "On file",
      })),
      organizer: {
        status: organizer.status === "Approved" ? "Verified" : organizer.status || "Not Applied",
        experience: organizer.experience || "",
      },
    },
  };
};
