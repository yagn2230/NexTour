import { useCallback, useEffect, useMemo, useState } from "react";
import { FiRefreshCw, FiUsers } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { getUserId, getUserName, getUserRole, getUserStatus, getUsersFromResponse } from "../../utils/adminUsers";
import ChangeRoleModal from "../../components/admin/users/ChangeRoleModal";
import DeleteUserModal from "../../components/admin/users/DeleteUserModal";
import EditUserModal from "../../components/admin/users/EditUserModal";
import UserFilters from "../../components/admin/users/UserFilters";
import UserSearch from "../../components/admin/users/UserSearch";
import UserTable from "../../components/admin/users/UserTable";

const PAGE_SIZE = 10;

export default function Users() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const search = searchParams.get("search") || "";
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modal, setModal] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminService.getAllUsers(search.trim(), role, status);
      const result = getUsersFromResponse(response);
      if (!result) throw new Error("The server returned an unexpected users response.");
      setUsers(result.filter(Boolean));
      setPage(1);
    } catch (loadError) {
      setError(loadError.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [search, role, status]);

  useEffect(() => {
    let active = true;
    const fetchUsers = async () => {
      setError("");
      try {
        const response = await adminService.getAllUsers(search.trim(), role, status);
        const result = getUsersFromResponse(response);
        if (!result) throw new Error("The server returned an unexpected users response.");
        if (active) {
          setUsers(result.filter(Boolean));
          setPage(1);
        }
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load users.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchUsers();
    return () => { active = false; };
  }, [search, role, status]);

  const sortedUsers = useMemo(() => [...users].sort((first, second) => {
    if (sort === "name") return getUserName(first).localeCompare(getUserName(second));
    if (sort === "status") return getUserStatus(first).localeCompare(getUserStatus(second));
    return new Date(second.createdAt || 0) - new Date(first.createdAt || 0);
  }), [sort, users]);
  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const visibleUsers = useMemo(() => sortedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sortedUsers, page]);
  const updateFilter = (key, value) => {
    setLoading(true);
    if (key === "role") setRole(value);
    if (key === "status") setStatus(value);
  };

  const openModal = (name, user) => { setSelectedUser(user); setModal(name); };
  const closeModal = () => { if (busyId === null) { setModal(""); setSelectedUser(null); } };

  const runUserAction = async (action, user, successMessage) => {
    const userId = getUserId(user);
    if (!userId) {
      toast.error("Cannot update a user without an ID.");
      return false;
    }
    setBusyId(userId);
    try {
      const result = await action(userId);
      setUsers((current) => current.map((item) => getUserId(item) === userId ? { ...item, ...(result?.user || result?.data?.user || {}) } : item));
      await loadUsers();
      return true;
    } catch (actionError) {
      if (!actionError.message) toast.error(successMessage);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const saveUser = async (fields) => {
    const success = await runUserAction((id) => adminService.updateUser(id, { fullName: fields.name.trim(), email: fields.email.trim() }), selectedUser, "Unable to update user.");
    if (success) closeModal();
  };
  const saveRole = async (nextRole) => {
    const success = await runUserAction((id) => adminService.updateUserRole(id, nextRole), selectedUser, "Unable to update user role.");
    if (success) closeModal();
  };
  const deleteUser = async () => {
    const success = await runUserAction(adminService.deleteUser, selectedUser, "Unable to delete user.");
    if (success) closeModal();
  };
  const toggleStatus = async (user) => {
    const nextStatus = user.isActive ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${nextStatus} ${user.fullName || "this account"}?`)) return;
    await runUserAction(
      (id) => adminService.toggleUserStatus(id, user.isActive),
      user,
      "Unable to update user status."
    );
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">Administration</p><h1 className="mt-3 text-4xl font-black tracking-[-1px] text-gray-900">User management</h1><p className="mt-2 text-sm leading-7 text-gray-500">Review accounts, manage roles, and update user access.</p></div>
        <button type="button" onClick={loadUsers} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:-translate-y-[1px] hover:border-[#00796B] hover:text-[#00796B] disabled:opacity-50"><FiRefreshCw className={loading ? "animate-spin" : ""} />Refresh</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total users" value={users.length} icon={<FiUsers />} />
        <StatCard label="Admins" value={users.filter((user) => getUserRole(user).toLowerCase() === "admin").length} icon={<span className="font-black">A</span>} />
        <StatCard label="Active users" value={users.filter((user) => getUserStatus(user).toLowerCase() === "active").length} icon={<span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-[#f8faf9] p-4 md:flex-row">
        <UserSearch value={search} onChange={(value) => {
          const next = new URLSearchParams(searchParams);
          if (value) next.set("search", value);
          else next.delete("search");
          setPage(1);
          setSearchParams(next);
        }} />
        <UserFilters role={role} status={status} onChange={updateFilter} onReset={() => { setRole(""); setStatus(""); }} />
        <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort users" className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"><option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="status">Status</option></select>
      </div>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={loadUsers} className="font-bold underline">Try again</button></div>}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm font-semibold text-gray-500" role="status">Loading users…</div>
      ) : (
        <UserTable
          users={visibleUsers}
          busyId={busyId}
          onEdit={(user) => openModal("edit", user)}
          onChangeRole={(user) => openModal("role", user)}
          onToggleStatus={toggleStatus}
          onDelete={(user) => openModal("delete", user)}
        />
      )}

      {!loading && users.length > 0 && <div className="flex items-center justify-between text-sm text-gray-500"><span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, users.length)}–{Math.min(page * PAGE_SIZE, users.length)} of {users.length} users</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold disabled:opacity-40">Previous</button><span className="px-2 font-semibold text-gray-700">{page} / {pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold disabled:opacity-40">Next</button></div></div>}

      <EditUserModal key={`edit-${getUserId(selectedUser) || "none"}`} user={modal === "edit" ? selectedUser : null} onSave={saveUser} onClose={closeModal} busy={busyId !== null} />
      <ChangeRoleModal key={`role-${getUserId(selectedUser) || "none"}`} user={modal === "role" ? selectedUser : null} onSave={saveRole} onClose={closeModal} busy={busyId !== null} />
      <DeleteUserModal key={`delete-${getUserId(selectedUser) || "none"}`} user={modal === "delete" ? selectedUser : null} onConfirm={deleteUser} onClose={closeModal} busy={busyId !== null} />
    </section>
  );
}

function StatCard({ label, value, icon }) {
  return <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#00796B]/30 hover:shadow-[0_12px_35px_rgba(0,111,104,0.10)]"><span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#f1f8f7] text-[#00796B]">{icon}</span><div><p className="text-sm font-semibold text-gray-500">{label}</p><p className="mt-0.5 text-2xl font-black tracking-[-0.5px] text-gray-900">{value}</p></div></div>;
}
