import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { FiArrowLeft, FiCheck, FiFileText, FiShield, FiTrash2, FiUploadCloud } from "react-icons/fi";
import Navbar from "../components/Navbar";
import { authService } from "../services/authService";
import { api } from "../utils/api";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const TRIP_TYPES = [
  "Adventure Trips",
  "Trekking and Hiking",
  "Weekend Getaways",
  "Road Trips",
  "Camping Trips",
  "Beach Trips",
  "Cultural and Historical Trips",
  "Religious Trips",
];

const EXPERIENCE_YEARS = [
  "No experience",
  "Less than 1 year",
  "1–2 years",
  "3–5 years",
  "More than 5 years",
];

const TRIP_DURATIONS = ["1–2 days", "3–5 days", "6–10 days", "More than 10 days"];
const GROUP_SIZES = ["1–5", "6–10", "11–20", "21+ group members", "Flexible"];
const IDENTITY_TYPES = [
  "Aadhaar Card",
  "Voter ID Card",
  "Driving Licence",
  "Passport",
  "PAN Card",
  "Other Government-Issued ID",
];

const INITIAL_FORM = {
  hasOrganizingExperience: "",
  experienceYears: "",
  tripsOrganized: "",
  experienceDescription: "",
  maximumGroupSize: "",
  tripTypes: [],
  preferredDestinations: "",
  preferredDuration: "",
  preferredGroupSize: "",
  motivation: "",
  strengths: "",
  unexpectedSituations: "",
  identityDocumentType: "",
  otherIdentityDocumentName: "",
  accurateInformation: false,
  followsGuidelines: false,
};

const formatFileSize = (bytes) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const readDocument = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve({
    name: file.name,
    mimeType: file.type,
    size: file.size,
    url: reader.result,
  });
  reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
  reader.readAsDataURL(file);
});

