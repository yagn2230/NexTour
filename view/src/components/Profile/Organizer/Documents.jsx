import { FiFileText, FiExternalLink, FiCheckCircle } from "react-icons/fi";
import { Link } from "react-router-dom";
import SectionHeader from "../Common/SectionHeader";
import EmptyState from "../Common/EmptyState";

export default function Documents({ documents = [] }) {
  return (
    <section>
      <SectionHeader title="Organizer documents" eyebrow="Verification" action={<Link to="/organizer/apply" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[#00796B] hover:text-[#00796B]"><FiExternalLink />Manage application</Link>} />
      {documents.length ? <div className="space-y-2">{documents.map((document) => <article key={document.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1f8f7] text-[#00796B]"><FiFileText /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-slate-800">{document.name}</h3><p className="mt-1 text-xs text-slate-500">{document.detail}</p></div>{document.url ? <a href={document.url} target="_blank" rel="noreferrer" className="hidden items-center gap-1 text-xs font-bold text-[#00796B] sm:inline-flex">Open <FiExternalLink /></a> : null}<span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00796B]"><FiCheckCircle />{document.status}</span></article>)}</div> : <EmptyState title="No documents added" description="Submit credentials through the organizer application to begin verification." />}
    </section>
  );
}
