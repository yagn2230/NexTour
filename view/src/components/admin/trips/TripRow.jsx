import { formatCurrency, formatDate } from "../../../utils/formatters";
import { getTripImage, getTripLocation, getTripOrganizer, getTripStatus, getTripValue } from "../../../utils/adminTrips";
import TripActions from "./TripActions";

export default function TripRow({ trip, onView, onEdit, onApprove, onReject, onDelete, onRestore, onToggleFeatured, busy }) {
  const status = getTripStatus(trip);
  const image = getTripImage(trip);
  const badgeClass = status === "approved" ? "bg-emerald-50 text-emerald-700" : status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";

  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="px-5 py-4">
        <div className="flex min-w-64 items-center gap-3">
          {image ? <img src={image} alt="" className="h-12 w-14 shrink-0 rounded-xl object-cover" /> : <div className="h-12 w-14 shrink-0 rounded-xl bg-[#f1f8f7]" />}
          <div className="min-w-0"><button type="button" onClick={onView} className="block max-w-64 truncate text-left font-semibold text-gray-900 hover:text-[#00796B]">{getTripValue(trip, ["title", "name"], "Untitled trip")}</button><p className="mt-1 truncate text-xs text-gray-500">{getTripLocation(trip)}{trip.isFeatured ? " · Featured" : ""}</p></div>
        </div>
      </td>
      <td className="px-5 py-4 text-sm text-gray-700">{getTripOrganizer(trip)}</td>
      <td className="px-5 py-4 text-sm font-semibold text-gray-700">{formatCurrency(Number(getTripValue(trip, ["totalBudget", "budget", "price", "cost"], 0)))}</td>
      <td className="px-5 py-4 text-sm text-gray-600">{formatDate(getTripValue(trip, ["startDate", "start"]))}</td>
      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass}`}>{status}</span></td>
      <td className="px-5 py-4"><TripActions trip={trip} onView={onView} onEdit={onEdit} onApprove={onApprove} onReject={onReject} onDelete={onDelete} onRestore={onRestore} onToggleFeatured={onToggleFeatured} busy={busy} /></td>
    </tr>
  );
}
