const Trip = require("../models/Trip");
const Review = require("../models/Review");
const User = require("../models/userSchme");
const {
  calculateAverageRating,
  calculateTravelPoints,
  calculateCountriesVisited,
  calculateCitiesVisited,
  calculateCompletedTrips,
} = require("../utils/calculateStats");

const getUserTrips = (userId) =>
  Trip.find({ $or: [{ organizer: userId }, { "members.user": userId }] })
    .select("organizer members status country city destination startDate endDate title")
    .lean();

const getProfileStatistics = async (userId) => {
  const [trips, reviews, user] = await Promise.all([
    getUserTrips(userId),
    Review.find({ user: userId }).select("rating").lean(),
    User.findById(userId).select("badges achievements").lean(),
  ]);
  const id = userId.toString();
  const joinedTrips = trips.filter(
    (trip) => trip.organizer.toString() !== id
      && trip.members.some((member) => member.user.toString() === id)
  );
  const createdTrips = trips.filter((trip) => trip.organizer.toString() === id);
  const completed = trips.filter((trip) => trip.status === "Completed");
  const visited = trips.filter(
    (trip) => trip.status === "Completed"
      && (trip.organizer.toString() === id
        || trip.members.some((member) => member.user.toString() === id))
  );

  return {
    totalTripsJoined: joinedTrips.length,
    totalTripsCreated: createdTrips.length,
    completedTrips: calculateCompletedTrips(completed),
    countriesVisited: calculateCountriesVisited(visited),
    citiesVisited: calculateCitiesVisited(visited),
    travelPoints: calculateTravelPoints({
      completedTrips: completed.length,
      tripsJoined: joinedTrips.length,
      tripsCreated: createdTrips.length,
    }),
    averageRating: calculateAverageRating(reviews),
    reviewsCount: reviews.length,
    badgesCount: user?.badges.length || 0,
    achievementsCount: user?.achievements.length || 0,
  };
};

const getPublicProfile = async (identifier) => {
  const query = /^[a-f\d]{24}$/i.test(identifier)
    ? { _id: identifier }
    : { username: identifier.toLowerCase() };
  const user = await User.findOne(query)
    .select(
      "fullName username profileImage coverImage bio location gender languages travelPreferences "
      + "badges achievements averageRating totalTripsJoined totalTripsCreated countriesVisited "
      + "citiesVisited totalDistance travelPoints isOrganizer organizerVerified "
      + "organizerVerificationStatus memberSince createdAt reviews"
    )
    .populate({
      path: "reviews",
      populate: { path: "reviewer", select: "fullName username profileImage" },
    });
  if (!user) return null;

  const statistics = await getProfileStatistics(user._id);
  return { ...user.toObject(), ...statistics };
};

module.exports = { getUserTrips, getProfileStatistics, getPublicProfile };
