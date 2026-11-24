import { FiCheck, FiX } from "react-icons/fi";
import { getTripValue } from "../../../utils/adminTrips";

export default function ApproveTripModal({ trip, onConfirm, onClose, busy }) {
  if (!trip) return null;
  return <ConfirmDialog title="Approve this trip?" description="It will be published in the approved trips list." trip={trip} onConfirm={onConfirm} onClose={onClose} busy={busy} confirmLabel="Approve trip" icon={<FiCheck />} />;
}

function ConfirmDialog({ title, description, trip, onConfirm, onClose, busy, confirmLabel, icon }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm" role="presentation">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="trip-action-title">
        <div className="flex items-start justify-between gap-4"><div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</span><h2 id="trip-action-title" className="mt-4 text-xl font-black text-gray-900">{title}</h2><p className="mt-2 text-sm leading-6 text-gray-500">{description}</p><p className="mt-3 rounded-xl bg-[#f8faf9] px-3 py-2 text-sm font-bold text-gray-700">{getTripValue(trip, ["title", "name"], "Untitled trip")}</p></div><button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700"><FiX /></button></div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button><button type="button" onClick={onConfirm} disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{busy ? "Working…" : confirmLabel}</button></div>
      </div>
    </div>
  );
}
