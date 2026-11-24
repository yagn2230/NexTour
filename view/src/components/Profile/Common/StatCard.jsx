import { FiActivity, FiAward, FiCheckCircle, FiStar, FiUsers, FiBriefcase } from "react-icons/fi";
import RupeeIcon from "../../RupeeIcon";

const icons = {
  trips: FiBriefcase,
  active: FiActivity,
  pending: FiActivity,
  completed: FiCheckCircle,
  travelers: FiUsers,
  rating: FiStar,
  revenue: RupeeIcon,
  badges: FiAward,
};

export default function StatCard({ label, value, icon = "trips", change, compact = false }) {
  const Icon = icons[icon] || FiActivity;
  return (
    <article className={`rounded-2xl border border-gray-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#00796B]/30 hover:shadow-[0_12px_35px_rgba(0,111,104,0.10)] ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[#f1f8f7] text-[#00796B]"><Icon size={19} /></span>
      </div>
      {change && <p className="mt-3 text-xs font-medium text-slate-500">{change}</p>}
    </article>
  );
}
