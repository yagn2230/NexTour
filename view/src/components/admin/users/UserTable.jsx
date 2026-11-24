import { getUserId } from "../../../utils/adminUsers";
import UserRow from "./UserRow";

export default function UserTable({ users, onEdit, onChangeRole, onToggleStatus, onDelete, busyId }) {
  if (!users.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <h2 className="text-lg font-bold text-gray-900">No users found</h2>
        <p className="mt-1 text-sm text-gray-500">Try a different search or change the filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <table className="w-full min-w-[900px] text-left">
        <thead className="bg-[#f8faf9] text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-5 py-3.5 font-bold">User</th>
            <th className="px-5 py-3.5 font-bold">Role</th>
            <th className="px-5 py-3.5 font-bold">Status</th>
            <th className="px-5 py-3.5 font-bold">Joined</th>
            <th className="px-5 py-3.5 font-bold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <UserRow
              key={getUserId(user) || user.email || index}
              user={user}
              onEdit={() => onEdit(user)}
              onChangeRole={() => onChangeRole(user)}
              onToggleStatus={() => onToggleStatus(user)}
              onDelete={() => onDelete(user)}
              busy={busyId === getUserId(user)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
