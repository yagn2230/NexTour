import { getTripId } from "../../../utils/adminTrips";
import TripRow from "./TripRow";

export default function TripTable({ trips, busyId, onView, onEdit, onApprove, onReject, onDelete, onRestore, onToggleFeatured }) {
  if (!trips.length) {
    return <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center"><h2 className="text-lg font-bold text-gray-900">No trips found</h2><p className="mt-1 text-sm text-gray-500">Try changing the search or filters.</p></div>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <table className="w-full min-w-[1050px] text-left">
        <thead className="bg-[#f8faf9] text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3.5 font-bold">Trip</th><th className="px-5 py-3.5 font-bold">Organizer</th><th className="px-5 py-3.5 font-bold">Budget</th><th className="px-5 py-3.5 font-bold">Start date</th><th className="px-5 py-3.5 font-bold">Status</th><th className="px-5 py-3.5 font-bold">Actions</th></tr></thead>
        <tbody>{trips.map((trip, index) => <TripRow key={getTripId(trip) || index} trip={trip} busy={busyId === getTripId(trip)} onView={() => onView(trip)} onEdit={() => onEdit(trip)} onApprove={() => onApprove(trip)} onReject={() => onReject(trip)} onDelete={() => onDelete(trip)} onRestore={() => onRestore(trip)} onToggleFeatured={() => onToggleFeatured(trip)} />)}</tbody>
      </table>
    </div>
  );
}
