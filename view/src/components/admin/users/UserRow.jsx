import { Link, useNavigate } from "react-router-dom";
import { getUserEmail, getUserId, getUserName, getUserRole, getUserStatus } from "../../../utils/adminUsers";
import UserActions from "./UserActions";

export default function UserRow({ user, onEdit, onChangeRole, onToggleStatus, onDelete, busy }) {
  const navigate = useNavigate();
  const userId = getUserId(user);
  const name = getUserName(user);
  const status = getUserStatus(user);
  const active = status.toLowerCase() === "active";

  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1f8f7] font-bold text-[#00796B]">{name.charAt(0).toUpperCase()}</div>
          <div className="min-w-0">
            <Link to={`/admin/users/${userId}`} className="block truncate font-semibold text-gray-900 hover:text-[#00796B]">{name}</Link>
            <p className="mt-0.5 truncate text-xs text-gray-500">{getUserEmail(user)}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{getUserRole(user)}</span>
        {user?.organizer?.status && user.organizer.status !== "Not Applied" && getUserRole(user) !== "Organizer" && (
          <span className="mt-1 block text-xs text-gray-500">Organizer application: {user.organizer.status}</span>
        )}
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : status === "Unknown" ? "bg-gray-100 text-gray-600" : "bg-red-50 text-red-700"}`}>{status}</span>
      </td>
      <td className="px-5 py-4 text-sm text-gray-600">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</td>
      <td className="px-5 py-4">
        <UserActions
          user={user}
          onView={() => { if (userId) navigate(`/admin/users/${userId}`); }}
          onEdit={onEdit}
          onChangeRole={onChangeRole}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          busy={busy}
        />
      </td>
    </tr>
  );
}
