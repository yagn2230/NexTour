import { motion } from "framer-motion";
import { FiCompass, FiFlag } from "react-icons/fi";

const roles = [
  { id: "traveler", label: "TripMate", detail: "My travel life", Icon: FiCompass },
  { id: "organizer", label: "Organizer", detail: "My trips & guests", Icon: FiFlag },
];

export default function RoleSwitcher({ role, onChange }) {
  return (
    <div className="inline-flex w-full rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:w-auto" role="tablist" aria-label="Choose profile view">
      {roles.map(({ id, label, detail, Icon }) => (
        <button key={id} type="button" role="tab" aria-selected={role === id} onClick={() => onChange(id)} className={`relative flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 sm:min-w-48 ${role === id ? "text-white" : "text-gray-600 hover:bg-[#f1f8f7] hover:text-[#00796B]"}`}>
          {role === id && <motion.span layoutId="profile-role-indicator" className="absolute inset-0 rounded-xl bg-[#006f68]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <Icon size={19} className="relative z-10" />
          <span className="relative z-10">
            <span className="block text-sm font-bold">{label}</span>
            <span className={`hidden text-[11px] sm:block ${role === id ? "text-white/75" : "text-gray-400"}`}>{detail}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
