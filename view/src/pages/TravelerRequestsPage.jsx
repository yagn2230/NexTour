import { useEffect, useState } from "react";
import { FiCalendar, FiCheck, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { tripService } from "../services/tripService";
import { API_BASE_URL } from "../utils/api";

const requestStyle = {
  Pending: "bg-amber-100 text-amber-900",
  Accepted: "bg-emerald-100 text-emerald-800",
  Declined: "bg-rose-100 text-rose-800",
  Cancelled: "bg-slate-100 text-slate-600",
};

const dateLabel = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  : "Date not set";

const imageUrl = (image) => {
  const value = typeof image === "string" ? image : image?.url;
  if (!value || /^(https?:|data:|blob:)/i.test(value)) return value || "";
  return `${API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

export default function TravelerRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    tripService.getMyTripRequests()
      .then((response) => {
        if (active) setRequests(response.data || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load your join requests.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  const cancelRequest = async (request) => {
    if (!window.confirm(`Cancel your request to join ${request.trip.title}?`)) return;
    setProcessingId(request.id);
    setError("");
    try {
      await tripService.cancelTripRequest(request.tripId, request.id);
      setReloadKey((key) => key + 1);
    } catch (cancelError) {
      setError(cancelError.message || "Unable to cancel this request.");
    } finally {
      setProcessingId("");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-9 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Traveler workspace</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">My join requests</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Track organizer decisions and continue to your booking when accepted.</p>
          </div>
          <Link to="/bookings" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-700 hover:text-teal-800">My bookings</Link>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {loading ? (
          <p role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Loading join requests…</p>
        ) : requests.length ? (
          <section aria-label="My join request history" className="space-y-4">
            {requests.map((request) => (
              <article key={request.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[140px_minmax(0,1fr)] sm:p-5">
                {imageUrl(request.trip.coverImage)
                  ? <img src={imageUrl(request.trip.coverImage)} alt="" className="h-36 w-full rounded-xl object-cover sm:h-full" />
                  : <div aria-hidden="true" className="grid h-36 place-items-center rounded-xl bg-teal-50 text-3xl font-black text-teal-800 sm:h-full">{request.trip.title.slice(0, 1)}</div>}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{request.trip.destination}{request.trip.country ? `, ${request.trip.country}` : ""}</p>
                      <h2 className="mt-1 truncate text-lg font-black text-slate-900">{request.trip.title}</h2>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${requestStyle[request.status] || "bg-slate-100 text-slate-700"}`}>{request.status}</span>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><FiCalendar />{dateLabel(request.trip.startDate)} – {dateLabel(request.trip.endDate)}</p>
                  {request.trip.organizer?.fullName && <p className="mt-1 text-xs text-slate-500">Organizer: {request.trip.organizer.fullName}</p>}
                  {request.message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{request.message}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link to={`/explore/${request.tripId}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">View trip</Link>
                    {request.status === "Accepted" && <Link to="/bookings" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white hover:bg-teal-900"><FiCheck />View booking</Link>}
                    {request.status === "Pending" && <button type="button" disabled={processingId === request.id} onClick={() => cancelRequest(request)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><FiX />{processingId === request.id ? "Cancelling…" : "Cancel request"}</button>}
                    <span className="ml-auto text-xs text-slate-500">Requested {dateLabel(request.requestedAt)}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="font-bold text-slate-900">No join requests yet</h2>
            <p className="mt-2 text-sm text-slate-600">When you request to join a trip, its decision and status will appear here.</p>
            <Link to="/explore" className="mt-5 inline-flex rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-900">Browse trips</Link>
          </section>
        )}
      </main>
    </div>
  );
}
