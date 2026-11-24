import StatCard from "./Common/StatCard";

export default function ProfileStats({ role = "traveler", statistics = {} }) {
  const stats = role === "organizer"
    ? [
        { label: "Trips hosted", value: statistics.totalTripsCreated || 0, icon: "trips" },
        { label: "Completed", value: statistics.completedOrganizerTrips || 0, icon: "completed" },
        { label: "Rating", value: Number(statistics.averageRating || 0).toFixed(1), icon: "rating" },
        { label: "Reviews", value: statistics.reviewsCount || 0, icon: "travelers" },
      ]
    : [
        { label: "Trips joined", value: statistics.totalTripsJoined ?? statistics.tripsJoined ?? 0, icon: "trips" },
        { label: "Trips completed", value: statistics.completedTrips ?? statistics.tripsCompleted ?? 0, icon: "completed" },
        { label: "Cancelled trips", value: statistics.cancelledTrips || 0, icon: "active" },
        { label: "No-show count", value: statistics.noShowCount || 0, icon: "pending" },
        { label: "Reliability score", value: `${statistics.reliabilityScore ?? 100}%`, icon: "rating" },
        { label: "Attendance", value: `${statistics.attendancePercentage ?? 100}%`, icon: "completed" },
        { label: "Countries visited", value: statistics.countriesVisited?.length || 0, icon: "active" },
        { label: "Travel points", value: statistics.travelPoints || 0, icon: "rating" },
      ];

  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} compact />)}</div>;
}
