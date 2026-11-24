import { useState } from "react";
import { FiX } from "react-icons/fi";
import { getTripValue } from "../../../utils/adminTrips";

export default function RejectTripModal({ trip, onConfirm, onClose, busy }) {
  const [reason, setReason] = useState("");
  if (!trip) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm" role="presentation">
      <form onSubmit={(event) => { event.preventDefault(); onConfirm(reason); }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="reject-trip-title">
        <div className="flex items-start justify-between gap-4"><div><h2 id="reject-trip-title" className="text-xl font-black text-gray-900">Reject this trip?</h2><p className="mt-2 text-sm leading-6 text-gray-500">The trip will be moved to the rejected list. You can optionally include a reason.</p><p className="mt-3 rounded-xl bg-[#f8faf9] px-3 py-2 text-sm font-bold text-gray-700">{getTripValue(trip, ["title", "name"], "Untitled trip")}</p></div><button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700"><FiX /></button></div>
        <label className="mt-4 block text-sm font-semibold text-gray-700">Reason (optional)<textarea rows="3" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10" /></label>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button><button type="submit" disabled={busy} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">{busy ? "Rejecting…" : "Reject trip"}</button></div>
      </form>
    </div>
  );
}
