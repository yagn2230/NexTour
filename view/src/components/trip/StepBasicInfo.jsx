import ImageUploader from "./ImageUploader";
import DestinationPicker from "./DestinationPicker";
import { DEFAULT_TRIP_CATEGORIES } from "../../constants/tripCategories";

const fieldClass = "mt-1.5 h-[46px] w-full rounded-xl border border-gray-200 bg-[#f8faf9] px-4 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";

export default function StepBasicInfo({ form, update, updateDates, categories = DEFAULT_TRIP_CATEGORIES, categoryError = "" }) {
  const availableCategories = categories.includes(form.category)
    ? categories
    : [form.category, ...categories];
  const updateDestination = (changes) => {
    Object.entries(changes).forEach(([key, value]) => update(key, value));
  };

  return (
    <section aria-labelledby="basic-info-title">
      <StepHeading title="Trip basics" description="Give travelers the details they need to get excited." />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
          Trip title
          <input className={fieldClass} value={form.title} maxLength={150} onChange={(event) => update("title", event.target.value)} placeholder="e.g. A week in the Italian countryside" required />
        </label>
        <DestinationPicker form={form} update={updateDestination} />
        <label className="text-sm font-semibold text-gray-700">
          Trip category
          <select className={fieldClass} value={form.category} onChange={(event) => update("category", event.target.value)}>
            {availableCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
          {categoryError && <span role="status" className="mt-1 block text-xs font-normal text-amber-700">{categoryError}</span>}
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Start date
          <input type="date" className={fieldClass} value={form.startDate} onChange={(event) => updateDates("startDate", event.target.value)} required />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          End date
          <input type="date" className={fieldClass} value={form.endDate} min={form.startDate || undefined} onChange={(event) => updateDates("endDate", event.target.value)} required />
        </label>
        <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
          Description
          <textarea className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-[#f8faf9] px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition-all duration-200 focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10" rows={4} maxLength={3000} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="What makes this trip special?" />
          <span className="mt-1 block text-right text-xs text-gray-400">{form.description.length}/3000</span>
        </label>
        <div className="sm:col-span-2">
          <ImageUploader coverImage={form.coverImage} images={form.images} onCoverChange={(image) => update("coverImage", image)} onImagesChange={(images) => update("images", images)} />
        </div>
        <label className="flex items-center gap-3 rounded-xl bg-[#f1f8f7] p-4 text-sm text-gray-600 sm:col-span-2">
          <input type="checkbox" checked={form.isPublic} onChange={(event) => update("isPublic", event.target.checked)} className="h-4 w-4 accent-[#006f68]" />
          Make this trip visible to other travelers
        </label>
      </div>
    </section>
  );
}

export function StepHeading({ title, description }) {
  return (
    <div className="mb-6">
      <span className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">TRIP DETAILS</span>
      <h2 className="mt-3 text-2xl font-black tracking-[-0.5px] text-gray-900" id="basic-info-title">{title}</h2>
      <p className="mt-1 text-sm leading-7 text-gray-500">{description}</p>
    </div>
  );
}
