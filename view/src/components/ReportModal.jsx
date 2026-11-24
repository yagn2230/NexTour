import { useState } from "react";
import { FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { reportService } from "../services/reportService";

export default function ReportModal({ targetType, targetId, targetLabel, contextTripId, onClose, onSubmitted }) {
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (sending || reason.trim().length < 3) return;
    setSending(true);
    try {
      const response = await reportService.submit(targetType, targetId, reason.trim(), contextTripId);
      toast.success(response.message || "Report submitted.");
      onSubmitted?.();
      onClose();
    } catch (error) {
      toast.error(error.message || "Unable to submit this report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !sending) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="report-modal-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">Safety & moderation</p><h2 id="report-modal-title" className="mt-1 text-xl font-black text-gray-900">Report {targetLabel}</h2><p className="mt-2 text-sm leading-6 text-gray-500">{contextTripId && targetType === "Trip" ? "Tell the NexTour team why this trip and its organizer should be reviewed." : "Tell the NexTour team why this content should be reviewed."}</p></div>
          <button type="button" onClick={onClose} disabled={sending} aria-label="Close report dialog" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"><FiX /></button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-gray-700">Reason for reporting
            <textarea required minLength={3} maxLength={1000} rows={5} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10" placeholder="Describe the issue so the administrator can review it." />
            <span className="mt-1 block text-right text-xs font-normal text-gray-400">{reason.length}/1000</span>
          </label>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} disabled={sending} className="min-h-10 rounded-xl px-4 text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={sending || reason.trim().length < 3} className="min-h-10 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">{sending ? "Submitting…" : "Submit report"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
