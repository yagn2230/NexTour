import { useState } from "react";
import { FiX } from "react-icons/fi";
import { getUserEmail, getUserName } from "../../../utils/adminUsers";

export default function EditUserModal({ user, onSave, onClose, busy }) {
  const [form, setForm] = useState(() => ({ name: user ? getUserName(user) : "", email: user?.email || "" }));

  if (!user) return null;

  const inputClass = "mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm" role="presentation">
      <form
        onSubmit={(event) => { event.preventDefault(); onSave(form); }}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="edit-user-title" className="text-xl font-black text-gray-900">Edit user</h2><p className="mt-1 text-sm text-gray-500">Update the user’s profile details.</p></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close"><FiX /></button>
        </div>
        <label className="mt-5 block text-sm font-semibold text-gray-700">Name<input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label className="mt-4 block text-sm font-semibold text-gray-700">Email<input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <p className="mt-3 text-xs text-gray-500">Current email: {getUserEmail(user)}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-xl bg-[#006f68] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#005c56] disabled:opacity-50">{busy ? "Saving..." : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}
