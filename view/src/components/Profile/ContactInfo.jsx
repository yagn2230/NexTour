import { FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import SectionHeader from "./Common/SectionHeader";

export default function ContactInfo({ location, email, phone }) {
  const items = [{ Icon: FiMapPin, label: "Based in", value: location }, { Icon: FiMail, label: "Email", value: email }, { Icon: FiPhone, label: "Phone", value: phone }];
  return (
    <section>
      <SectionHeader title="Contact information" />
      <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        {items.map(({ Icon, label, value }) => <div key={label} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f1f8f7] text-[#00796B]"><Icon size={16} /></span><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-sm font-medium text-slate-700">{value || "Not provided"}</p></div></div>)}
      </div>
    </section>
  );
}
