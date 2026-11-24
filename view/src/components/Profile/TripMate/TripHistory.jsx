import { FiMapPin, FiCheckCircle } from "react-icons/fi";
import SectionHeader from "../Common/SectionHeader";
import EmptyState from "../Common/EmptyState";

export default function TripHistory({ trips = [] }) {
  return <section><SectionHeader title="My travel timeline" eyebrow="The journey so far" /><div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-6">{trips.length ? <ol className="space-y-0">{trips.map((trip, index) => <li key={trip.id} className="relative flex gap-4 pb-6 last:pb-0"><div className="relative flex flex-col items-center"><span className="z-10 grid h-9 w-9 place-items-center rounded-full bg-[#f1f8f7] text-[#00796B]"><FiCheckCircle size={17} /></span>{index < trips.length - 1 && <span className="absolute top-9 h-full w-px bg-[#f1f8f7]" />}</div><div className="min-w-0 flex-1 pt-1"><p className="text-xs font-semibold text-[#00796B]">{trip.date}</p><h3 className="mt-1 font-bold text-slate-900">{trip.title}</h3><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><FiMapPin size={14} />{trip.destination}</p></div><img src={trip.image} alt="" className="hidden h-16 w-20 rounded-xl object-cover sm:block" loading="lazy" /></li>)}</ol> : <EmptyState title="A new chapter awaits" description="Your finished trips will appear on this timeline." />}</div></section>;
}
