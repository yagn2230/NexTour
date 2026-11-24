import { FiCompass } from "react-icons/fi";

export default function EmptyState({ title = "Nothing here yet", description = "Your next adventure is waiting to be planned.", action }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfe1de] bg-white px-6 py-8 text-center">
      <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#006f68]/10 text-[#00796B]"><FiCompass size={20} /></span>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
