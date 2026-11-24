import { StepHeading } from "./StepBasicInfo";

const fieldClass = "mt-1.5 h-[46px] w-full rounded-xl border border-gray-200 bg-[#f8faf9] px-4 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";

const choices = {
  transportation: ["Car", "Bus", "Train", "Flight", "Bike", "Other"],
  hotelPreference: ["Budget", "Standard", "Luxury"],
  foodPreference: ["Veg", "Non-Veg", "Both"],
};

const labels = {
  transportation: "Preferred transportation",
  hotelPreference: "Accommodation style",
  foodPreference: "Food preference",
};

export default function StepPreferences({ form, update }) {
  return (
    <section aria-labelledby="preferences-title">
      <StepHeading title="Travel preferences" description="Let your group know how you like to travel." />
      <div className="grid gap-5 sm:grid-cols-2">
        {Object.entries(choices).map(([key, options]) => (
          <label key={key} className="text-sm font-semibold text-gray-700">
            {labels[key]}
            <select className={fieldClass} value={form[key]} onChange={(event) => update(key, event.target.value)}>
              {options.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        ))}
        <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
          Activity interests
          <textarea className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-[#f8faf9] px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition-all duration-200 focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10" rows={4} maxLength={500} value={form.activityPreference} onChange={(event) => update("activityPreference", event.target.value)} placeholder="Tell travelers what you enjoy doing..." />
          <span className="mt-1 block text-right text-xs font-normal text-gray-400">{form.activityPreference.length}/500</span>
        </label>
      </div>
    </section>
  );
}
