import { FiCalendar, FiMapPin, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function TripCard({ trip, organizer = false }) {
  return (
    <Link
      to={`/explore/${trip.id}`}
      aria-label={`View ${trip.title || "trip"} details`}
      className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#00796B]/30 hover:shadow-[0_12px_35px_rgba(0,111,104,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00796B]"
    >
      <article>
        <div className="relative h-44 overflow-hidden">
          {trip.image ? <img src={trip.image} alt={trip.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /> : <div className="h-full bg-gradient-to-br from-white via-[#f1f8f7] to-[#e6f2f0]" aria-hidden="true" />}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-700 backdrop-blur">{trip.status}</span>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-gray-900">{trip.title}</h3>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500"><FiMapPin size={14} className="text-[#00796B]" />{trip.destination}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500"><FiCalendar size={14} className="text-[#00796B]" />{trip.date}</p>
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs font-medium text-gray-500">
            <span className="flex items-center gap-1.5"><FiUsers size={14} />{trip.people} {organizer ? "travelers" : "travelers going"}</span>
            {organizer && <span className="font-semibold text-[#00796B]">Manage trip →</span>}
          </div>
        </div>
      </article>
    </Link>
  );
}
