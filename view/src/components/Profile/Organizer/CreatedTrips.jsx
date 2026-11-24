import SectionHeader from "../Common/SectionHeader";
import TripCollection from "../Common/TripCollection";

export default function CreatedTrips({ trips = [] }) {
  return <section id="organizer-trips" className="scroll-mt-24"><SectionHeader title="Trips I've created" eyebrow="Your trips" description="Build trips with care and bring good people together." /><TripCollection trips={trips} organizer emptyTitle="No trips created yet" emptyDescription="Your published and planned trips will be shown here." /></section>;
}
