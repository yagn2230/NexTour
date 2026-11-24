import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import SectionHeader from "../Common/SectionHeader";
import TripCollection from "../Common/TripCollection";

export default function UpcomingTrips({ trips = [] }) {
  return <section><SectionHeader title="Coming up next" eyebrow="Upcoming trips" action={<Link to="/explore" className="inline-flex items-center gap-1 text-sm font-bold text-[#00796B]">Explore trips <FiArrowRight /></Link>} /><TripCollection trips={trips} emptyTitle="No trips on the calendar yet" emptyDescription="Find a trip that feels like you and start planning your next story." /></section>;
}
