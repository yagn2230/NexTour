import { useCallback, useEffect, useMemo, useState } from "react";
import { FiRefreshCw, FiSearch } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";

const PAGE_SIZE = 8;

export default function OrganizerRequests() {
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = tab === "pending"
        ? await adminService.getOrganizerRequests()
        : await adminService.getAllUsers("", "Organizer");
      setUsers(response.users || []);
      setPage(1);
    } catch (loadError) {
      setError(loadError.message || "Unable to load organizer requests.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    let active = true;
    const request = tab === "pending"
      ? adminService.getOrganizerRequests()
      : adminService.getAllUsers("", "Organizer");
    request
      .then((response) => {
        if (active) setUsers(response.users || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load organizer data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [tab]);

  const review = async (user, action) => {
    setBusyId(user._id);
    try {
      if (action === "approve") await adminService.approveOrganizer(user._id);
      else await adminService.rejectOrganizer(user._id);
      await loadRequests();
    } catch (actionError) {
      toast.error(actionError.message || "Unable to update this request.");
    } finally {
      setBusyId("");
    }
  };

  const manageOrganizer = async (user, action) => {
    setBusyId(user._id);
    try {
      if (action === "revoke") {
        if (!window.confirm(`Remove organizer privileges from ${user.fullName}?`)) return;
        await adminService.revokeOrganizer(user._id);
      } else {
        const nextStatus = user.isActive ? "suspend" : "activate";
        if (!window.confirm(`Are you sure you want to ${nextStatus} ${user.fullName}?`)) return;
        await adminService.toggleUserStatus(user._id, Boolean(user.isActive));
      }
      await loadRequests();
    } catch (actionError) {
      toast.error(actionError.message || "Unable to update organizer access.");
    } finally {
      setBusyId("");
    }
  };

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => !query || [user.fullName, user.email, user.username].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [search, users]);
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const visibleUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">Verification</p>
          <h1 className="mt-3 text-4xl font-black text-gray-900">Organizer Requests</h1>
          <p className="mt-2 text-sm text-gray-500">Review applicants before granting trip creation access.</p>
        </div>
        <button type="button" onClick={loadRequests} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 disabled:opacity-50">
          <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </header>
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2" role="tablist" aria-label="Organizer management sections">
          {[["pending", "Pending applications"], ["approved", "Approved organizers"]].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setLoading(true); setError(""); setPage(1); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === value ? "bg-[#f1f8f7] text-[#00796B]" : "text-gray-500 hover:bg-gray-50"}`}>{label}</button>)}
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-3.5 focus-within:border-[#00796B]"><FiSearch className="text-gray-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} type="search" placeholder="Search organizers" className="w-full bg-transparent text-sm outline-none sm:w-64" /></label>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {loading && <p role="status">Loading organizer requests...</p>}
      {!loading && !error && visibleUsers.length === 0 && <p className="rounded-2xl bg-white p-8 text-gray-500">{search ? "No organizers match your search." : tab === "pending" ? "There are no pending organizer requests." : "There are no approved organizers yet."}</p>}
      <div className="grid gap-5">
        {visibleUsers.map((user) => (
          <article key={user._id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>
                <p className="mt-1 text-sm text-gray-500">{user.email}</p>
                <p className="mt-1 text-xs text-gray-400">Applied {user.organizer?.appliedAt ? new Date(user.organizer.appliedAt).toLocaleDateString() : "recently"}</p>
              </div>
              {tab === "pending" ? <div className="flex gap-2">
                <button type="button" disabled={busyId === user._id} onClick={() => review(user, "approve")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Approve</button>
                <button type="button" disabled={busyId === user._id} onClick={() => review(user, "reject")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Reject</button>
              </div> : <div className="flex flex-wrap gap-2">
                <Link to={`/admin/users/${user._id}`} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-[#00796B] hover:text-[#00796B]">View profile & trips</Link>
                <button type="button" disabled={busyId === user._id} onClick={() => manageOrganizer(user, "status")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-50">{user.isActive ? "Suspend" : "Activate"}</button>
                <button type="button" disabled={busyId === user._id} onClick={() => manageOrganizer(user, "revoke")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Remove privileges</button>
              </div>}
            </div>
            {tab === "pending" && <div className="mt-5 grid gap-4 border-t border-gray-100 pt-5 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Experience</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{user.organizer?.experience || "Not provided."}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Reason for applying</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{user.organizer?.reason || "Not provided."}</p>
              </div>
            </div>}
            {tab === "pending" && <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-800">Documents</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {user.organizer?.documents?.length ? user.organizer.documents.map((document, index) => (
                  <a key={`${user._id}-${index}`} href={document.url} target="_blank" rel="noreferrer" className="rounded-lg bg-[#f1f8f7] px-3 py-2 text-sm font-semibold text-[#00796B] hover:underline">{document.name}</a>
                )) : <p className="text-sm text-gray-500">No documents supplied.</p>}
              </div>
            </div>}
            {tab === "approved" && <p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">Status: {user.isActive ? "Active" : "Suspended"} · Organizer access approved {user.organizer?.verifiedAt ? new Date(user.organizer.verifiedAt).toLocaleDateString() : "previously"}</p>}
          </article>
        ))}
      </div>
      {!loading && filteredUsers.length > 0 && <div className="flex items-center justify-between text-sm text-gray-500"><span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredUsers.length)}–{Math.min(page * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} organizers</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold disabled:opacity-40">Previous</button><span className="px-2 font-semibold text-gray-700">{page} / {pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold disabled:opacity-40">Next</button></div></div>}
    </section>
  );
}
