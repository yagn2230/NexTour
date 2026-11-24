import { FiUsers } from "react-icons/fi";
import RupeeIcon from "../RupeeIcon";
import { StepHeading } from "./StepBasicInfo";

const inputClass = "mt-1.5 h-[46px] w-full rounded-xl border border-gray-200 bg-[#f8faf9] px-4 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";

export default function StepBudget({ form, update }) {
  return (
    <section aria-labelledby="budget-title">
      <StepHeading title="Budget and group size" description="Set the estimated trip budget and the number of travelers you can accommodate." />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-gray-700">
          Total trip budget
          <span className="relative mt-1.5 block">
            <RupeeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input id="budget-title" type="number" min="0" step="0.01" required className={`${inputClass} pl-10`} value={form.totalBudget} onChange={(event) => update("totalBudget", event.target.value)} placeholder="0.00" />
          </span>
          <span className="mt-1 block text-xs font-normal text-gray-500">Total estimated budget for the trip.</span>
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Price per person
          <span className="relative mt-1.5 block">
            <RupeeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input id="price-per-person" type="number" min="0" step="0.01" required className={`${inputClass} pl-10`} value={form.pricePerPerson} onChange={(event) => update("pricePerPerson", event.target.value)} placeholder="0.00" />
          </span>
          <span className="mt-1 block text-xs font-normal text-gray-500">Used to estimate revenue from accepted Trip Mates.</span>
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Maximum travelers
          <span className="relative mt-1.5 block">
            <FiUsers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input type="number" min="1" max="100" step="1" required className={`${inputClass} pl-10`} value={form.maxMembers} onChange={(event) => update("maxMembers", event.target.value)} />
          </span>
          <span className="mt-1 block text-xs font-normal text-gray-500">You will be included as the organizer.</span>
        </label>
      </div>
    </section>
  );
}
