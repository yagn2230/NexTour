import { FiEdit2, FiEye, FiShield, FiTrash2, FiUserCheck, FiUserX } from "react-icons/fi";

export default function UserActions({ user, onView, onEdit, onChangeRole, onToggleStatus, onDelete, busy }) {
  const inactive = ["inactive", "disabled", "blocked"].includes(String(user?.status || "").toLowerCase()) || user?.isActive === false || user?.active === false;
  const buttonClass = "inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-2.5 text-xs font-semibold text-gray-700 transition hover:border-[#cfe1de] hover:text-[#00796B] disabled:cursor-wait disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} onClick={onView} aria-label="View user"><FiEye />View</button>
      <button type="button" className={buttonClass} onClick={onEdit} aria-label="Edit user"><FiEdit2 />Edit</button>
      <button type="button" className={buttonClass} onClick={onChangeRole} aria-label="Change user role"><FiShield />Role</button>
      <button type="button" className={buttonClass} onClick={onToggleStatus} disabled={busy} aria-label={inactive ? "Activate user" : "Deactivate user"}>
        {inactive ? <FiUserCheck /> : <FiUserX />}{inactive ? "Activate" : "Deactivate"}
      </button>
      <button type="button" className={`${buttonClass} border-red-200 text-red-700 hover:border-red-300 hover:text-red-800`} onClick={onDelete} aria-label="Delete user">
        <FiTrash2 />Delete
      </button>
    </div>
  );
}
