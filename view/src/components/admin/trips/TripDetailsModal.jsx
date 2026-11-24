import { FiCalendar, FiMapPin, FiUsers, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import { formatCurrency, formatDate } from "../../../utils/formatters";
import TripItinerary from "./TripItinerary";
import { getTripId, getTripImage, getTripLocation, getTripOrganizer, getTripStatus, getTripValue } from "../../../utils/adminTrips";

export default function TripDetailsModal({ trip, onClose }) {
  if (!trip) return null;
  const image = getTripImage(trip);
  const itinerary = Array.isArray(trip.itinerary) ? trip.itinerary : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/55 p-4 backdrop-blur-sm" role="presentation">
      <article className="mx-auto my-4 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="trip-details-title">
        <div className="relative h-56 bg-gray-100 sm:h-72">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}<button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow" aria-label="Close trip details"><FiX /></button><span className="absolute bottom-4 left-5 rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-gray-700">{getTripStatus(trip)}</span></div>
        <div className="space-y-6 p-5 sm:p-8">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00796B]">{getTripValue(trip, ["category", "type"], "Trip")}</p><h2 id="trip-details-title" className="mt-1 text-3xl font-black text-gray-900">{getTripValue(trip, ["title", "name"], "Untitled trip")}</h2><p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500"><FiMapPin />{getTripLocation(trip)}</p></div>
          <div className="grid gap-4 border-y border-gray-100 py-5 sm:grid-cols-2 lg:grid-cols-4">
            <Detail icon={<FiUsers />} label="Organizer" value={getTripOrganizer(trip)} /><Detail icon={<FiUsers />} label="Budget" value={formatCurrency(Number(getTripValue(trip, ["totalBudget", "budget", "price", "cost"], 0)))} /><Detail icon={<FiCalendar />} label="Dates" value={`${formatDate(getTripValue(trip, ["startDate", "start"]))} - ${formatDate(getTripValue(trip, ["endDate", "end"]))}`} /><Detail label="Seats" value={getTripValue(trip, ["maxMembers", "totalSeats", "maxParticipants", "seats"], "Not specified")} />
          </div>
          <section><h3 className="font-bold text-gray-900">Description</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{getTripValue(trip, ["description", "overview"], "No description provided.")}</p></section>
          {Array.isArray(trip.famousPlaces) && trip.famousPlaces.length > 0 && <section><h3 className="font-bold text-gray-900">Selected famous places</h3><ul className="mt-3 flex flex-wrap gap-2">{trip.famousPlaces.map((place) => <li key={place} className="rounded-full bg-[#f1f8f7] px-3 py-1.5 text-xs font-semibold text-[#006f68]">{place}</li>)}</ul></section>}
          <TripItinerary days={itinerary} />
          <div className="flex justify-end border-t border-gray-100 pt-5"><Link to={`/admin/trips/${getTripId(trip)}`} className="rounded-xl bg-[#006f68] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#005c56]">Open full details</Link></div>
        </div>
      </article>
    </div>
  );
}

function Detail({ icon, label, value }) {
  return <div><p className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">{icon}{label}</p><p className="mt-1 text-sm font-semibold text-gray-800">{value}</p></div>;
}
