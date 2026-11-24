import { useState } from "react";
import { FiBell, FiCheck, FiTrash2 } from "react-icons/fi";
import SectionHeader from "../Common/SectionHeader";
import EmptyState from "../Common/EmptyState";

export default function Notifications({ notifications = [], onMarkRead, onDelete }) {
  const [readIds, setReadIds] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");

  const markRead = async (id) => {
    if (!onMarkRead) return;
    setError("");
    setProcessingId(id);
    try {
      await onMarkRead(id);
      setReadIds((current) => [...current, id]);
    } catch (readError) {
      setError(readError.message || "Unable to update notification.");
    } finally {
      setProcessingId("");
    }
  };

  const deleteNotice = async (id) => {
    if (!onDelete) return;
    setError("");
    setProcessingId(id);
    try {
      await onDelete(id);
      setDeletedIds((current) => [...current, id]);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete notification.");
    } finally {
      setProcessingId("");
    }
  };

  const visibleNotifications = notifications.filter((notice) => !deletedIds.includes(notice.id));
  return (
    <section id="profile-notifications" className="scroll-mt-24">
      <SectionHeader title="Updates for you" eyebrow="Notifications" />
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {visibleNotifications.length ? <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white px-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        {visibleNotifications.map((notice) => {
          const read = !notice.unread || readIds.includes(notice.id);
          return <article key={notice.id} className="flex gap-3 py-4"><span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${read ? "bg-slate-50 text-slate-400" : "bg-[#f1f8f7] text-[#00796B]"}`}><FiBell size={16} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">{notice.title}</h3><span className="text-[11px] text-slate-400">{notice.time}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{notice.detail}</p><div className="mt-2 flex gap-4">{!read && <button type="button" disabled={processingId === notice.id} onClick={() => markRead(notice.id)} className="inline-flex items-center gap-1 text-xs font-bold text-[#00796B] disabled:opacity-50"><FiCheck />Mark read</button>}{onDelete && <button type="button" disabled={processingId === notice.id} onClick={() => deleteNotice(notice.id)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-700 disabled:opacity-50"><FiTrash2 />Delete</button>}</div></div>{!read && <span className="mt-2 h-2 w-2 rounded-full bg-[#00796B]" />}</article>;
        })}
      </div> : <EmptyState title="You're all caught up" description="New trip activity will show here." />}
    </section>
  );
}
