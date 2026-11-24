import { FiCalendar, FiMapPin, FiUsers } from "react-icons/fi";
import { formatCurrency } from "../../utils/formatters";
import { StepHeading } from "./StepBasicInfo";

const formatTripDate = (date) => date
  ? new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
  : "TBD";

function ReviewItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{value || "Not set"}</p>
    </div>
  );
}

export default function StepReview({ form }) {
  return (
    <section aria-labelledby="review-title">
      <StepHeading title="Review your trip" description="Check the details before submitting your trip for approval." />
      <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        {form.coverImage.url && <img src={form.coverImage.url} alt={form.coverImage.alt || ""} className="h-48 w-full object-cover" />}
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <span className="inline-flex rounded-full bg-[#006f68]/10 px-3 py-1.5 text-xs font-bold text-[#00796B]">{form.category}</span>
            <h3 id="review-title" className="mt-3 text-2xl font-black tracking-[-0.5px] text-gray-900">{form.title}</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-gray-500"><FiMapPin className="text-[#00796B]" />{[form.city, form.state, form.country].filter(Boolean).join(", ")}</p>
            {form.description && <p className="mt-3 text-sm leading-7 text-gray-500">{form.description}</p>}
          </div>
          <div className="grid gap-4 border-y border-gray-100 py-5 sm:grid-cols-2 lg:grid-cols-4">
            <ReviewItem label="Start date" value={formatTripDate(form.startDate)} />
            <ReviewItem label="End date" value={formatTripDate(form.endDate)} />
            <ReviewItem label="Total budget" value={formatCurrency(Number(form.totalBudget))} />
            <ReviewItem label="Price per person" value={formatCurrency(Number(form.pricePerPerson))} />
            <ReviewItem label="Maximum travelers" value={<span className="inline-flex items-center gap-1.5"><FiUsers />{form.maxMembers}</span>} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <ReviewItem label="Transportation" value={form.transportation} />
            <ReviewItem label="Accommodation" value={form.hotelPreference} />
            <ReviewItem label="Food" value={form.foodPreference} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Selected famous places</p>
            {form.famousPlaces.length > 0
              ? <ul className="mt-2 flex flex-wrap gap-2">{form.famousPlaces.map((place) => <li key={place} className="rounded-full bg-[#f1f8f7] px-3 py-1.5 text-xs font-semibold text-[#006f68]">{place}</li>)}</ul>
              : <p className="mt-1 text-sm text-gray-500">No famous places selected.</p>}
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-gray-900"><FiCalendar className="text-[#00796B]" />Itinerary</p>
            {form.itinerary.length ? (
              <ol className="mt-3 space-y-2">
                {form.itinerary.map((day) => (
                  <li key={`${day.dayNumber}-${day.date}`} className="rounded-xl bg-[#f8faf9] px-4 py-3">
                    <p className="text-sm font-semibold text-gray-800">
                      Day {day.dayNumber}{day.title ? `: ${day.title}` : ""}{day.date ? ` · ${formatTripDate(day.date)}` : ""}
                    </p>
                    {day.activities.length > 0 && <p className="mt-1 text-xs text-gray-500">{day.activities.map((activity) => activity.title).join(" · ")}</p>}
                  </li>
                ))}
              </ol>
            ) : <p className="mt-2 text-sm text-gray-500">No itinerary added yet.</p>}
          </div>
        </div>
      </article>
      <p className="mt-4 text-sm leading-7 text-gray-500">Your trip will be submitted to the NexTour team for approval before it appears to other travelers.</p>
    </section>
  );
}
