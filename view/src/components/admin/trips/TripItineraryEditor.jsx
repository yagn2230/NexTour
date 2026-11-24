import { FiPlus, FiTrash2 } from "react-icons/fi";

const inputClass = "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";

export default function TripItineraryEditor({ days, onChange }) {
  const updateDay = (dayIndex, changes) => {
    onChange(days.map((day, index) => index === dayIndex ? { ...day, ...changes } : day));
  };

  const updateActivity = (dayIndex, activityIndex, changes) => {
    onChange(days.map((day, index) => index !== dayIndex ? day : ({
      ...day,
      activities: (day.activities || []).map((activity, itemIndex) =>
        itemIndex === activityIndex ? { ...activity, ...changes } : activity
      ),
    })));
  };

  const addDay = () => onChange([
    ...days,
    { dayNumber: days.length + 1, date: "", title: "", activities: [] },
  ]);

  const removeDay = (dayIndex) => onChange(
    days.filter((_, index) => index !== dayIndex)
      .map((day, index) => ({ ...day, dayNumber: index + 1 }))
  );

  const addActivity = (dayIndex) => {
    const day = days[dayIndex];
    updateDay(dayIndex, {
      activities: [...(day.activities || []), {
        title: "",
        description: "",
        location: "",
        startTime: "",
        endTime: "",
        estimatedCost: 0,
        category: "Other",
        notes: "",
      }],
    });
  };

  const removeActivity = (dayIndex, activityIndex) => {
    const day = days[dayIndex];
    updateDay(dayIndex, {
      activities: (day.activities || []).filter((_, index) => index !== activityIndex),
    });
  };

  return (
    <section className="sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Itinerary</h3>
          <p className="mt-1 text-xs text-gray-500">Edit days and activities for this trip.</p>
        </div>
        <button type="button" onClick={addDay} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-[#00796B] hover:text-[#00796B]">
          <FiPlus />Add day
        </button>
      </div>

      {days.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">No itinerary days added yet.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {days.map((day, dayIndex) => (
            <div key={day._id || `day-${dayIndex}`} className="rounded-xl border border-gray-200 bg-[#f8faf9] p-4">
              <div className="flex items-start gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-gray-600">
                    Day {day.dayNumber || dayIndex + 1} title
                    <input value={day.title || ""} onChange={(event) => updateDay(dayIndex, { title: event.target.value })} className={inputClass} />
                  </label>
                  <label className="text-xs font-semibold text-gray-600">
                    Date
                    <input type="date" value={String(day.date || "").slice(0, 10)} onChange={(event) => updateDay(dayIndex, { date: event.target.value })} className={inputClass} />
                  </label>
                </div>
                <button type="button" onClick={() => removeDay(dayIndex)} aria-label={`Remove day ${day.dayNumber || dayIndex + 1}`} className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <FiTrash2 />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {(day.activities || []).map((activity, activityIndex) => (
                  <div key={activity._id || `activity-${activityIndex}`} className="rounded-lg border border-gray-100 bg-white p-3">
                    <div className="flex items-start gap-3">
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-gray-600">
                          Activity title
                          <input value={activity.title || ""} onChange={(event) => updateActivity(dayIndex, activityIndex, { title: event.target.value })} className={inputClass} />
                        </label>
                        <label className="text-xs font-semibold text-gray-600">
                          Location
                          <input value={activity.location || ""} onChange={(event) => updateActivity(dayIndex, activityIndex, { location: event.target.value })} className={inputClass} />
                        </label>
                        <label className="text-xs font-semibold text-gray-600">
                          Start time
                          <input type="time" value={activity.startTime || ""} onChange={(event) => updateActivity(dayIndex, activityIndex, { startTime: event.target.value })} className={inputClass} />
                        </label>
                        <label className="text-xs font-semibold text-gray-600">
                          End time
                          <input type="time" value={activity.endTime || ""} onChange={(event) => updateActivity(dayIndex, activityIndex, { endTime: event.target.value })} className={inputClass} />
                        </label>
                        <label className="text-xs font-semibold text-gray-600 sm:col-span-2">
                          Description
                          <textarea rows="2" value={activity.description || ""} onChange={(event) => updateActivity(dayIndex, activityIndex, { description: event.target.value })} className={`${inputClass} resize-y`} />
                        </label>
                      </div>
                      <button type="button" onClick={() => removeActivity(dayIndex, activityIndex)} aria-label={`Remove activity ${activityIndex + 1}`} className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addActivity(dayIndex)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#00796B] hover:text-[#005c56]">
                <FiPlus />Add activity
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
