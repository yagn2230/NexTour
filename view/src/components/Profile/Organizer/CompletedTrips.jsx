import SectionHeader from "../Common/SectionHeader";
import TripCollection from "../Common/TripCollection";

export default function CompletedTrips({ trips = [] }) {
  return <section><SectionHeader title="Past trips" eyebrow="Completed" /><TripCollection trips={trips} organizer emptyTitle="Your next great trip is ahead" emptyDescription="Completed hosted trips will be saved here." /></section>;
}
