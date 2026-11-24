import { useEffect, useState } from "react";
import { FiArrowLeft, FiCalendar, FiEdit2, FiMapPin, FiUsers } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { formatCurrency, formatDate } from "../../utils/formatters";
import TripItinerary from "../../components/admin/trips/TripItinerary";
import { getTripFromResponse, getTripImage, getTripLocation, getTripOrganizer, getTripStatus, getTripValue } from "../../utils/adminTrips";

export default function TripDetails() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadTrip = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await adminService.getTripAdmin(tripId);
        const result = getTripFromResponse(response);
        if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("The server returned an unexpected trip response.");
        if (active) setTrip(result);
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load trip details.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadTrip();
    return () => { active = false; };
  }, [tripId]);

  if (loading) return <div className="py-20 text-center text-sm font-semibold text-gray-500" role="status">Loading trip details…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert"><p>{error}</p><Link to="/admin/trips" className="mt-3 inline-flex font-bold underline">Back to trips</Link></div>;
  if (!trip) return null;
  const image = getTripImage(trip);
  const itinerary = Array.isArray(trip.itinerary) ? trip.itinerary : [];

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/admin/trips" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#00796B]"><FiArrowLeft />Back to trips</Link><Link to={`/admin/trips/${tripId}/edit`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#006f68] px-4 text-sm font-bold text-white hover:bg-[#005c56]"><FiEdit2 />Edit trip</Link></div>
      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        {image && <img src={image} alt="" className="h-64 w-full object-cover sm:h-80" />}
        <div className="space-y-6 p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#00796B]">{getTripValue(trip, ["category", "type"], "Trip")}</p><h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">{getTripValue(trip, ["title", "name"], "Untitled trip")}</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500"><FiMapPin />{getTripLocation(trip)}</p></div><span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-bold capitalize text-gray-700">{getTripStatus(trip)}</span></div>
          <div className="grid gap-5 border-y border-gray-100 py-5 sm:grid-cols-2 lg:grid-cols-4"><Detail icon={<FiUsers />} label="Organizer" value={getTripOrganizer(trip)} /><Detail icon={<FiUsers />} label="Budget" value={formatCurrency(Number(getTripValue(trip, ["totalBudget", "budget", "price", "cost"], 0)))} /><Detail icon={<FiCalendar />} label="Start" value={formatDate(getTripValue(trip, ["startDate", "start"]))} /><Detail icon={<FiCalendar />} label="End" value={formatDate(getTripValue(trip, ["endDate", "end"]))} /><Detail label="Seats" value={getTripValue(trip, ["maxMembers", "totalSeats", "maxParticipants", "seats"], "Not specified")} /><Detail label="Available seats" value={getTripValue(trip, ["availableSeats", "seatsAvailable"], "Not specified")} /><Detail label="Created" value={formatDate(trip.createdAt)} /></div>
          <section><h2 className="font-bold text-gray-900">Description</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{getTripValue(trip, ["description", "overview"], "No description provided.")}</p></section>
          {Array.isArray(trip.famousPlaces) && trip.famousPlaces.length > 0 && <section><h2 className="font-bold text-gray-900">Selected famous places</h2><ul className="mt-3 flex flex-wrap gap-2">{trip.famousPlaces.map((place) => <li key={place} className="rounded-full bg-[#f1f8f7] px-3 py-1.5 text-xs font-semibold text-[#006f68]">{place}</li>)}</ul></section>}
          <TripItinerary days={itinerary} />
        </div>
      </article>
    </section>
  );
}

function Detail({ icon, label, value }) {
  return <div><p className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">{icon}{label}</p><p className="mt-1 text-sm font-semibold text-gray-800">{value}</p></div>;
}
