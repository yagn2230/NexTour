import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { adminService } from "../../services/adminService";
import TripItineraryEditor from "../../components/admin/trips/TripItineraryEditor";
import { getTripFromResponse, getTripImage, getTripValue } from "../../utils/adminTrips";

const fieldList = [
  ["title", "Trip title", "text", true],
  ["destination", "Destination", "text", true],
  ["category", "Category", "text", false],
  ["totalBudget", "Total budget", "number", true],
  ["pricePerPerson", "Price per person", "number", false],
  ["startDate", "Start date", "date", false],
  ["endDate", "End date", "date", false],
  ["maxMembers", "Maximum members", "number", true],
  ["status", "Trip status", "select", true],
];
const tripStatuses = ["Open", "Full", "Ongoing", "Completed", "Cancelled"];

const getForm = (trip) => ({
  title: getTripValue(trip, ["title", "name"]),
  destination: getTripValue(trip, ["destination", "location"]),
  category: getTripValue(trip, ["category", "type"]),
  coverImage: {
    ...(trip?.coverImage && typeof trip.coverImage === "object" ? trip.coverImage : {}),
    url: getTripImage(trip),
    alt: trip?.coverImage?.alt || "Trip cover image",
  },
  totalBudget: getTripValue(trip, ["totalBudget", "budget", "price", "cost"], ""),
  pricePerPerson: getTripValue(trip, ["pricePerPerson"], ""),
  maxMembers: getTripValue(trip, ["maxMembers", "totalSeats", "maxParticipants", "seats"], ""),
  startDate: String(getTripValue(trip, ["startDate", "start"], "")).slice(0, 10),
  endDate: String(getTripValue(trip, ["endDate", "end"], "")).slice(0, 10),
  description: trip?.description || "",
  status: trip?.status || "Open",
  isFeatured: Boolean(trip?.isFeatured),
  isPublic: trip?.isPublic !== false,
  itinerary: Array.isArray(trip?.itinerary) ? trip.itinerary.map((day) => ({
    ...day,
    activities: Array.isArray(day.activities) ? day.activities.map((activity) => ({ ...activity })) : [],
  })) : [],
});

export default function EditTrip() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadTrip = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await adminService.getTripAdmin(tripId);
        const result = getTripFromResponse(response);
        if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("The server returned an unexpected trip response.");
        if (active) {
          setTrip(result);
          setForm(getForm(result));
        }
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load trip details.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadTrip();
    return () => { active = false; };
  }, [tripId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await adminService.updateTripAdmin(tripId, {
        ...form,
        totalBudget: Number(form.totalBudget),
        ...(form.pricePerPerson !== "" ? { pricePerPerson: Number(form.pricePerPerson) } : {}),
        maxMembers: Number(form.maxMembers),
        status: form.status,
        isFeatured: form.isFeatured,
        isPublic: form.isPublic,
        coverImage: form.coverImage,
        itinerary: form.itinerary,
      });
      navigate(`/admin/trips/${tripId}`);
    } catch (saveError) {
      if (!saveError.message) toast.error("Unable to update trip.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-sm font-semibold text-gray-500" role="status">Loading trip…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert"><p>{error}</p><Link to="/admin/trips" className="mt-3 inline-flex font-bold underline">Back to trips</Link></div>;
  if (!trip || !form) return null;

  const inputClass = "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";
  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <Link to={`/admin/trips/${tripId}`} className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#00796B]"><FiArrowLeft />Back to trip details</Link>
      <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#00796B]">Trip management</p><h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">Edit trip</h1><p className="mt-1 text-sm text-gray-500">Update details for {getTripValue(trip, ["title", "name"], "this trip")}.</p></div>
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">{fieldList.map(([name, label, type, required]) => <label key={name} className="text-sm font-semibold text-gray-700">{label}{type === "select" ? <select required={required} value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} className={inputClass}>{tripStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select> : <input type={type} min={type === "number" ? (name === "maxMembers" ? "1" : "0") : undefined} required={required} value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} className={inputClass} />}</label>)}
          <label className="flex items-center gap-3 rounded-xl bg-[#f1f8f7] p-4 text-sm font-semibold text-gray-700 sm:col-span-2"><input type="checkbox" checked={form.isFeatured} disabled={trip.approvalStatus !== "Approved"} onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.checked }))} className="h-4 w-4 accent-[#006f68]" />Feature this approved trip</label>
          <label className="flex items-center gap-3 rounded-xl bg-[#f8faf9] p-4 text-sm font-semibold text-gray-700 sm:col-span-2"><input type="checkbox" checked={form.isPublic} onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))} className="h-4 w-4 accent-[#006f68]" />Show this trip in public listings</label>
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Cover image URL<input type="url" value={form.coverImage.url} onChange={(event) => setForm((current) => ({ ...current, coverImage: { ...current.coverImage, url: event.target.value } }))} className={inputClass} /></label>
          {form.coverImage.url && <div className="sm:col-span-2"><img src={form.coverImage.url} alt={form.coverImage.alt || "Trip cover"} className="h-56 w-full rounded-xl border border-gray-200 object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} onLoad={(event) => { event.currentTarget.style.display = "block"; }} /><a href={form.coverImage.url} download className="mt-2 inline-flex min-h-10 items-center rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-[#00796B] hover:text-[#00796B]">Download image</a></div>}
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Description<textarea rows="5" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} resize-y`} /></label>
          <TripItineraryEditor days={form.itinerary} onChange={(itinerary) => setForm((current) => ({ ...current, itinerary }))} />
        </div>
        <div className="mt-6 flex justify-end gap-2"><Link to={`/admin/trips/${tripId}`} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</Link><button type="submit" disabled={saving} className="rounded-xl bg-[#006f68] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#005c56] disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></div>
      </form>
    </section>
  );
}
