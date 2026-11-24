import RupeeIcon from "../../RupeeIcon";
import SectionHeader from "../Common/SectionHeader";
import { formatCurrency } from "../../../utils/formatters";

export default function Earnings({ revenue }) {
  return (
    <section>
      <SectionHeader title="Revenue overview" eyebrow="Earnings" />
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1f8f7] text-[#00796B]"><RupeeIcon /></span><div><p className="text-sm font-medium text-slate-500">Estimated revenue</p><p className="mt-1 text-2xl font-black text-slate-900">{revenue?.tracked ? formatCurrency(Number(revenue.total)) : "Not tracked"}</p><p className="mt-2 text-xs leading-5 text-slate-500">{revenue?.tracked ? "Accepted Trip Mates × per-person price; this is not payment tracking." : "Set a per-person price on your trips to calculate estimates."}</p></div></div>
      </div>
    </section>
  );
}
