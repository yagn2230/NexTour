import SectionHeader from "../Common/SectionHeader";
import StatCard from "../Common/StatCard";
import { Link } from "react-router-dom";

export default function OrganizerDashboard({ stats = [] }) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader eyebrow="Organizer dashboard" title="Your hosting, at a glance" description="A quick look at the trips and travelers you’re bringing together." />
        <Link to="/create-trip" className="mb-5 rounded-xl bg-[#006f68] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#005c56]">Create a new trip</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} compact />)}</div>
    </section>
  );
}
