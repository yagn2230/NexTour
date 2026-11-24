import { FiAlertTriangle, FiX } from "react-icons/fi";
import { getUserName } from "../../../utils/adminUsers";

export default function DeleteUserModal({ user, onConfirm, onClose, busy }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm" role="presentation">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><FiAlertTriangle size={20} /></span>
            <div><h2 id="delete-user-title" className="text-xl font-black text-gray-900">Delete this user?</h2><p className="mt-2 text-sm leading-6 text-gray-500">This action cannot be undone. The account for <strong className="text-gray-700">{getUserName(user)}</strong> will be permanently deleted.</p></div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close"><FiX /></button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50">{busy ? "Deleting..." : "Delete user"}</button>
        </div>
      </div>
    </div>
  );
}
