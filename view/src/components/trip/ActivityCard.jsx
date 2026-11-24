import { FiTrash2 } from "react-icons/fi";
import { DEFAULT_TRIP_CATEGORIES } from "../../constants/tripCategories";
const inputClass = "mt-1.5 h-[42px] w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";

export default function ActivityCard({ activity, onChange, onRemove, categories = DEFAULT_TRIP_CATEGORIES }) {
  const availableCategories = categories.includes(activity.category)
    ? categories
    : [activity.category, ...categories];
  return (
    <div className="rounded-2xl border border-gray-100 bg-[#f8faf9] p-4">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm font-bold text-gray-700">Activity</p>
        <button type="button" onClick={onRemove} aria-label="Remove activity" className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-all duration-200 hover:-translate-y-[1px] hover:bg-red-50 hover:text-red-500">
          <FiTrash2 size={16} />
        </button>
      </div>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600 sm:col-span-2">
          Activity title
          <input required value={activity.title} maxLength={150} onChange={(event) => onChange("title", event.target.value)} placeholder="What are you doing?" className={inputClass} />
        </label>
        <label className="text-xs font-semibold text-gray-600">
          Category
          <select value={activity.category} onChange={(event) => onChange("category", event.target.value)} className={inputClass}>
            {availableCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-600">
          Location
          <input value={activity.location} onChange={(event) => onChange("location", event.target.value)} className={inputClass} placeholder="Optional" />
        </label>
        <label className="text-xs font-semibold text-gray-600">
          Start time
          <input type="time" value={activity.startTime} onChange={(event) => onChange("startTime", event.target.value)} className={inputClass} />
        </label>
        <label className="text-xs font-semibold text-gray-600">
          End time
          <input type="time" value={activity.endTime} onChange={(event) => onChange("endTime", event.target.value)} className={inputClass} />
        </label>
        <label className="text-xs font-semibold text-gray-600">
          Estimated cost
          <input type="number" min="0" step="0.01" value={activity.estimatedCost} onChange={(event) => onChange("estimatedCost", event.target.value)} className={inputClass} />
        </label>
        <label className="text-xs font-semibold text-gray-600 sm:col-span-2">
          Description
          <textarea rows={2} maxLength={1000} value={activity.description} onChange={(event) => onChange("description", event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10" />
        </label>
      </div>
    </div>
  );
}
