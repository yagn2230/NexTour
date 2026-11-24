import { FiCalendar, FiMapPin } from "react-icons/fi";
import { formatCurrency, formatDate } from "../../../utils/formatters";

export default function TripItinerary({ days }) {
  return (
    <section>
      <h2 className="font-bold text-gray-900">Itinerary</h2>
      {days.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No itinerary added yet.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {days.map((day, index) => {
            const activities = Array.isArray(day.activities) ? day.activities : [];
            const dayNumber = day.dayNumber || index + 1;

            return (
              <li key={day._id || day.id || `${dayNumber}-${index}`} className="rounded-xl bg-[#f8faf9] p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="font-semibold text-gray-800">
                    Day {dayNumber}{day.title ? `: ${day.title}` : ""}
                  </h3>
                  {day.date && (
                    <p className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                      <FiCalendar />{formatDate(day.date)}
                    </p>
                  )}
                </div>
                {activities.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {activities.map((activity, activityIndex) => {
                      const time = [activity.startTime, activity.endTime].filter(Boolean).join(" – ");
                      const cost = Number(activity.estimatedCost);

                      return (
                        <li key={activity._id || activity.id || activityIndex} className="rounded-lg border border-gray-100 bg-white p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-800">{activity.title || `Activity ${activityIndex + 1}`}</h4>
                              {(activity.category || time) && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {[activity.category, time].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                            {Number.isFinite(cost) && cost > 0 && (
                              <span className="text-xs font-semibold text-gray-600">{formatCurrency(cost)}</span>
                            )}
                          </div>
                          {activity.location && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                              <FiMapPin />{activity.location}
                            </p>
                          )}
                          {activity.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-gray-600">{activity.description}</p>}
                          {activity.notes && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-gray-500">{activity.notes}</p>}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">No activities planned for this day.</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
