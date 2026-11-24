import TripCard from "./TripCard";
import EmptyState from "./EmptyState";

export default function TripCollection({ trips = [], organizer = false, emptyTitle, emptyDescription }) {
  if (!trips.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{trips.map((trip) => <TripCard key={trip.id} trip={trip} organizer={organizer} />)}</div>;
}
