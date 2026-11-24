import { FiCheck, FiEdit2, FiEye, FiRotateCcw, FiStar, FiTrash2, FiX } from "react-icons/fi";
import { getTripStatus } from "../../../utils/adminTrips";

export default function TripActions({ trip, onView, onEdit, onApprove, onReject, onDelete, onRestore, onToggleFeatured, busy }) {
  const status = getTripStatus(trip);
  const buttonClass = "inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-2.5 text-xs font-semibold text-gray-700 transition hover:border-[#cfe1de] hover:text-[#00796B] disabled:cursor-wait disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} onClick={onView}><FiEye />View</button>
      <button type="button" className={buttonClass} onClick={onEdit}><FiEdit2 />Edit</button>
      {status === "pending" && <button type="button" className={buttonClass} onClick={onApprove} disabled={busy}><FiCheck />Approve</button>}
      {status === "approved" && <button type="button" className={buttonClass} onClick={onToggleFeatured} disabled={busy}><FiStar fill={trip.isFeatured ? "currentColor" : "none"} />{trip.isFeatured ? "Unfeature" : "Feature"}</button>}
      {status !== "rejected" && <button type="button" className={`${buttonClass} border-red-200 text-red-700 hover:border-red-300 hover:text-red-800`} onClick={onReject} disabled={busy}><FiX />Reject</button>}
      {status === "rejected" && <button type="button" className={buttonClass} onClick={onRestore} disabled={busy}><FiRotateCcw />Restore</button>}
      <button type="button" className={`${buttonClass} border-red-200 text-red-700 hover:border-red-300 hover:text-red-800`} onClick={onDelete} disabled={busy}><FiTrash2 />Delete</button>
    </div>
  );
}
