import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheck, FiRefreshCw, FiSearch, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { adminService } from "../../services/adminService";

const PAGE_SIZE = 10;

export default function JoinRequests() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminService.getJoinRequests(status);
      if (!Array.isArray(response.data)) throw new Error("The server returned an unexpected join requests response.");
      setRequests(response.data);
      setPage(1);
    } catch (loadError) {
      setError(loadError.message || "Unable to load join requests.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    let active = true;
    adminService.getJoinRequests(status)
      .then((response) => {
        if (!Array.isArray(response.data)) throw new Error("The server returned an unexpected join requests response.");
        if (active) setRequests(response.data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load join requests.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [status]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((request) => [
      request.user?.fullName,
      request.user?.username,
      request.user?.email,
      request.trip?.title,
      request.trip?.destination,
      request.trip?.organizer?.fullName,
    ].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [requests, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRequests = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const respond = async (request, decision) => {
    if (busyId) return;
    const requestId = request.id || request._id;
    if (!requestId) {
      toast.error("This join request has no ID.");
      return;
    }
    const action = decision === "accept" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
    setBusyId(requestId);
    try {
      await adminService.respondToJoinRequest(requestId, decision);
      toast.success(`Join request ${decision === "accept" ? "approved" : "rejected"}.`);
      await loadRequests();
    } catch (actionError) {
      toast.error(actionError.message || "Unable to update this join request.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">Trip management</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-1px] text-gray-900">Join requests</h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">Review traveler requests across every trip. Approvals use the existing booking and payment workflow.</p>
        </div>
        <button type="button" onClick={loadRequests} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:border-[#00796B] hover:text-[#00796B] disabled:opacity-50"><FiRefreshCw className={loading ? "animate-spin" : ""} />Refresh</button>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row">
        <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-gray-200 px-3.5 focus-within:border-[#00796B]">
          <FiSearch className="shrink-0 text-gray-400" />
          <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search travelers, trips, or organizers" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <select value={status} onChange={(event) => { setLoading(true); setError(""); setPage(1); setStatus(event.target.value); }} aria-label="Filter by request status" className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Accepted">Accepted</option>
          <option value="Declined">Declined</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={loadRequests} className="font-bold underline">Try again</button></div>}
      {loading ? <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm font-semibold text-gray-500" role="status">Loading join requests…</div> : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {visibleRequests.length ? (
            <div className="divide-y divide-gray-100">
              {visibleRequests.map((request) => {
                const requestId = request.id || request._id;
                return (
                  <article key={requestId} className="grid gap-4 p-5 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-gray-900">{request.user?.fullName || "Unknown traveler"}</p>
                      <p className="mt-1 truncate text-sm text-gray-500">{request.user?.email || "No email provided"}</p>
                      <p className="mt-2 text-xs text-gray-400">Requested {formatDate(request.requestedAt)}</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-[#f8faf9] p-3">
                      <p className="truncate text-sm font-bold text-gray-800">{request.trip?.title || "Trip unavailable"}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{[request.trip?.destination, request.trip?.state, request.trip?.country].filter(Boolean).join(", ") || "Destination unavailable"}</p>
                      <p className="mt-1 text-xs text-gray-500">Organizer: {request.trip?.organizer?.fullName || "Unknown"}</p>
                      {request.message && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{request.message}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(request.status)}`}>{request.status}</span>
                      {request.status === "Pending" && (
                        <>
                          <button type="button" onClick={() => respond(request, "accept")} disabled={busyId === requestId} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50"><FiCheck />Approve</button>
                          <button type="button" onClick={() => respond(request, "reject")} disabled={busyId === requestId} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-sm font-bold text-white disabled:opacity-50"><FiX />Reject</button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <div className="px-6 py-16 text-center"><h2 className="font-bold text-gray-900">No join requests found</h2><p className="mt-1 text-sm text-gray-500">Try another status or search term.</p></div>}
        </div>
      )}

      {!loading && filtered.length > 0 && <div className="flex items-center justify-between text-sm text-gray-500"><span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} requests</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold disabled:opacity-40">Previous</button><span className="px-2 font-semibold text-gray-700">{page} / {pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold disabled:opacity-40">Next</button></div></div>}
    </section>
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Date unavailable";
}

function statusTone(value) {
  if (value === "Accepted") return "bg-emerald-50 text-emerald-700";
  if (value === "Pending") return "bg-amber-50 text-amber-700";
  if (value === "Declined") return "bg-red-50 text-red-700";
  return "bg-gray-100 text-gray-600";
}
