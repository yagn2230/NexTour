import { FiExternalLink, FiInstagram, FiLink } from "react-icons/fi";
import SectionHeader from "./Common/SectionHeader";

export default function SocialLinks({ links = [] }) {
  return (
    <section>
      <SectionHeader title="Find me online" />
      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        {links.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl px-2 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#f1f8f7] hover:text-[#00796B]"><span className="flex items-center gap-2.5">{link.label === "Instagram" ? <FiInstagram /> : <FiLink />}{link.value}</span><FiExternalLink size={14} /></a>)}
      </div>
    </section>
  );
}
