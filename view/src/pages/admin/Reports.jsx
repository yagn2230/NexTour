import { useCallback, useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiRefreshCw, FiSearch, FiShield } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { adminService } from "../../services/adminService";

const PAGE_SIZE = 8;

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("Open");
  const [targetType, setTargetType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminService.getReports(status, targetType);
      if (!Array.isArray(response.data)) throw new Error("The server returned an unexpected reports response.");
      setReports(response.data);
      setPage(1);
    } catch (loadError) {
      setError(loadError.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [status, targetType]);

  useEffect(() => {
    let active = true;
    adminService.getReports(status, targetType)
      .then((response) => {
        if (!Array.isArray(response.data)) throw new Error("The server returned an unexpected reports response.");
        if (active) setReports(response.data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load reports.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [status, targetType]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = !query ? reports : reports.filter((report) => [
      report.reason,
      report.reporter?.fullName,
      report.reporter?.email,
      report.target?.fullName,
      report.target?.email,
      report.target?.title,
      report.target?.destination,
      report.target?.comment,
      report.relatedOrganizer?.fullName,
      report.relatedOrganizer?.email,
    ].filter(Boolean).join(" ").toLowerCase().includes(query));
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [page, reports, search]);

  const filteredCount = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => !query || [
      report.reason,
      report.reporter?.fullName,
      report.reporter?.email,
      report.target?.fullName,
      report.target?.email,
      report.target?.title,
      report.target?.destination,
      report.target?.comment,
      report.relatedOrganizer?.fullName,
      report.relatedOrganizer?.email,
    ].filter(Boolean).join(" ").toLowerCase().includes(query)).length;
  }, [reports, search]);
  const pageCount = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  const act = async (report, action) => {
    const reportId = report._id;
    if (!reportId || busyId) return;
    const label = action === "dismiss" ? "dismiss this report" : action.replace("-", " ");
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    setBusyId(reportId);
    try {
      if (action === "dismiss") {
        await adminService.updateReport(reportId, "Dismissed", "Reviewed and dismissed by an administrator.");
        toast.success("Report dismissed.");
      } else {
        const response = await adminService.moderateReport(reportId, action);
        toast.success(response.message || "Moderation action completed.");
      }
      await loadReports();
    } catch (actionError) {
      if (!actionError.message) toast.error("Unable to apply this moderation action.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full bg-red-50 px-4 py-2 text-xs font-bold tracking-[0.15em] text-red-700">Safety center</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-1px] text-gray-900">Reports & moderation</h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">Review complaints submitted by travelers and take documented moderation actions.</p>
        </div>
        <button type="button" onClick={loadReports} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:border-[#00796B] hover:text-[#00796B] disabled:opacity-50"><FiRefreshCw className={loading ? "animate-spin" : ""} />Refresh</button>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 lg:flex-row">
        <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-gray-200 px-3.5 focus-within:border-[#00796B]"><FiSearch className="text-gray-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} type="search" placeholder="Search reports, reporters, or content" className="w-full bg-transparent text-sm outline-none" /></label>
        <select value={status} onChange={(event) => { setLoading(true); setError(""); setStatus(event.target.value); setPage(1); }} aria-label="Filter reports by status" className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"><option value="">All statuses</option><option value="Open">Open</option><option value="Resolved">Resolved</option><option value="Dismissed">Dismissed</option></select>
        <select value={targetType} onChange={(event) => { setLoading(true); setError(""); setTargetType(event.target.value); setPage(1); }} aria-label="Filter reports by target type" className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"><option value="">All content</option><option value="User">Users</option><option value="Trip">Trips</option><option value="Review">Reviews</option></select>
      </div>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={loadReports} className="font-bold underline">Try again</button></div>}
      {loading ? <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm font-semibold text-gray-500" role="status">Loading reports…</div> : (
        <div className="space-y-4">
          {visible.length ? visible.map((report) => (
            <article key={report._id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700"><FiAlertTriangle /></span>
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-900">{report.targetType} report · {targetLabel(report)}</h2>
                    <p className="mt-1 text-xs text-gray-500">Reported by {report.reporter?.fullName || "Unknown"} · {report.reporter?.email || "No email"} · {formatDate(report.createdAt)}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(report.status)}`}>{report.status}</span>
              </div>
              <div className="mt-4 rounded-xl bg-[#f8faf9] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Complaint</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{report.reason}</p>
                {report.targetType === "Review" && report.target?.comment && <p className="mt-3 border-t border-gray-200 pt-3 text-sm italic text-gray-600">“{report.target.comment}”</p>}
                {report.targetType === "Trip" && report.target?.destination && <p className="mt-2 text-xs text-gray-500">Destination: {report.target.destination}</p>}
                {report.relatedOrganizer && <p className="mt-2 text-xs text-gray-600">Organizer included: {report.relatedOrganizer.fullName || report.relatedOrganizer.email || "Organizer profile"}</p>}
                {report.resolution && <p className="mt-3 text-xs font-semibold text-emerald-700">Resolution: {report.resolution}</p>}
              </div>
              {report.status === "Open" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {report.targetType === "User" && <button type="button" onClick={() => act(report, "suspend-user")} disabled={busyId === report._id} className="min-h-10 rounded-lg bg-red-600 px-3.5 text-sm font-bold text-white disabled:opacity-50"><FiShield className="mr-1 inline" />Suspend account</button>}
                  {report.targetType === "Trip" && report.relatedOrganizer && <button type="button" onClick={() => act(report, "suspend-organizer")} disabled={busyId === report._id} className="min-h-10 rounded-lg bg-red-600 px-3.5 text-sm font-bold text-white disabled:opacity-50"><FiShield className="mr-1 inline" />Suspend organizer</button>}
                  {report.targetType === "Trip" && <button type="button" onClick={() => act(report, "hide-trip")} disabled={busyId === report._id} className="min-h-10 rounded-lg bg-red-600 px-3.5 text-sm font-bold text-white disabled:opacity-50"><FiShield className="mr-1 inline" />Hide trip</button>}
                  {report.targetType === "Review" && <button type="button" onClick={() => act(report, "delete-review")} disabled={busyId === report._id} className="min-h-10 rounded-lg bg-red-600 px-3.5 text-sm font-bold text-white disabled:opacity-50"><FiShield className="mr-1 inline" />Remove review</button>}
                  <button type="button" onClick={() => act(report, "dismiss")} disabled={busyId === report._id} className="min-h-10 rounded-lg border border-gray-200 px-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Dismiss report</button>
                </div>
              )}
            </article>
          )) : <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center"><h2 className="font-bold text-gray-900">No reports found</h2><p className="mt-1 text-sm text-gray-500">Reports submitted by users will appear here.</p></div>}
        </div>
      )}
      {!loading && filteredCount > 0 && <div className="flex items-center justify-between text-sm text-gray-500"><span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredCount)}–{Math.min(page * PAGE_SIZE, filteredCount)} of {filteredCount} reports</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold disabled:opacity-40">Previous</button><span className="px-2 font-semibold text-gray-700">{page} / {pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold disabled:opacity-40">Next</button></div></div>}
    </section>
  );
}

function targetLabel(report) {
  if (!report.target) return "Content no longer available";
  if (report.targetType === "User") return report.target.fullName || report.target.email || "User profile";
  if (report.targetType === "Trip") return report.target.title || report.target.destination || "Trip";
  return report.target.comment?.slice(0, 100) || `Review (${report.target.rating || "?"} stars)`;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Date unavailable";
}

function statusTone(value) {
  if (value === "Open") return "bg-amber-50 text-amber-700";
  if (value === "Resolved") return "bg-emerald-50 text-emerald-700";
  return "bg-gray-100 text-gray-600";
}
