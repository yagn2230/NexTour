import { useEffect, useState } from "react";
import { FiDownload, FiRefreshCw, FiShield } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { adminService } from "../../services/adminService";

const dateLabel = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  : "Not available";

export default function NoShowAppeals() {
  const [status, setStatus] = useState("Pending");
  const [appeals, setAppeals] = useState([]);
  const [offenders, setOffenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([adminService.getNoShowAppeals(status), adminService.getNoShowOffenders()])
      .then(([appealResponse, offenderResponse]) => {
        if (!Array.isArray(appealResponse.data) || !Array.isArray(offenderResponse.data)) {
          throw new Error("The server returned an unexpected no-show review response.");
        }
        if (active) {
          setAppeals(appealResponse.data);
          setOffenders(offenderResponse.data);
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load no-show reviews.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [status, reloadKey]);

  const downloadEvidence = async (appeal) => {
    setBusyId(appeal._id);
    setError("");
    try {
      const blob = await adminService.downloadNoShowEvidence(appeal._id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `no-show-evidence-${appeal._id}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError.message || "Unable to download appeal evidence.");
    } finally {
      setBusyId("");
    }
  };

  const decide = async (appeal, decision) => {
    let reason = "";
    if (decision === "Rejected") {
      reason = window.prompt("Explain why this appeal is rejected:");
      if (!reason || reason.trim().length < 3) return;
    } else if (!window.confirm(`Approve the no-show appeal for ${appeal.traveler?.fullName || "this traveler"}? This will excuse the record and restore their no-show count.`)) {
      return;
    }
    setBusyId(appeal._id);
    setError("");
    try {
      const response = await adminService.decideNoShowAppeal(appeal._id, decision, reason);
      toast.success(response.message || `Appeal ${decision.toLowerCase()}.`);
      setReloadKey((key) => key + 1);
    } catch (decisionError) {
      setError(decisionError.message || "Unable to update this appeal.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full bg-amber-50 px-4 py-2 text-xs font-bold tracking-[0.15em] text-amber-800">Trust & safety</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-1px] text-gray-900">No-show reviews</h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">Review traveler evidence, decide appeals, and monitor frequent no-show accounts.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => { setLoading(true); setError(""); setReloadKey((key) => key + 1); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:border-[#00796B] hover:text-[#00796B] disabled:opacity-50"><FiRefreshCw className={loading ? "animate-spin" : ""} />Refresh</button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-black text-gray-900">Frequent no-show accounts</h2><p className="mt-1 text-sm text-gray-500">Three or more recorded no-shows trigger a 30-day restriction and admin review.</p></div>
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-800">{offenders.length} flagged</span>
        </div>
        {loading ? <p role="status" className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Loading review queue…</p> : offenders.length ? (
          <div className="mt-4 divide-y divide-gray-100">
            {offenders.map((offender) => (
              <article key={offender._id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-700"><FiShield /></span>
                <div className="min-w-0 flex-1"><p className="font-bold text-gray-900">{offender.fullName || offender.username || "Traveler"}</p><p className="text-xs text-gray-500">{offender.email}</p></div>
                <p className="text-sm font-bold text-red-800">{offender.noShowCount} no-shows</p>
                <p className="text-xs text-gray-500">{offender.noShowRestrictedUntil && new Date(offender.noShowRestrictedUntil) > new Date() ? `Restricted until ${dateLabel(offender.noShowRestrictedUntil)}` : "Restriction expired"}</p>
              </article>
            ))}
          </div>
        ) : <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No frequent no-show accounts.</p>}
      </section>

      <section className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-black text-gray-900">Traveler appeals</h2><p className="mt-1 text-sm text-gray-500">Evidence is private and available only to administrators.</p></div>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setLoading(true); setError(""); }} aria-label="Filter no-show appeals" className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
            <option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="">All appeals</option>
          </select>
        </header>
        {loading ? <p role="status" className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm font-semibold text-gray-500">Loading appeals…</p> : appeals.length ? appeals.map((appeal) => (
          <article key={appeal._id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-bold text-gray-900">{appeal.traveler?.fullName || "Traveler"} · {appeal.trip?.title || "Trip"}</h3><p className="mt-1 text-xs text-gray-500">{appeal.traveler?.email || "No email"} · submitted {dateLabel(appeal.createdAt)} · {appeal.traveler?.noShowCount || 0} current no-show(s)</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${appeal.status === "Pending" ? "bg-amber-50 text-amber-800" : appeal.status === "Approved" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{appeal.status}</span>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Traveler's explanation</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{appeal.reason}</p>{appeal.decisionReason && <p className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-600">Review note: {appeal.decisionReason}</p>}</div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Trip date: {dateLabel(appeal.trip?.startDate)} – {dateLabel(appeal.trip?.endDate)}</p>
              <div className="flex gap-2">
                <button type="button" disabled={busyId === appeal._id} onClick={() => downloadEvidence(appeal)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><FiDownload />{busyId === appeal._id ? "Loading…" : "Evidence"}</button>
                {appeal.status === "Pending" && <><button type="button" disabled={Boolean(busyId)} onClick={() => decide(appeal, "Rejected")} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-50">Reject</button><button type="button" disabled={Boolean(busyId)} onClick={() => decide(appeal, "Approved")} className="min-h-10 rounded-lg bg-teal-800 px-3 text-sm font-bold text-white disabled:opacity-50">{busyId === appeal._id ? "Saving…" : "Approve appeal"}</button></>}
              </div>
            </div>
          </article>
        )) : <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">No appeals in this status.</p>}
      </section>
    </section>
  );
}
