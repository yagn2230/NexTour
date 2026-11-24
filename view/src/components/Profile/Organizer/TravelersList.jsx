import { FiCheckCircle } from "react-icons/fi";
import SectionHeader from "../Common/SectionHeader";
import EmptyState from "../Common/EmptyState";

export default function TravelersList({ travelers = [] }) {
  return (
    <section id="organizer-members" className="scroll-mt-24">
      <SectionHeader title="Your travelers" eyebrow="Community" />
      {travelers.length ? <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white px-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        {travelers.map((traveler) => <div key={traveler.id} className="flex items-center gap-3 py-3"><img src={traveler.avatar} alt="" className="h-10 w-10 rounded-full object-cover" loading="lazy" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{traveler.name}</p><p className="truncate text-xs text-slate-500">{traveler.trip}</p></div><span className="hidden items-center gap-1 text-[11px] font-bold text-[#00796B] sm:flex"><FiCheckCircle />{traveler.status}</span></div>)}
      </div> : <EmptyState title="No travelers yet" description="Travelers joining your trips will show here." />}
    </section>
  );
}
