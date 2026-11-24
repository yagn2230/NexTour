import { FiCheck } from "react-icons/fi";
import SectionHeader from "./Common/SectionHeader";

export default function TravelPreferences({ preferences = [] }) {
  return (
    <section>
      <SectionHeader title="Travel preferences" description="The little details that make a trip feel like yours." />
      <div className="grid gap-3 sm:grid-cols-2">
        {preferences.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f1f8f7] text-[#00796B]"><FiCheck size={15} /></span><span className="text-sm font-semibold text-slate-700">{item}</span></div>)}
      </div>
    </section>
  );
}
