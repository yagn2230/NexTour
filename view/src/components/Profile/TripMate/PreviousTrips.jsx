import SectionHeader from "../Common/SectionHeader";
import TripCollection from "../Common/TripCollection";

export default function PreviousTrips({ trips = [] }) {
  return <section><SectionHeader title="Postcards from the past" eyebrow="Completed trips" /><TripCollection trips={trips} emptyTitle="Your travel story starts here" emptyDescription="Completed trips and memories will find a home here." /></section>;
}
