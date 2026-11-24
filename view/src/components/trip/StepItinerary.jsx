import { FiCalendar, FiPlus } from "react-icons/fi";
import { StepHeading } from "./StepBasicInfo";
import ActivityCard from "./ActivityCard";
import DayCard from "./DayCard";

export default function StepItinerary({ itinerary, startDate, endDate, onUpdateDay, onAddDay, onRemoveDay, onAddActivity, onUpdateActivity, onRemoveActivity, categories }) {
  const autoPlanLimitReached = itinerary.length === 30
    && startDate
    && endDate
    && new Date(`${endDate}T00:00:00Z`) - new Date(`${startDate}T00:00:00Z`) >= 30 * 86400000;

  return (
    <section aria-labelledby="itinerary-title">
      <StepHeading title="Plan the itinerary" description="Add your days and activities. You can also leave this blank and plan later." />
      {itinerary.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cfe1de] bg-[#f8faf9] px-5 py-12 text-center">
          <FiCalendar className="mx-auto text-[#00796B]" size={26} />
          <p className="mt-3 text-sm font-semibold text-gray-700">No itinerary days yet</p>
          <p className="mt-1 text-sm text-gray-500">Add dates on the first step to create days automatically, or add one here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {itinerary.map((day, index) => (
            <DayCard
              key={`${day.dayNumber}-${day.date}`}
              day={day}
              onUpdate={(key, value) => onUpdateDay(index, key, value)}
              onRemove={() => onRemoveDay(index)}
              onAddActivity={() => onAddActivity(index)}
              renderActivity={(activity, activityIndex) => (
                <ActivityCard
                  key={activityIndex}
                  activity={activity}
                  categories={categories}
                  onChange={(key, value) => onUpdateActivity(index, activityIndex, key, value)}
                  onRemove={() => onRemoveActivity(index, activityIndex)}
                />
              )}
            />
          ))}
        </div>
      )}
      {autoPlanLimitReached && (
        <p className="mt-3 text-xs leading-5 text-gray-500">
          The first 30 days are added automatically. Add any remaining days below.
        </p>
      )}
      <button type="button" onClick={onAddDay} className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 hover:-translate-y-[1px] hover:border-[#00796B] hover:text-[#00796B]">
        <FiPlus size={17} />Add a day
      </button>
      <p id="itinerary-title" className="sr-only">Trip itinerary</p>
    </section>
  );
}
