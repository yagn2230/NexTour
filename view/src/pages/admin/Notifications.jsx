import { useState } from "react";
import { FiSend } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { adminService } from "../../services/adminService";

export default function Notifications() {
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (sending) return;
    if (!title.trim() || !message.trim()) {
      toast.error("Add a title and message before sending.");
      return;
    }
    if (!window.confirm(`Send this announcement to ${audience === "all" ? "all active users" : "all active organizers"}?`)) return;
    setSending(true);
    setResult("");
    try {
      const response = await adminService.sendNotification(audience, title, message);
      setResult(`Announcement sent to ${response.recipientCount} active ${audience === "all" ? "accounts" : "organizers"}.`);
      setTitle("");
      setMessage("");
      toast.success(response.message || "Announcement sent.");
    } catch (sendError) {
      if (!sendError.message) toast.error("Unable to send announcement.");
    } finally {
      setSending(false);
    }
  };

  const inputClass = "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";
  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">Communication</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-1px] text-gray-900">Notifications</h1>
        <p className="mt-2 text-sm leading-7 text-gray-500">Send an in-app announcement to active users or verified organizers.</p>
      </header>

      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
        <label className="block text-sm font-semibold text-gray-700">Audience
          <select value={audience} onChange={(event) => setAudience(event.target.value)} className={inputClass}>
            <option value="all">All active users</option>
            <option value="organizers">Active verified organizers</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-gray-700">Announcement title
          <input required maxLength={150} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="A short, clear headline" />
          <span className="mt-1 block text-right text-xs font-normal text-gray-400">{title.length}/150</span>
        </label>
        <label className="block text-sm font-semibold text-gray-700">Message
          <textarea required maxLength={500} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} className={`${inputClass} resize-y`} placeholder="Write the announcement for your audience." />
          <span className="mt-1 block text-right text-xs font-normal text-gray-400">{message.length}/500</span>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="max-w-xl text-xs leading-5 text-gray-500">Notifications are saved in each recipient’s in-app notification list. The request is limited to 100 notifications per account.</p>
          <button type="submit" disabled={sending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#006f68] px-5 text-sm font-bold text-white transition hover:bg-[#005c56] disabled:opacity-50"><FiSend />{sending ? "Sending…" : "Send announcement"}</button>
        </div>
        {result && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{result}</p>}
      </form>
    </section>
  );
}
