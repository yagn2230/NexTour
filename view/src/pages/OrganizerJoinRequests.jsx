import { useEffect, useState } from "react";
import { FiCalendar, FiCheck, FiMapPin, FiUsers, FiX } from "react-icons/fi";
import RupeeIcon from "../components/RupeeIcon";
import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatCard from "../components/Profile/Common/StatCard";
import { organizerService } from "../services/organizerService";
import { API_BASE_URL } from "../utils/api";
import { formatCurrency } from "../utils/formatters";

const imageUrl = (image) => {
  const url = typeof image === "string" ? image : image?.url;
  if (!url || /^(https?:|data:|blob:)/i.test(url)) return url || "";
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

const dateLabel = (value) => {
  if (!value) return "Date not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date not set"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const requestStatusClass = {
  Pending: "bg-amber-50 text-amber-800",
  Accepted: "bg-emerald-50 text-emerald-800",
  Declined: "bg-slate-100 text-slate-700",
  Rejected: "bg-slate-100 text-slate-700",
};

function PersonAvatar({ person, className = "h-12 w-12" }) {
  const name = person?.name || "Traveler";
  const src = imageUrl(person?.profileImage);
  return src
    ? <img src={src} alt="" className={`${className} shrink-0 rounded-full object-cover`} />
    : <span aria-hidden="true" className={`${className} grid shrink-0 place-items-center rounded-full bg-teal-50 font-bold text-teal-800`}>{name.slice(0, 1).toUpperCase()}</span>;
}

function RequestCard({ request, disabled, acceptDisabled, onDecision }) {
  const applicant = request.applicant || {};
  const location = [applicant.city, applicant.country].filter(Boolean).join(", ") || applicant.location;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <PersonAvatar person={applicant} className="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-900">{applicant.name || "Traveler"}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${requestStatusClass[request.status] || "bg-slate-100 text-slate-700"}`}>{request.status}</span>
          </div>
          {applicant.username && <p className="mt-1 text-xs text-slate-500">@{applicant.username.replace(/^@/, "")}</p>}
        </div>
        <time className="text-xs text-slate-500" dateTime={request.requestedAt || undefined}>{dateLabel(request.requestedAt)}</time>
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold text-slate-500">Email</dt><dd className="break-all text-slate-800">{applicant.email || "Not provided"}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">Phone</dt><dd className="text-slate-800">{applicant.phone || "Not provided"}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">City / country</dt><dd className="text-slate-800">{location || "Not provided"}</dd></div>
      </dl>
      {(applicant.username || applicant.id) && <Link to={`/travelers/${applicant.username || applicant.id}`} className="mt-3 inline-flex text-xs font-bold text-teal-800 hover:underline">View profile</Link>}
      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Message</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.message || "No message included."}</p>
      </div>
      {request.status === "Pending" && (
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={disabled} onClick={() => onDecision(request, "reject")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><FiX />Reject</button>
          <button type="button" disabled={disabled || acceptDisabled} onClick={() => onDecision(request, "accept")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#006f68] px-4 text-sm font-bold text-white hover:bg-[#005c56] disabled:opacity-50"><FiCheck />Accept</button>
        </div>
      )}
    </article>
  );
}

function TripPriceEditor({ pricePerPerson, saving, onSave }) {
  const [priceDraft, setPriceDraft] = useState(pricePerPerson ?? "");
  const submit = (event) => {
    event.preventDefault();
    const price = Number(priceDraft);
    if (priceDraft === "" || !Number.isFinite(price) || price < 0) {
      onSave(null);
      return;
    }
    onSave(price);
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
      <label className="min-w-[180px] flex-1 text-xs font-bold text-slate-600">
        Price per person (INR)
        <input type="number" min="0" step="0.01" required value={priceDraft} onChange={(event) => setPriceDraft(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-800 outline-none focus:border-[#00796B]" />
      </label>
      <button type="submit" disabled={saving} className="h-10 rounded-xl border border-teal-700 px-4 text-sm font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-50">{saving ? "Saving…" : "Save price"}</button>
    </form>
  );
}

export default function OrganizerJoinRequests() {
  const location = useLocation();
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [confirmation, setConfirmation] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([organizerService.getTrips(), organizerService.getDashboardStats()])
      .then(([tripResponse, statsResponse]) => {
        if (!active) return;
        const tripList = tripResponse.data || [];
        setTrips(tripList);
        setStats(statsResponse.data || null);
        const requestedTripId = new URLSearchParams(location.search).get("tripId");
        setSelectedTripId((current) => (
          tripList.some((trip) => trip._id === requestedTripId)
            ? requestedTripId
            : tripList.some((trip) => trip._id === current)
            ? current
            : tripList[0]?._id || ""
        ));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load organizer data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [location.search, refreshVersion]);

  useEffect(() => {
    if (!selectedTripId) {
      return undefined;
    }
    let active = true;
    organizerService.getTripRequests(selectedTripId)
      .then((response) => {
        if (active) setDetail(response.data || null);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load join requests.");
      })
    return () => { active = false; };
  }, [selectedTripId, refreshVersion]);

  const visibleDetail = detail?.trip?.id === selectedTripId ? detail : null;
  const detailLoading = Boolean(selectedTripId && !visibleDetail && !error);
  const confirmedApplicant = confirmation?.request?.applicant?.name || "this traveler";

  const submitDecision = async () => {
    if (!confirmation) return;
    setProcessing(true);
    setError("");
    try {
      if (confirmation.decision === "accept") {
        await organizerService.acceptRequest(confirmation.request.id);
      } else {
        await organizerService.rejectRequest(confirmation.request.id);
      }
      setConfirmation(null);
      setLoading(true);
      setError("");
      setRefreshVersion((version) => version + 1);
    } catch (decisionError) {
      setError(decisionError.message || "Unable to update this join request.");
    } finally {
      setProcessing(false);
    }
  };

  const savePrice = async (price) => {
    if (price === null) {
      setError("Enter a valid non-negative price per person.");
      return;
    }
    setSavingPrice(true);
    setError("");
    try {
      await organizerService.updateTripPrice(selectedTripId, price);
      setLoading(true);
      setError("");
      setRefreshVersion((version) => version + 1);
    } catch (saveError) {
      setError(saveError.message || "Unable to save the per-person price.");
    } finally {
      setSavingPrice(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-7 px-5 py-9 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00796B]">Organizer tools</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">Join request management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review traveler details, manage your trip capacity, and track estimated revenue from accepted Trip Mates.</p>
          </div>
          <Link to="/organizer/dashboard" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-[#00796B] hover:text-[#00796B]">Back to dashboard</Link>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {loading && <p role="status" className="py-12 text-center text-sm font-semibold text-slate-500">Loading organizer dashboard…</p>}
        {!loading && !error && !trips.length && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-bold text-slate-900">No trips to manage yet</h2>
            <p className="mt-2 text-sm text-slate-600">Once you create a trip, join requests and traveler information will appear here.</p>
            <Link to="/create-trip" className="mt-5 inline-flex rounded-xl bg-[#006f68] px-5 py-3 text-sm font-bold text-white hover:bg-[#005c56]">Create a trip</Link>
          </div>
        )}

        {!loading && trips.length > 0 && (
          <>
            <section aria-label="Organizer statistics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total trips" value={stats?.totalTrips ?? 0} icon="trips" compact />
              <StatCard label="Accepted members" value={stats?.totalMembers ?? 0} icon="travelers" compact />
              <StatCard label="Pending requests" value={stats?.pending ?? 0} icon="pending" compact />
              <StatCard label="Accepted requests" value={stats?.accepted ?? 0} icon="completed" compact />
              <StatCard label="Rejected requests" value={stats?.rejected ?? 0} icon="active" compact />
              <StatCard label="Upcoming trips" value={stats?.upcomingTrips ?? 0} icon="trips" compact />
              <StatCard label="Completed trips" value={stats?.completedTrips ?? 0} icon="completed" compact />
              <article className="rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-teal-50 p-4 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-500"><RupeeIcon className="text-teal-700" />Estimated revenue</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(Number(stats?.totalRevenue || 0))}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Accepted Trip Mates × price per person. This is an estimate, not payment tracking.</p>
              </article>
              <StatCard label="Pending payments" value={stats?.pendingPayments ?? 0} icon="pending" compact />
              <article className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-500"><RupeeIcon className="text-emerald-700" />Payments marked paid</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(Number(stats?.collectedRevenue || 0))}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Demo payments are simulated; cash totals require organizer confirmation.</p>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <label className="block max-w-xl text-sm font-bold text-slate-700">
                Select a trip
                <select value={selectedTripId} onChange={(event) => { setError(""); setSelectedTripId(event.target.value); }} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-[#00796B]">
                  {trips.map((trip) => <option key={trip._id} value={trip._id}>{trip.title} · {trip.city || trip.destination}</option>)}
                </select>
              </label>
            </section>

            {detailLoading && <p role="status" className="py-8 text-center text-sm font-semibold text-slate-500">Loading trip requests…</p>}
            {!detailLoading && visibleDetail && (
              <>
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="grid md:grid-cols-[240px_1fr]">
                    {imageUrl(visibleDetail.trip.coverImage) && <img src={imageUrl(visibleDetail.trip.coverImage)} alt="" className="h-48 w-full object-cover md:h-full" />}
                    <div className="space-y-4 p-5 sm:p-6">
                      <div><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Trip overview</p><h2 className="mt-1 text-2xl font-black text-slate-900">{visibleDetail.trip.title}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><FiMapPin />{[visibleDetail.trip.city || visibleDetail.trip.destination, visibleDetail.trip.state, visibleDetail.trip.country].filter(Boolean).join(", ")}</p></div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <p className="flex items-center gap-2 text-sm text-slate-700"><FiCalendar />{dateLabel(visibleDetail.trip.startDate)} – {dateLabel(visibleDetail.trip.endDate)}</p>
                        <p className="flex items-center gap-2 text-sm text-slate-700"><RupeeIcon />{visibleDetail.trip.pricePerPerson == null ? "Price not set" : `${formatCurrency(Number(visibleDetail.trip.pricePerPerson))} per person`}</p>
                        <p className="flex items-center gap-2 text-sm text-slate-700"><FiUsers />{visibleDetail.trip.acceptedMembers} accepted · {visibleDetail.trip.maxMembers} max</p>
                        <p className="text-sm font-bold text-teal-800">{visibleDetail.trip.remainingSeats} remaining seat{visibleDetail.trip.remainingSeats === 1 ? "" : "s"}</p>
                      </div>
                      {visibleDetail.trip.pricePerPerson == null && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Set a per-person price below to calculate revenue accurately. Existing trip budgets are not treated as per-person prices.</p>}
                      <TripPriceEditor key={`${selectedTripId}-${visibleDetail.trip.pricePerPerson ?? "unset"}`} pricePerPerson={visibleDetail.trip.pricePerPerson} saving={savingPrice} onSave={savePrice} />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div><h2 className="text-xl font-black text-slate-900">Join requests</h2><p className="mt-1 text-sm text-slate-600">{visibleDetail.counts.pending} pending · {visibleDetail.counts.accepted} accepted · {visibleDetail.counts.rejected} rejected</p></div>
                    <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800">Estimated trip revenue: {formatCurrency(visibleDetail.trip.totalRevenue)}</span>
                  </div>
                  {visibleDetail.requests.length
                    ? <div className="grid gap-4 lg:grid-cols-2">{visibleDetail.requests.map((request) => <RequestCard key={request.id} request={request} disabled={processing} acceptDisabled={visibleDetail.trip.remainingSeats === 0 || visibleDetail.trip.pricePerPerson == null} onDecision={(selectedRequest, decision) => setConfirmation({ request: selectedRequest, decision })} />)}</div>
                    : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No join requests have been submitted for this trip.</div>}
                </section>

                <section className="space-y-4">
                  <div><h2 className="text-xl font-black text-slate-900">Accepted members</h2><p className="mt-1 text-sm text-slate-600">{visibleDetail.acceptedMembers.length} Trip Mate{visibleDetail.acceptedMembers.length === 1 ? "" : "s"} joined. The organizer is not counted as an accepted member.</p></div>
                  {visibleDetail.acceptedMembers.length
                    ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleDetail.acceptedMembers.map((member) => <article key={member.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><PersonAvatar person={member} /><div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900">{member.name}</h3><p className="truncate text-xs text-slate-600">{member.email || member.phone || member.location || "Accepted member"}</p><p className="mt-1 text-xs text-slate-500">Joined {dateLabel(member.joinedAt)}</p></div></article>)}</div>
                    : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No travelers have been accepted yet.</div>}
                </section>
              </>
            )}
          </>
        )}
      </main>

      {confirmation && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !processing && setConfirmation(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="request-confirmation-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="request-confirmation-title" className="text-xl font-black text-slate-900">{confirmation.decision === "accept" ? "Accept join request?" : "Reject join request?"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{confirmation.decision === "accept" ? `Accept ${confirmedApplicant}? This will reserve one seat and update the trip member count.` : `Reject ${confirmedApplicant}'s request? They will be notified of the decision.`}</p>
            {confirmation.decision === "accept" && visibleDetail?.trip.remainingSeats === 1 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">This is the last available seat. Other pending requests will be closed if you accept.</p>}
            <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={processing} onClick={() => setConfirmation(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" disabled={processing} onClick={submitDecision} className="rounded-xl bg-[#006f68] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#005c56] disabled:opacity-50">{processing ? "Saving…" : confirmation.decision === "accept" ? "Confirm accept" : "Confirm reject"}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
