import SectionHeader from "../Common/SectionHeader";
import TripCollection from "../Common/TripCollection";

export default function JoinedTrips({ trips = [] }) {
  return <section><SectionHeader title="Trips I'm part of" eyebrow="Joined trips" description="The adventures and people you have found along the way." /><TripCollection trips={trips} emptyTitle="No joined trips yet" emptyDescription="When you join a trip, it will show up here." /></section>;
}
