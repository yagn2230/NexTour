import { useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import SectionHeader from "../Common/SectionHeader";
import EmptyState from "../Common/EmptyState";

export default function TripRequests({ requests = [], onDecision }) {
  const [decisions, setDecisions] = useState({});
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState("");

  const decide = async (request, decision) => {
    if (!onDecision) return;
    setProcessing(request.id);
    setError("");
    try {
      await onDecision(request, decision);
      setDecisions((current) => ({ ...current, [request.id]: decision }));
    } catch (requestError) {
      setError(requestError.message || "Unable to update this request.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <section id="organizer-requests" className="scroll-mt-24">
      <SectionHeader title="Join requests" eyebrow="Needs your attention" />
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {requests.length ? <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white px-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        {requests.map((request) => <article key={request.id} className="flex flex-wrap items-center gap-3 py-4">
          <img src={request.avatar} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" />
          <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-slate-800">{request.name}</h3><p className="mt-0.5 truncate text-xs text-slate-500">For {request.trip}</p><p className="mt-1 text-xs text-slate-600">{request.email || "Email not provided"}{request.phone ? ` · ${request.phone}` : ""}</p><p className="mt-1 text-xs text-slate-600">{[request.city, request.country].filter(Boolean).join(", ") || request.location || "Location not provided"}</p><p className="mt-1 text-xs text-slate-600">{request.note || "No message included."}</p><p className="mt-1 text-[11px] text-slate-500">Requested {request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "date unavailable"}</p>{(request.user?._id || request.user?.id) && <Link to={`/travelers/${request.user.username || request.user._id || request.user.id}`} className="mt-2 inline-flex text-xs font-bold text-teal-800 hover:underline">View profile</Link>}</div>
          {decisions[request.id] ? <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${decisions[request.id] === "Accepted" ? "bg-[#f1f8f7] text-[#00796B]" : "bg-slate-100 text-slate-600"}`}>{decisions[request.id]}</span> : <div className="flex gap-2"><button type="button" disabled={processing === request.id} aria-label={`Accept ${request.name}`} onClick={() => decide(request, "Accepted")} className="grid h-9 w-9 place-items-center rounded-lg bg-[#f1f8f7] text-[#00796B] transition hover:bg-[#f1f8f7] disabled:opacity-50"><FiCheck /></button><button type="button" disabled={processing === request.id} aria-label={`Decline ${request.name}`} onClick={() => decide(request, "Declined")} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"><FiX /></button></div>}
        </article>)}
      </div> : <EmptyState title="All caught up" description="New requests from travelers will appear here." />}
    </section>
  );
}
