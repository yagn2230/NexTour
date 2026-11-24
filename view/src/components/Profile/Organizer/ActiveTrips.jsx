import SectionHeader from "../Common/SectionHeader";
import TripCollection from "../Common/TripCollection";

export default function ActiveTrips({ trips = [] }) {
  return <section><SectionHeader title="Currently welcoming travelers" eyebrow="Active trips" /><TripCollection trips={trips} organizer emptyTitle="No active trips right now" emptyDescription="Approved trips accepting travelers will appear here." /></section>;
}
