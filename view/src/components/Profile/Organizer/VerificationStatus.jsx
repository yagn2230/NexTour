import { Link } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiShield } from "react-icons/fi";

export default function VerificationStatus({ verified = false, status = "Not Verified" }) {
  return (
    <section className={`overflow-hidden rounded-2xl border p-5 sm:p-6 ${verified ? "border-[#cfe1de] bg-[#f1f8f7]/70" : "border-[#cfe1de] bg-gradient-to-br from-[#f1f8f7] to-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${verified ? "bg-[#f1f8f7] text-[#00796B]" : "bg-white text-[#00796B] shadow-sm"}`}>{verified ? <FiCheckCircle size={22} /> : <FiShield size={22} />}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00796B]">Organizer verification</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{verified ? "Verified Organizer" : "Become a Trip Organizer"}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{verified ? "Your profile carries the NexTour verified organizer badge." : "Complete verification to create public trips and welcome travelers."}</p>
            {!verified && <p className="mt-2 text-xs font-semibold text-slate-500">Status: <span className={status === "Pending" ? "text-[#00796B]" : "text-slate-700"}>{status}</span></p>}
          </div>
        </div>
        {verified ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#00796B]"><FiCheckCircle />Verified Organizer</span> : <Link to="/organizer/apply" className="inline-flex items-center gap-2 rounded-xl bg-[#00796B] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#005c56]">{status === "Pending" ? "View application" : "Apply for verification"} <FiArrowRight /></Link>}
      </div>
    </section>
  );
}