export default function OrganizerApplication() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [identityFile, setIdentityFile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;
    authService.getProfile()
      .then(({ user }) => {
        if (!active) return;
        const applicationStatus = user?.organizer?.status
          || (user?.organizerVerified ? "Approved" : "Not Applied");
        setStatus(applicationStatus);
      })
      .catch((error) => {
        if (active) {
          setStatus("error");
          toast.error(error.message || "Unable to check your organizer status.");
        }
      });
    return () => { active = false; };
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: "" }));
  };

  const toggleTripType = (tripType) => {
    setForm((current) => ({
      ...current,
      tripTypes: current.tripTypes.includes(tripType)
        ? current.tripTypes.filter((item) => item !== tripType)
        : [...current.tripTypes, tripType],
    }));
    if (errors.tripTypes) setErrors((current) => ({ ...current, tripTypes: "" }));
  };

  const updateIdentityFile = (event) => {
    const file = event.target.files?.[0] || null;
    setErrors((current) => ({ ...current, identityFile: "" }));
    if (!file) {
      setIdentityFile(null);
      return;
    }
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      setIdentityFile(null);
      setErrors((current) => ({ ...current, identityFile: "Upload a PDF, JPG, JPEG, or PNG file." }));
      event.target.value = "";
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setIdentityFile(null);
      setErrors((current) => ({ ...current, identityFile: "The identity document must be 5 MB or smaller." }));
      event.target.value = "";
      return;
    }
    setIdentityFile(file);
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.hasOrganizingExperience) nextErrors.hasOrganizingExperience = "Choose whether you have organized trips before.";
    if (form.hasOrganizingExperience === "Yes") {
      if (!form.experienceYears || form.experienceYears === "No experience") nextErrors.experienceYears = "Select your experience level.";
      if (form.tripsOrganized === "" || Number(form.tripsOrganized) < 1) nextErrors.tripsOrganized = "Enter at least 1 organized trip.";
      if (!form.experienceDescription.trim()) nextErrors.experienceDescription = "Describe your organizing experience.";
      if (form.maximumGroupSize === "" || Number(form.maximumGroupSize) < 1) nextErrors.maximumGroupSize = "Enter the maximum group size you can manage.";
    }
    if (!form.tripTypes.length) nextErrors.tripTypes = "Select at least one trip type.";
    if (!form.preferredDestinations.trim()) nextErrors.preferredDestinations = "Enter at least one preferred destination.";
    if (!form.preferredDuration) nextErrors.preferredDuration = "Choose a preferred trip duration.";
    if (!form.preferredGroupSize) nextErrors.preferredGroupSize = "Choose a preferred group size.";
    if (!form.motivation.trim()) nextErrors.motivation = "Tell us why you want to become an organizer.";
    if (!form.strengths.trim()) nextErrors.strengths = "Describe what makes you a good organizer.";
    if (!form.unexpectedSituations.trim()) nextErrors.unexpectedSituations = "Explain how you would handle unexpected situations.";
    if (identityFile && !form.identityDocumentType) nextErrors.identityDocumentType = "Choose the identity document type.";
    if (form.identityDocumentType === "Other Government-Issued ID" && !form.otherIdentityDocumentName.trim()) {
      nextErrors.otherIdentityDocumentName = "Enter the name of the other identity document.";
    }
    if (!form.accurateInformation) nextErrors.accurateInformation = "Confirm that your information is accurate.";
    if (!form.followsGuidelines) nextErrors.followsGuidelines = "Confirm that you agree to follow organizer guidelines.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      const documents = identityFile
        ? [{
          ...(await readDocument(identityFile)),
          documentType: form.identityDocumentType,
          otherDocumentName: form.identityDocumentType === "Other Government-Issued ID"
            ? form.otherIdentityDocumentName.trim()
            : "",
        }]
        : [];
      const payload = {
        experience: form.hasOrganizingExperience === "Yes"
          ? form.experienceDescription.trim()
          : "No previous trip-organizing experience.",
        reason: form.motivation.trim(),
        documents,
        organizerApplication: {
          ...form,
          tripsOrganized: form.tripsOrganized === "" ? 0 : Number(form.tripsOrganized),
          maximumGroupSize: form.maximumGroupSize === "" ? null : Number(form.maximumGroupSize),
          experienceDescription: form.experienceDescription.trim(),
          preferredDestinations: form.preferredDestinations.trim(),
          motivation: form.motivation.trim(),
          strengths: form.strengths.trim(),
          unexpectedSituations: form.unexpectedSituations.trim(),
          accurateInformation: true,
          followsGuidelines: true,
        },
      };
      const result = await api.post("/users/apply-organizer", payload);
      toast.success(result.message || "Organizer application submitted.");
      navigate("/profile?view=organizer", { replace: true });
    } catch (error) {
      toast.error(error.message || "Unable to submit your organizer application.");
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = status === "Not Applied" || status === "Rejected";

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/profile?view=organizer" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#00796B]">
          <FiArrowLeft /> Back to organizer profile
        </Link>
        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
          <header className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f1f8f7] text-[#00796B]"><FiShield size={22} /></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00796B]">Organizer verification</p>
                <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Become a Trip Organizer</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Tell NexTour about your experience, preferences, and commitment to leading safe, well-organized trips.</p>
              </div>
            </div>
          </header>

          {status === "loading" && <p className="px-5 py-10 text-center text-sm font-semibold text-slate-500" role="status">Checking application status…</p>}
          {status === "error" && <p className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">Unable to verify your account. Refresh and try again.</p>}
          {status === "Pending" && <div className="m-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><p className="font-bold">Organizer verification pending</p><p className="mt-1 text-sm">Our team is reviewing your application. You will be notified when a decision is made.</p></div>}
          {status === "Approved" && <div className="m-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><p className="font-bold">You are a verified organizer.</p><Link to="/create-trip" className="mt-2 inline-block text-sm font-bold underline">Create a trip</Link></div>}

          {showForm && (
            <form onSubmit={submit} noValidate className="divide-y divide-slate-100">
              <fieldset className="space-y-5 px-5 py-7 sm:px-8">
                <legend className="text-lg font-black text-slate-900">1. Organizing experience</legend>
                <div>
                  <p className="text-sm font-bold text-slate-700">Have you organized trips before? <span className="text-red-600">*</span></p>
                  <div className="mt-3 flex gap-3">
                    {["Yes", "No"].map((answer) => (
                      <label key={answer} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${form.hasOrganizingExperience === answer ? "border-[#00796B] bg-[#f1f8f7] text-[#00796B]" : "border-slate-200 text-slate-700"}`}>
                        <input type="radio" name="hasOrganizingExperience" value={answer} checked={form.hasOrganizingExperience === answer} onChange={(event) => {
                          updateField("hasOrganizingExperience", event.target.value);
                          if (event.target.value === "No") setForm((current) => ({ ...current, hasOrganizingExperience: "No", experienceYears: "No experience", tripsOrganized: "0", maximumGroupSize: "" }));
                        }} className="accent-[#00796B]" />
                        {answer}
                      </label>
                    ))}
                  </div>
                  {errors.hasOrganizingExperience && <p className="mt-2 text-xs font-semibold text-red-700">{errors.hasOrganizingExperience}</p>}
                </div>

                {form.hasOrganizingExperience === "Yes" && (
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Years of experience" error={errors.experienceYears} required>
                      <select value={form.experienceYears} onChange={(event) => updateField("experienceYears", event.target.value)} className={inputClass(errors.experienceYears)}>
                        <option value="">Select experience</option>
                        {EXPERIENCE_YEARS.filter((item) => item !== "No experience").map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </Field>
                    <Field label="Number of trips organized" error={errors.tripsOrganized} required>
                      <input type="number" min="1" step="1" value={form.tripsOrganized} onChange={(event) => updateField("tripsOrganized", event.target.value)} className={inputClass(errors.tripsOrganized)} placeholder="For example, 8" />
                    </Field>
                    <Field label="Maximum group size you can manage" error={errors.maximumGroupSize} required>
                      <input type="number" min="1" step="1" value={form.maximumGroupSize} onChange={(event) => updateField("maximumGroupSize", event.target.value)} className={inputClass(errors.maximumGroupSize)} placeholder="For example, 20" />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Describe your organizing experience" error={errors.experienceDescription} required>
                        <textarea rows={4} maxLength={2000} value={form.experienceDescription} onChange={(event) => updateField("experienceDescription", event.target.value)} className={`${inputClass(errors.experienceDescription)} resize-y`} placeholder="Share the types of trips you have organized and what responsibilities you handled." />
                      </Field>
                    </div>
                  </div>
                )}
              </fieldset>

              <fieldset className="space-y-5 px-5 py-7 sm:px-8">
                <legend className="text-lg font-black text-slate-900">2. Trip organizing preferences</legend>
                <div>
                  <p className="text-sm font-bold text-slate-700">Types of trips <span className="text-red-600">*</span></p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {TRIP_TYPES.map((tripType) => (
                      <label key={tripType} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition ${form.tripTypes.includes(tripType) ? "border-[#00796B] bg-[#f1f8f7] text-slate-800" : "border-slate-200 text-slate-600"}`}>
                        <input type="checkbox" checked={form.tripTypes.includes(tripType)} onChange={() => toggleTripType(tripType)} className="h-4 w-4 accent-[#00796B]" />
                        {tripType}
                      </label>
                    ))}
                  </div>
                  {errors.tripTypes && <p className="mt-2 text-xs font-semibold text-red-700">{errors.tripTypes}</p>}
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Preferred destinations" error={errors.preferredDestinations} required>
                    <input value={form.preferredDestinations} onChange={(event) => updateField("preferredDestinations", event.target.value)} className={inputClass(errors.preferredDestinations)} placeholder="For example, Rajasthan, Goa, Himachal Pradesh" />
                  </Field>
                  <Field label="Preferred trip duration" error={errors.preferredDuration} required>
                    <select value={form.preferredDuration} onChange={(event) => updateField("preferredDuration", event.target.value)} className={inputClass(errors.preferredDuration)}>
                      <option value="">Select duration</option>
                      {TRIP_DURATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </Field>
                  <Field label="Preferred group size" error={errors.preferredGroupSize} required>
                    <select value={form.preferredGroupSize} onChange={(event) => updateField("preferredGroupSize", event.target.value)} className={inputClass(errors.preferredGroupSize)}>
                      <option value="">Select group size</option>
                      {GROUP_SIZES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </Field>
                </div>
              </fieldset>

              <fieldset className="space-y-5 px-5 py-7 sm:px-8">
                <legend className="text-lg font-black text-slate-900">3. Motivation and responsibility</legend>
                <Field label="Why do you want to become a trip organizer?" error={errors.motivation} required>
                  <textarea rows={4} maxLength={2000} value={form.motivation} onChange={(event) => updateField("motivation", event.target.value)} className={`${inputClass(errors.motivation)} resize-y`} placeholder="Share what motivates you to organize memorable trips." />
                </Field>
                <Field label="What makes you a good trip organizer?" error={errors.strengths} required>
                  <textarea rows={4} maxLength={2000} value={form.strengths} onChange={(event) => updateField("strengths", event.target.value)} className={`${inputClass(errors.strengths)} resize-y`} placeholder="Describe the skills and qualities you would bring to the role." />
                </Field>
                <Field label="How will you handle unexpected situations during a trip?" error={errors.unexpectedSituations} required>
                  <textarea rows={4} maxLength={2000} value={form.unexpectedSituations} onChange={(event) => updateField("unexpectedSituations", event.target.value)} className={`${inputClass(errors.unexpectedSituations)} resize-y`} placeholder="Explain how you would communicate, adapt, and keep travelers safe." />
                </Field>
              </fieldset>

              <fieldset className="space-y-5 px-5 py-7 sm:px-8">
                <legend className="text-lg font-black text-slate-900">4. Supporting document — Identity proof <span className="text-sm font-medium text-slate-500">(optional)</span></legend>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Identity document type" error={errors.identityDocumentType}>
                      <select value={form.identityDocumentType} onChange={(event) => updateField("identityDocumentType", event.target.value)} className={inputClass(errors.identityDocumentType)}>
                        <option value="">Select document type</option>
                        {IDENTITY_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </Field>
                    {form.identityDocumentType === "Other Government-Issued ID" && (
                      <Field label="Other document name" error={errors.otherIdentityDocumentName}>
                        <input value={form.otherIdentityDocumentName} onChange={(event) => updateField("otherIdentityDocumentName", event.target.value)} className={inputClass(errors.otherIdentityDocumentName)} placeholder="Enter document name" />
                      </Field>
                    )}
                  </div>
                  <label className="mt-5 block">
                    <span className="text-sm font-bold text-slate-700">Upload identity document</span>
                    <span className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600 transition hover:border-[#00796B] hover:text-[#00796B]">
                      <FiUploadCloud size={20} />
                      <span>{identityFile ? "Choose a different file" : "Choose PDF, JPG, or PNG"}</span>
                    </span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={updateIdentityFile} className="sr-only" />
                  </label>
                  <p className="mt-2 text-xs text-slate-500">Maximum file size: 5 MB. Identity documents are sensitive and should be used only for verification.</p>
                  {errors.identityFile && <p className="mt-2 text-xs font-semibold text-red-700">{errors.identityFile}</p>}
                  {identityFile && (
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f1f8f7] text-[#00796B]"><FiFileText /></span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{identityFile.name}</p><p className="text-xs text-slate-500">{formatFileSize(identityFile.size)}</p></div>
                      <button type="button" onClick={() => setIdentityFile(null)} aria-label="Remove identity document" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"><FiTrash2 /></button>
                    </div>
                  )}
                </div>
              </fieldset>

              <fieldset className="space-y-4 px-5 py-7 sm:px-8">
                <legend className="text-lg font-black text-slate-900">5. Declaration</legend>
                <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                  <input type="checkbox" checked={form.accurateInformation} onChange={(event) => updateField("accurateInformation", event.target.checked)} className="mt-1 h-4 w-4 accent-[#00796B]" />
                  <span>I confirm that all information provided in this application is accurate. <span className="text-red-600">*</span></span>
                </label>
                {errors.accurateInformation && <p className="-mt-2 text-xs font-semibold text-red-700">{errors.accurateInformation}</p>}
                <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                  <input type="checkbox" checked={form.followsGuidelines} onChange={(event) => updateField("followsGuidelines", event.target.checked)} className="mt-1 h-4 w-4 accent-[#00796B]" />
                  <span>I agree to follow NexTour organizer guidelines and responsibilities. <span className="text-red-600">*</span></span>
                </label>
                {errors.followsGuidelines && <p className="-mt-2 text-xs font-semibold text-red-700">{errors.followsGuidelines}</p>}
              </fieldset>

              <div className="flex flex-col-reverse gap-3 px-5 py-6 sm:flex-row sm:justify-end sm:px-8">
                <Link to="/profile?view=organizer" className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</Link>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00796B] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,121,107,0.18)] hover:bg-[#006f68] disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? "Submitting…" : <><FiCheck />Submit application</>}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({ label, error, required = false, children }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label} {required && <span className="text-red-600">*</span>}
      <span className="mt-2 block font-normal">{children}</span>
      {error && <span className="mt-2 block text-xs font-semibold text-red-700">{error}</span>}
    </label>
  );
}

function inputClass(error) {
  return `mt-0 w-full rounded-xl border px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:ring-4 ${
    error
      ? "border-red-300 focus:border-red-500 focus:ring-red-50"
      : "border-slate-200 focus:border-[#00796B] focus:ring-[#f1f8f7]"
  }`;
}
