import { FiTrendingUp } from "react-icons/fi";
import SectionHeader from "../Common/SectionHeader";

export default function Analytics({ metrics = [] }) {
  return (
    <section>
      <SectionHeader title="Your reach at a glance" eyebrow="Analytics" action={<span className="inline-flex items-center gap-1 text-xs font-bold text-[#00796B]"><FiTrendingUp />Growing steadily</span>} />
      <div className="grid gap-3 sm:grid-cols-3">{metrics.map((metric) => <div key={metric.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"><p className="text-xs font-medium text-slate-500">{metric.label}</p><p className="mt-1 text-xl font-black text-slate-900">{metric.value}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#00796B]" style={{ width: `${metric.percentage}%` }} /></div></div>)}</div>
    </section>
  );
}
