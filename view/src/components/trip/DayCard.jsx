import { FiCalendar, FiPlus, FiTrash2 } from "react-icons/fi";

export default function DayCard({ day, onUpdate, onRemove, onAddActivity, renderActivity }) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#f1f8f7] text-[#00796B]">
          <FiCalendar size={18} />
        </span>
        <h3 className="flex-1 text-lg font-bold text-gray-900">Day {day.dayNumber}</h3>
        <button type="button" onClick={onRemove} aria-label={`Remove day ${day.dayNumber}`} className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition-all duration-200 hover:-translate-y-[1px] hover:bg-red-50 hover:text-red-500">
          <FiTrash2 size={17} />
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-gray-700">
          Date
          <input type="date" value={day.date || ""} onChange={(event) => onUpdate("date", event.target.value)} className="mt-1.5 h-[46px] w-full rounded-xl border border-gray-200 bg-[#f8faf9] px-4 text-sm outline-none transition-all duration-200 focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10" />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Day title
          <input value={day.title} maxLength={150} onChange={(event) => onUpdate("title", event.target.value)} placeholder="e.g. Explore the old town" className="mt-1.5 h-[46px] w-full rounded-xl border border-gray-200 bg-[#f8faf9] px-4 text-sm outline-none transition-all duration-200 focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10" />
        </label>
      </div>
      <div className="mt-5 space-y-3">
        {day.activities.map((activity, index) => renderActivity(activity, index))}
      </div>
      <button type="button" onClick={onAddActivity} className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#00796B] transition-all duration-200 hover:-translate-y-[1px] hover:text-[#006f68]">
        <FiPlus size={16} />Add activity
      </button>
    </article>
  );
}
