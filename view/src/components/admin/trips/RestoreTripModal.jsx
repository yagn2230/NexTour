import { FiRotateCcw, FiX } from "react-icons/fi";
import { getTripValue } from "../../../utils/adminTrips";

export default function RestoreTripModal({ trip, onConfirm, onClose, busy }) {
  if (!trip) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm" role="presentation">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="restore-trip-title">
        <div className="flex items-start justify-between gap-4"><div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1f8f7] text-[#00796B]"><FiRotateCcw /></span><h2 id="restore-trip-title" className="mt-4 text-xl font-black text-gray-900">Restore this trip?</h2><p className="mt-2 text-sm leading-6 text-gray-500">The rejected trip will be restored to the approved trips list.</p><p className="mt-3 rounded-xl bg-[#f8faf9] px-3 py-2 text-sm font-bold text-gray-700">{getTripValue(trip, ["title", "name"], "Untitled trip")}</p></div><button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700"><FiX /></button></div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button><button type="button" onClick={onConfirm} disabled={busy} className="rounded-xl bg-[#006f68] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#005c56] disabled:opacity-50">{busy ? "Restoring…" : "Restore trip"}</button></div>
      </div>
    </div>
  );
}
