import { useCallback, useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { getTripId, getTripStatus, getTripValue, getTripsFromResponse } from "../../utils/adminTrips";
import ApproveTripModal from "../../components/admin/trips/ApproveTripModal";
import DeleteTripModal from "../../components/admin/trips/DeleteTripModal";
import EditTripModal from "../../components/admin/trips/EditTripModal";
import RejectTripModal from "../../components/admin/trips/RejectTripModal";
import RestoreTripModal from "../../components/admin/trips/RestoreTripModal";
import TripDetailsModal from "../../components/admin/trips/TripDetailsModal";
import TripFilters from "../../components/admin/trips/TripFilters";
import TripSearch from "../../components/admin/trips/TripSearch";
import TripTable from "../../components/admin/trips/TripTable";

const tabs = [
  { value: "", label: "All trips" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function Trips() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStatus = tabs.some((tab) => tab.value === searchParams.get("status")) ? searchParams.get("status") || "" : "";
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const search = searchParams.get("search") || "";
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState({ status: "", country: "", category: "" });
  const [page, setPage] = useState(1);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pendingResponse, approvedResponse, rejectedResponse] = await Promise.all([
        adminService.getPendingTrips(),
        adminService.getApprovedTripsAdmin(),
        adminService.getRejectedTripsAdmin(),
      ]);
      const collections = [
        ["pending", pendingResponse],
        ["approved", approvedResponse],
        ["rejected", rejectedResponse],
      ];
      const normalized = collections.flatMap(([status, response]) => {
        const results = getTripsFromResponse(response);
        if (!results) throw new Error(`The server returned an unexpected ${status} trips response.`);
        return results.filter(Boolean).map((trip) => ({ ...trip, _adminStatus: status }));
      });
      setTrips(normalized);
    } catch (loadError) {
      setError(loadError.message || "Unable to load trips.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchTrips = async () => {
      setError("");
      try {
        const [pendingResponse, approvedResponse, rejectedResponse] = await Promise.all([
          adminService.getPendingTrips(),
          adminService.getApprovedTripsAdmin(),
          adminService.getRejectedTripsAdmin(),
        ]);
        const collections = [
          ["pending", pendingResponse],
          ["approved", approvedResponse],
          ["rejected", rejectedResponse],
        ];
        const normalized = collections.flatMap(([status, response]) => {
          const results = getTripsFromResponse(response);
          if (!results) throw new Error(`The server returned an unexpected ${status} trips response.`);
          return results.filter(Boolean).map((trip) => ({ ...trip, _adminStatus: status }));
        });
        if (active) setTrips(normalized);
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load trips.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchTrips();
    return () => { active = false; };
  }, []);

  const options = useMemo(() => ({
    countries: [...new Set(trips.map((trip) => getTripValue(trip, ["country"])).filter(Boolean))].sort(),
    categories: [...new Set(trips.map((trip) => getTripValue(trip, ["category", "type"])).filter(Boolean))].sort(),
  }), [trips]);

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase();
    return trips.filter((trip) => {
      const status = getTripStatus(trip, trip._adminStatus);
      const searchable = [
        getTripValue(trip, ["title", "name"]),
        getTripValue(trip, ["destination", "location", "city"]),
        getTripValue(trip, ["state"]),
        getTripValue(trip, ["country"]),
        getTripValue(trip, ["organizer.fullName", "organizer.name", "createdBy.name", "organizerName"]),
      ].join(" ").toLowerCase();
      return (!activeStatus || status === activeStatus)
        && (!filters.status || status === filters.status)
        && (!filters.country || getTripValue(trip, ["country"]) === filters.country)
        && (!filters.category || getTripValue(trip, ["category", "type"]) === filters.category)
        && (!query || searchable.includes(query));
    }).sort((first, second) => {
      if (sort === "title") return getTripValue(first, ["title", "name"]).localeCompare(getTripValue(second, ["title", "name"]));
      if (sort === "startDate") {
        return new Date(getTripValue(first, ["startDate"], 0)) - new Date(getTripValue(second, ["startDate"], 0));
      }
      const firstDate = new Date(getTripValue(first, ["createdAt", "createdDate"], 0)).getTime() || 0;
      const secondDate = new Date(getTripValue(second, ["createdAt", "createdDate"], 0)).getTime() || 0;
      return sort === "oldest" ? firstDate - secondDate : secondDate - firstDate;
    });
  }, [activeStatus, filters, search, sort, trips]);

  const pageCount = Math.max(1, Math.ceil(filteredTrips.length / 10));
  const visibleTrips = filteredTrips.slice((page - 1) * 10, page * 10);

  const performAction = async (action, trip, reason = "") => {
    const tripId = getTripId(trip);
    if (!tripId) {
      toast.error("Cannot update a trip without an ID.");
      return false;
    }
    setBusyId(tripId);
    try {
      if (action === "approve") await adminService.approveTrip(tripId);
      if (action === "reject") await adminService.rejectTrip(tripId, reason);
      if (action === "delete") await adminService.deleteTripAdmin(tripId);
      if (action === "restore") await adminService.restoreTrip(tripId);
      await loadTrips();
      return true;
    } catch (actionError) {
      if (!actionError.message) toast.error(`Unable to ${action} trip.`);
      return false;
    } finally {
      setBusyId(null);
      setConfirmation(null);
    }
  };

  const saveEdit = async (tripData) => {
    const tripId = getTripId(editingTrip);
    if (!tripId) {
      toast.error("Cannot edit a trip without an ID.");
      return;
    }
    setBusyId(tripId);
    try {
      await adminService.updateTripAdmin(tripId, tripData);
      setEditingTrip(null);
      await loadTrips();
    } catch (saveError) {
      if (!saveError.message) toast.error("Unable to update trip.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleFeatured = async (trip) => {
    const tripId = getTripId(trip);
    if (!tripId) {
      toast.error("Cannot feature a trip without an ID.");
      return;
    }
    const action = trip.isFeatured ? "remove this trip from featured listings" : "feature this trip publicly";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    setBusyId(tripId);
    try {
      await adminService.updateTripAdmin(tripId, { isFeatured: !trip.isFeatured });
      await loadTrips();
    } catch (actionError) {
      if (!actionError.message) toast.error("Unable to update featured trip status.");
    } finally {
      setBusyId(null);
    }
  };

  const activeConfirmation = confirmation?.trip;
  const isModalBusy = busyId !== null;

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">Administration</p><h1 className="mt-3 text-4xl font-black tracking-[-1px] text-gray-900">Trip management</h1><p className="mt-2 text-sm leading-7 text-gray-500">Review submissions and manage published trips.</p></div>
        <button type="button" onClick={loadTrips} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:-translate-y-[1px] hover:border-[#00796B] hover:text-[#00796B] disabled:opacity-50"><FiRefreshCw className={loading ? "animate-spin" : ""} />Refresh</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">{tabs.map((tab) => {
        const count = tab.value ? trips.filter((trip) => getTripStatus(trip, trip._adminStatus) === tab.value).length : trips.length;
        return <button key={tab.value || "all"} type="button" onClick={() => { const next = new URLSearchParams(searchParams); if (tab.value) next.set("status", tab.value); else next.delete("status"); setPage(1); setSearchParams(next); }} className={`rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-1 ${activeStatus === tab.value ? "border-[#cfe1de] bg-[#f1f8f7]" : "border-gray-100 bg-white hover:border-[#00796B]/30 hover:shadow-[0_12px_35px_rgba(0,111,104,0.10)]"}`}><p className="text-sm font-semibold text-gray-500">{tab.label}</p><p className="mt-1 text-2xl font-black text-gray-900">{count}</p></button>;
      })}</div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-[#f8faf9] p-4 md:flex-row"><TripSearch value={search} onChange={(value) => { const next = new URLSearchParams(searchParams); if (value) next.set("search", value); else next.delete("search"); setPage(1); setSearchParams(next); }} /><TripFilters filters={filters} options={options} onChange={(key, value) => { setPage(1); setFilters((current) => ({ ...current, [key]: value })); }} onReset={() => { setPage(1); setFilters({ status: "", country: "", category: "" }); }} /><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort trips" className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="startDate">Upcoming date</option></select></div>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={loadTrips} className="font-bold underline">Try again</button></div>}
      {loading ? <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm font-semibold text-gray-500" role="status">Loading trips…</div> : <TripTable trips={visibleTrips} busyId={busyId} onView={setSelectedTrip} onEdit={setEditingTrip} onApprove={(trip) => setConfirmation({ action: "approve", trip })} onReject={(trip) => setConfirmation({ action: "reject", trip })} onDelete={(trip) => setConfirmation({ action: "delete", trip })} onRestore={(trip) => setConfirmation({ action: "restore", trip })} onToggleFeatured={toggleFeatured} />}

      {!loading && filteredTrips.length > 0 && <div className="flex items-center justify-between text-sm text-gray-500"><span>Showing {Math.min((page - 1) * 10 + 1, filteredTrips.length)}–{Math.min(page * 10, filteredTrips.length)} of {filteredTrips.length} trips</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold disabled:opacity-40">Previous</button><span className="px-2 font-semibold text-gray-700">{page} / {pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold disabled:opacity-40">Next</button></div></div>}

      {selectedTrip && <TripDetailsModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />}
      <EditTripModal key={getTripId(editingTrip) || "none"} trip={editingTrip} onSave={saveEdit} onClose={() => { if (!isModalBusy) setEditingTrip(null); }} busy={isModalBusy} />
      {confirmation?.action === "approve" && <ApproveTripModal trip={activeConfirmation} onConfirm={() => performAction("approve", activeConfirmation)} onClose={() => setConfirmation(null)} busy={isModalBusy} />}
      {confirmation?.action === "reject" && <RejectTripModal key={getTripId(activeConfirmation)} trip={activeConfirmation} onConfirm={(reason) => performAction("reject", activeConfirmation, reason)} onClose={() => setConfirmation(null)} busy={isModalBusy} />}
      {confirmation?.action === "delete" && <DeleteTripModal trip={activeConfirmation} onConfirm={() => performAction("delete", activeConfirmation)} onClose={() => setConfirmation(null)} busy={isModalBusy} />}
      {confirmation?.action === "restore" && <RestoreTripModal trip={activeConfirmation} onConfirm={() => performAction("restore", activeConfirmation)} onClose={() => setConfirmation(null)} busy={isModalBusy} />}
    </section>
  );
}
