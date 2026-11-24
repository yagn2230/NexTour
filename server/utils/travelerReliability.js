const calculateTravelerReliability = (bookings, noShowCount = 0) => {
  const resolvedAttendance = bookings.filter((booking) =>
    ["Present", "Late", "No-Show"].includes(booking.attendanceStatus)
  );
  const attended = resolvedAttendance.filter((booking) =>
    ["Present", "Late"].includes(booking.attendanceStatus)
  ).length;
  const cancelledTrips = bookings.filter((booking) => booking.cancellationBy === "Traveler").length;
  const tripsCompleted = bookings.filter((booking) =>
    booking.trip?.status === "Completed" && ["Present", "Late"].includes(booking.attendanceStatus)
  ).length;
  const attendancePercentage = resolvedAttendance.length
    ? Math.round((attended / resolvedAttendance.length) * 100)
    : 100;
  const reliabilityScore = Math.max(0, Math.min(100, 100 - (noShowCount * 20)));

  return {
    tripsJoined: bookings.length,
    tripsCompleted,
    cancelledTrips,
    noShowCount,
    reliabilityScore,
    attendancePercentage,
  };
};

module.exports = { calculateTravelerReliability };
