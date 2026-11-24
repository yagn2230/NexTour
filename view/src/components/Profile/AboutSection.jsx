import { FiHeart } from "react-icons/fi";
import SectionHeader from "./Common/SectionHeader";

export default function AboutSection({ bio, interests = [] }) {
  return (
    <section>
      <SectionHeader title="A little about me" eyebrow="About" />
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <p className="text-sm leading-7 text-slate-600">{bio}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {interests.map((interest) => <span key={interest} className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f8f7] px-3 py-1.5 text-xs font-semibold text-[#005c56]"><FiHeart size={12} />{interest}</span>)}
        </div>
      </div>
    </section>
  );
}
