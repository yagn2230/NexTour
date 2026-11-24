const calculateAverageRating = (reviews = []) => {
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return Math.round((total / reviews.length) * 100) / 100;
};

const calculateTravelPoints = ({ completedTrips = 0, tripsJoined = 0, tripsCreated = 0 }) =>
  completedTrips * 100 + tripsJoined * 25 + tripsCreated * 50;

const calculateCountriesVisited = (trips = []) =>
  [...new Set(trips.map((trip) => trip.country).filter(Boolean))];

const calculateCitiesVisited = (trips = []) =>
  [...new Set(trips.map((trip) => trip.city || trip.destination).filter(Boolean))];

const calculateCompletedTrips = (trips = []) =>
  trips.filter((trip) => trip.status === "Completed").length;

const calculateTotalTravelers = (trips = [], organizerId) => {
  const travelers = new Set();
  for (const trip of trips) {
    for (const member of trip.members || []) {
      const memberId = member.user?._id || member.user;
      if (memberId && memberId.toString() !== organizerId.toString()) {
        travelers.add(memberId.toString());
      }
    }
  }
  return travelers.size;
};

const calculateRevenue = (trips = []) =>
  trips.reduce((total, trip) => {
    const acceptedMembers = (trip.members || []).filter((member) => member.role === "TripMate").length;
    return total + acceptedMembers * Number(trip.pricePerPerson || 0);
  }, 0);

module.exports = {
  calculateAverageRating,
  calculateTravelPoints,
  calculateCountriesVisited,
  calculateCitiesVisited,
  calculateCompletedTrips,
  calculateTotalTravelers,
  calculateRevenue,
  calculateOrganizerRating: calculateAverageRating,
};
