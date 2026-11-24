import { useState } from "react";
import { FiX } from "react-icons/fi";
import { getTripImage, getTripValue } from "../../../utils/adminTrips";
import TripItineraryEditor from "./TripItineraryEditor";

const fields = [
  ["title", "Trip title", "text"],
  ["destination", "Destination", "text"],
  ["category", "Category", "text"],
  ["totalBudget", "Total budget", "number"],
  ["startDate", "Start date", "date"],
  ["endDate", "End date", "date"],
  ["maxMembers", "Maximum members", "number"],
];

export default function EditTripModal({ trip, onSave, onClose, busy }) {
  const [form, setForm] = useState(() => ({
    title: getTripValue(trip, ["title", "name"]),
    destination: getTripValue(trip, ["destination", "location"]),
    category: getTripValue(trip, ["category", "type"]),
    coverImage: {
      ...(trip?.coverImage && typeof trip.coverImage === "object" ? trip.coverImage : {}),
      url: getTripImage(trip),
      alt: trip?.coverImage?.alt || "Trip cover image",
    },
    totalBudget: getTripValue(trip, ["totalBudget", "budget", "price", "cost"], ""),
    maxMembers: getTripValue(trip, ["maxMembers", "totalSeats", "maxParticipants", "seats"], ""),
    startDate: String(getTripValue(trip, ["startDate", "start"], "")).slice(0, 10),
    endDate: String(getTripValue(trip, ["endDate", "end"], "")).slice(0, 10),
    description: trip?.description || "",
    itinerary: Array.isArray(trip?.itinerary) ? trip.itinerary.map((day) => ({
      ...day,
      activities: Array.isArray(day.activities) ? day.activities.map((activity) => ({ ...activity })) : [],
    })) : [],
  }));
  if (!trip) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/50 p-4 backdrop-blur-sm" role="presentation">
      <form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, totalBudget: Number(form.totalBudget), maxMembers: Number(form.maxMembers) }); }} className="mx-auto my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="edit-trip-title">
        <div className="flex items-start justify-between gap-4"><div><h2 id="edit-trip-title" className="text-xl font-black text-gray-900">Edit trip</h2><p className="mt-1 text-sm text-gray-500">Update the trip details.</p></div><button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close"><FiX /></button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {fields.map(([name, label, type]) => <label key={name} className="text-sm font-semibold text-gray-700">{label}<input type={type} min={type === "number" ? (name === "maxMembers" ? "1" : "0") : undefined} value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} required={["title", "destination", "totalBudget", "maxMembers"].includes(name)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10" /></label>)}
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Cover image URL<input type="url" value={form.coverImage.url} onChange={(event) => setForm((current) => ({ ...current, coverImage: { ...current.coverImage, url: event.target.value } }))} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10" /></label>
          {form.coverImage.url && <div className="sm:col-span-2"><img src={form.coverImage.url} alt={form.coverImage.alt || "Trip cover"} className="h-48 w-full rounded-xl border border-gray-200 object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} onLoad={(event) => { event.currentTarget.style.display = "block"; }} /><a href={form.coverImage.url} download className="mt-2 inline-flex min-h-10 items-center rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-[#00796B] hover:text-[#00796B]">Download image</a></div>}
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Description<textarea rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10" /></label>
          <TripItineraryEditor days={form.itinerary} onChange={(itinerary) => setForm((current) => ({ ...current, itinerary }))} />
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button><button type="submit" disabled={busy} className="rounded-xl bg-[#006f68] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#005c56] disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button></div>
      </form>
    </div>
  );
}
