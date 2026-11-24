import { useEffect, useState } from "react";
import { FiMapPin, FiRefreshCw, FiStar } from "react-icons/fi";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../utils/api";
import { formatCurrency } from "../../utils/formatters";
import { tripService } from "../../services/tripService";

const getImageUrl = (image) => {
  const value = typeof image === "string" ? image : image?.url;
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("//")) return `${window.location.protocol}${value}`;
  return `${API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

const getDuration = (trip) => {
  if (!trip.startDate || !trip.endDate) return "Dates to be announced";
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Dates to be announced";
  const days = Math.ceil((end - start) / 86_400_000) + 1;
  return days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "Dates to be announced";
};

function RelatedTripCard({ trip }) {
  const image = getImageUrl(trip.coverImage);
  const destination = [trip.city, trip.state, trip.country]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(", ") || trip.destination || "Destination to be announced";
  const price = trip.pricePerPerson ?? trip.totalBudget;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/explore/${trip._id}`} aria-label={`View ${trip.title} details`} className="relative block h-44 bg-slate-100">
        {image ? (
          <img src={image} alt={trip.title || "Trip destination"} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-slate-500">No trip photo available</div>
        )}
        {trip.category && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-teal-800 backdrop-blur">{trip.category}</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-lg font-black text-slate-900">{trip.title || "Trip"}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><FiMapPin className="shrink-0 text-teal-700" />{destination}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
          <span>{getDuration(trip)}</span>
          <span className="inline-flex items-center gap-1"><FiStar className="text-amber-500" />{trip.rating > 0 ? `${Number(trip.rating).toFixed(1)} organizer rating` : "New organizer"}</span>
        </div>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{trip.description?.trim() || "Discover this trip with fellow travelers."}</p>
        <p className="mt-3 text-lg font-black text-slate-900">
          {price == null ? "Price not listed" : formatCurrency(Number(price))}
          {trip.pricePerPerson != null && <span className="ml-1 text-xs font-semibold text-slate-500">per person</span>}
        </p>
        <Link to={`/explore/${trip._id}`} className="mt-4 block rounded-xl bg-[#006f68] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#005c56]">
          View Details
        </Link>
      </div>
    </article>
  );
}

export default function RelatedTrips({ tripId }) {
  const [suggestions, setSuggestions] = useState({ tripId: null, mode: "related", trips: [], loading: true, error: "" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    tripService.getRelatedTrips(tripId)
      .then((response) => {
        if (!active) return;
        setSuggestions({
          tripId,
          mode: response.mode === "trending" ? "trending" : "related",
          trips: response.data || [],
          loading: false,
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setSuggestions({
          tripId,
          mode: "related",
          trips: [],
          loading: false,
          error: error.message || "Unable to load trip suggestions.",
        });
      });
    return () => { active = false; };
  }, [tripId, reloadKey]);

  const current = suggestions.tripId === tripId ? suggestions : { tripId, mode: "related", trips: [], loading: true, error: "" };
  const heading = current.mode === "trending" ? "Trending trips" : "Related trips";

  return (
    <section className="mt-10 border-t border-slate-200 pt-8" aria-labelledby="related-trips-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Keep exploring</p>
          <h2 id="related-trips-heading" className="mt-1 text-2xl font-black text-slate-900">{heading}</h2>
          <p className="mt-1 text-sm text-slate-500">Trips picked for their destinations, style, and budget.</p>
        </div>
      </div>
      {current.loading ? (
        <p role="status" className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-slate-500">Finding trips for you…</p>
      ) : current.error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
          <p role="alert" className="text-sm text-amber-900">{current.error}</p>
          <button
            type="button"
            onClick={() => {
              setSuggestions((currentSuggestions) => ({ ...currentSuggestions, loading: true, error: "" }));
              setReloadKey((key) => key + 1);
            }}
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-amber-900 hover:underline"
          >
            <FiRefreshCw />Try again
          </button>
        </div>
      ) : current.trips.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {current.trips.map((suggestedTrip) => <RelatedTripCard key={suggestedTrip._id} trip={suggestedTrip} />)}
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-600">There are no trips to recommend right now. Check back soon.</p>
      )}
    </section>
  );
}
