import { FiMapPin, FiArrowUpRight } from "react-icons/fi";
import SectionHeader from "../Common/SectionHeader";
import EmptyState from "../Common/EmptyState";

export default function FavoriteDestinations({ destinations = [] }) {
  return <section><SectionHeader title="Places close to my heart" eyebrow="Favorite destinations" /><div className="grid gap-3 sm:grid-cols-3">{destinations.map((place) => <article key={place.name} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">{place.image ? <img src={place.image} alt={place.name} className="h-32 w-full object-cover" loading="lazy" /> : <div className="h-32 bg-gradient-to-br from-[#f1f8f7] via-[#f1f8f7] to-[#e6f2f0]" aria-hidden="true" />}<div className="flex items-center justify-between p-3"><div><h3 className="font-bold text-slate-800">{place.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><FiMapPin />{place.country || "Visited destination"}</p></div><span className="text-right text-xs font-semibold text-[#00796B]">{place.visits} {place.visits === 1 ? "visit" : "visits"} <FiArrowUpRight className="inline" /></span></div></article>)}</div>{!destinations.length && <EmptyState title="Favorites will show up here" description="Completed trips will add places to this list automatically." />}</section>;
}
