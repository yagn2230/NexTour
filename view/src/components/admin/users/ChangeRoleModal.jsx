import { useState } from "react";
import { FiX } from "react-icons/fi";
import { getUserName } from "../../../utils/adminUsers";

export default function ChangeRoleModal({ user, onSave, onClose, busy }) {
  const [role, setRole] = useState(() => user?.role || "User");

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm" role="presentation">
      <form onSubmit={(event) => { event.preventDefault(); onSave(role); }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="change-role-title">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="change-role-title" className="text-xl font-black text-gray-900">Change user role</h2><p className="mt-1 text-sm text-gray-500">Select the role for {getUserName(user)}.</p></div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close"><FiX /></button>
        </div>
        <label className="mt-5 block text-sm font-semibold text-gray-700">Role
          <select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10">
            <option value="User">User</option><option value="Admin">Admin</option>
          </select>
          <span className="mt-1 block text-xs font-normal text-gray-500">Organizer access is granted through the approved organizer application.</span>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={busy || role === (user.role || "User")} className="rounded-xl bg-[#006f68] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#005c56] disabled:opacity-50">{busy ? "Saving..." : "Update role"}</button>
        </div>
      </form>
    </div>
  );
}
