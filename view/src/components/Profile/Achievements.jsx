import { FiAward } from "react-icons/fi";
import SectionHeader from "./Common/SectionHeader";

export default function Achievements({ achievements = [] }) {
  return (
    <section>
      <SectionHeader title="Milestones collected" eyebrow="Achievements" />
      <div className="grid gap-3 sm:grid-cols-3">
        {achievements.map((item) => <article key={item.title} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f1f8f7] text-2xl">{item.icon || <FiAward />}</span><div><h3 className="text-sm font-bold text-slate-800">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.detail}</p></div></article>)}
      </div>
    </section>
  );
}
