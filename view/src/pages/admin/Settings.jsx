import { useCallback, useEffect, useState } from "react";
import { FiMapPin, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { adminService } from "../../services/adminService";

const EMPTY_DESTINATION = { country: "", state: "", city: "", famousPlaces: "" };

async function fetchSettingsData() {
  const [settingsResponse, destinationsResponse] = await Promise.all([
    adminService.getSettings(),
    adminService.getDestinations(),
  ]);
  if (!settingsResponse.data || !Array.isArray(destinationsResponse.data)) {
    throw new Error("The server returned an unexpected settings response.");
  }
  return {
    settings: {
      termsAndConditions: settingsResponse.data.termsAndConditions || "",
      privacyPolicy: settingsResponse.data.privacyPolicy || "",
      contactEmail: settingsResponse.data.contactEmail || "",
      contactPhone: settingsResponse.data.contactPhone || "",
      supportUrl: settingsResponse.data.supportUrl || "",
      tripCategories: Array.isArray(settingsResponse.data.tripCategories) ? settingsResponse.data.tripCategories : [],
    },
    destinations: destinationsResponse.data,
  };
}

export default function Settings() {
  const [settings, setSettings] = useState({
    termsAndConditions: "",
    privacyPolicy: "",
    contactEmail: "",
    contactPhone: "",
    supportUrl: "",
    tripCategories: [],
  });
  const [destinations, setDestinations] = useState([]);
  const [destinationForm, setDestinationForm] = useState(EMPTY_DESTINATION);
  const [editingId, setEditingId] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingDestination, setSavingDestination] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchSettingsData();
      setSettings(data.settings);
      setDestinations(data.destinations);
    } catch (loadError) {
      setError(loadError.message || "Unable to load platform settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchSettingsData()
      .then(({ settings: loadedSettings, destinations: loadedDestinations }) => {
        if (active) {
          setSettings(loadedSettings);
          setDestinations(loadedDestinations);
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load platform settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  const saveSettings = async (event) => {
    event.preventDefault();
    setSavingSettings(true);
    setError("");
    try {
      const response = await adminService.updateSettings(settings);
      setSettings((current) => ({ ...current, ...response.data }));
      toast.success(response.message || "Platform settings saved.");
    } catch (saveError) {
      setError(saveError.message || "Unable to save platform settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const addCategory = () => {
    const category = newCategory.trim();
    if (!category) return;
    if (settings.tripCategories.some((item) => item.toLowerCase() === category.toLowerCase())) {
      toast.error("That trip category already exists.");
      return;
    }
    if (settings.tripCategories.length >= 50 || category.length > 50) {
      toast.error("Categories are limited to 50 items, with 50 characters each.");
      return;
    }
    updateSetting("tripCategories", [...settings.tripCategories, category]);
    setNewCategory("");
  };

  const removeCategory = (category) => {
    if (settings.tripCategories.length <= 1) {
      toast.error("At least one trip category must remain.");
      return;
    }
    updateSetting("tripCategories", settings.tripCategories.filter((item) => item !== category));
  };

  const saveDestination = async (event) => {
    event.preventDefault();
    setSavingDestination(true);
    setError("");
    const payload = {
      country: destinationForm.country.trim(),
      state: destinationForm.state.trim(),
      city: destinationForm.city.trim(),
      famousPlaces: destinationForm.famousPlaces.split(/\r?\n/).map((place) => place.trim()).filter(Boolean),
    };
    try {
      if (editingId) {
        await adminService.updateDestination(editingId, payload);
        toast.success("Destination updated.");
      } else {
        await adminService.createDestination(payload);
        toast.success("Destination added.");
      }
      setDestinationForm(EMPTY_DESTINATION);
      setEditingId("");
      const response = await adminService.getDestinations();
      setDestinations(response.data || []);
    } catch (saveError) {
      setError(saveError.message || "Unable to save this destination.");
    } finally {
      setSavingDestination(false);
    }
  };

  const editDestination = (destination) => {
    setEditingId(destination._id);
    setDestinationForm({
      country: destination.country || "",
      state: destination.state || "",
      city: destination.city || "",
      famousPlaces: Array.isArray(destination.famousPlaces) ? destination.famousPlaces.join("\n") : "",
    });
    document.getElementById("admin-destination-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deleteDestination = async (destination) => {
    if (!window.confirm(`Remove ${destination.city}, ${destination.country} from the managed destinations?`)) return;
    try {
      await adminService.deleteDestination(destination._id);
      setDestinations((current) => current.filter((item) => item._id !== destination._id));
      toast.success("Destination removed.");
    } catch (deleteError) {
      setError(deleteError.message || "Unable to remove this destination.");
    }
  };

  const inputClass = "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";
  if (loading) return <div className="rounded-2xl border border-gray-200 bg-white py-20 text-center text-sm font-semibold text-gray-500" role="status">Loading platform settings…</div>;

  return (
    <section className="mx-auto max-w-7xl space-y-7">
      <header>
        <p className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">Platform configuration</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-1px] text-gray-900">Platform settings</h1>
        <p className="mt-2 text-sm leading-7 text-gray-500">Manage destinations, trip categories, policy text, and public contact details.</p>
      </header>
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setError(""); loadSettings(); }} className="font-bold underline">Reload</button></div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black text-gray-900">Trip categories</h2><p className="mt-1 text-sm text-gray-500">These categories are available to trip organizers and search filters.</p></div><FiMapPin className="mt-1 text-[#00796B]" /></div>
          <div className="mt-4 flex gap-2">
            <input maxLength={50} value={newCategory} onChange={(event) => setNewCategory(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCategory(); } }} className={inputClass.replace("mt-1.5 ", "")} placeholder="Add a trip category" />
            <button type="button" onClick={addCategory} disabled={!newCategory.trim()} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[#006f68] px-4 text-sm font-bold text-white disabled:opacity-50"><FiPlus />Add</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {settings.tripCategories.map((category) => <span key={category} className="inline-flex items-center gap-2 rounded-full bg-[#f1f8f7] px-3 py-1.5 text-sm font-semibold text-[#006f68]">{category}<button type="button" onClick={() => removeCategory(category)} aria-label={`Remove ${category}`} className="rounded-full p-0.5 text-[#006f68] hover:bg-red-100 hover:text-red-700"><FiTrash2 size={13} /></button></span>)}
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-500">A category already used by an existing trip cannot be removed.</p>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
          <div><h2 className="text-lg font-black text-gray-900">Managed destinations</h2><p className="mt-1 text-sm text-gray-500">Saved destination entries and famous places.</p></div>
          <form id="admin-destination-form" onSubmit={saveDestination} className="mt-4 space-y-3 rounded-xl bg-[#f8faf9] p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold text-gray-600">Country<input required maxLength={100} value={destinationForm.country} onChange={(event) => setDestinationForm((current) => ({ ...current, country: event.target.value }))} className={inputClass} /></label>
              <label className="text-xs font-bold text-gray-600">State<input required maxLength={100} value={destinationForm.state} onChange={(event) => setDestinationForm((current) => ({ ...current, state: event.target.value }))} className={inputClass} /></label>
              <label className="text-xs font-bold text-gray-600">City<input required maxLength={100} value={destinationForm.city} onChange={(event) => setDestinationForm((current) => ({ ...current, city: event.target.value }))} className={inputClass} /></label>
            </div>
            <label className="block text-xs font-bold text-gray-600">Famous places <span className="font-normal text-gray-400">(one per line)</span><textarea rows={3} maxLength={10000} value={destinationForm.famousPlaces} onChange={(event) => setDestinationForm((current) => ({ ...current, famousPlaces: event.target.value }))} className={`${inputClass} resize-y`} /></label>
            <div className="flex justify-end gap-2">
              {editingId && <button type="button" onClick={() => { setEditingId(""); setDestinationForm(EMPTY_DESTINATION); }} className="min-h-10 rounded-xl px-3 text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel edit</button>}
              <button type="submit" disabled={savingDestination} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#006f68] px-4 text-sm font-bold text-white hover:bg-[#005c56] disabled:opacity-50"><FiSave />{savingDestination ? "Saving…" : editingId ? "Update destination" : "Add destination"}</button>
            </div>
          </form>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {destinations.map((destination) => <article key={destination._id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-gray-800">{destination.city}, {destination.state}</p><p className="mt-0.5 truncate text-xs text-gray-500">{destination.country} · {destination.famousPlaces?.length || 0} famous places</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => editDestination(destination)} className="rounded-lg px-2.5 py-2 text-xs font-bold text-[#00796B] hover:bg-[#f1f8f7]">Edit</button><button type="button" onClick={() => deleteDestination(destination)} aria-label={`Delete ${destination.city}`} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><FiTrash2 /></button></div></article>)}
            {!destinations.length && <p className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">No managed destination records yet.</p>}
          </div>
        </section>
      </div>

      <form onSubmit={saveSettings} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
        <div><h2 className="text-lg font-black text-gray-900">Policies & contact</h2><p className="mt-1 text-sm text-gray-500">Maintain the public terms, privacy policy, and customer-support details.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700">Contact email<input type="email" maxLength={254} value={settings.contactEmail} onChange={(event) => updateSetting("contactEmail", event.target.value)} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700">Contact phone<input maxLength={30} value={settings.contactPhone} onChange={(event) => updateSetting("contactPhone", event.target.value)} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Support URL<input type="url" maxLength={500} value={settings.supportUrl} onChange={(event) => updateSetting("supportUrl", event.target.value)} className={inputClass} placeholder="https://example.com/support" /></label>
          <label className="text-sm font-semibold text-gray-700">Terms & Conditions<textarea rows={8} maxLength={50000} value={settings.termsAndConditions} onChange={(event) => updateSetting("termsAndConditions", event.target.value)} className={`${inputClass} resize-y`} /></label>
          <label className="text-sm font-semibold text-gray-700">Privacy Policy<textarea rows={8} maxLength={50000} value={settings.privacyPolicy} onChange={(event) => updateSetting("privacyPolicy", event.target.value)} className={`${inputClass} resize-y`} /></label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="max-w-2xl text-xs leading-5 text-gray-500">Email provider credentials and server-level switches are intentionally managed through protected deployment environment variables, not editable from this dashboard.</p>
          <button type="submit" disabled={savingSettings} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#006f68] px-5 text-sm font-bold text-white hover:bg-[#005c56] disabled:opacity-50"><FiSave />{savingSettings ? "Saving…" : "Save settings"}</button>
        </div>
      </form>
    </section>
  );
}
