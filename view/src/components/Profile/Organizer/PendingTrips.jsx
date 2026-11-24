import SectionHeader from "../Common/SectionHeader";
import TripCollection from "../Common/TripCollection";

export default function PendingTrips({ trips = [] }) {
  return <section><SectionHeader title="Waiting for review" eyebrow="Pending approval" description="You’ll see an update here when our team reviews a trip." /><TripCollection trips={trips} organizer emptyTitle="Nothing waiting for approval" emptyDescription="New trip submissions will appear here." /></section>;
}
