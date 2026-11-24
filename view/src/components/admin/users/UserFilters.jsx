export default function UserFilters({ role, status, onChange, onReset }) {
  const selectClass = "min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <select className={selectClass} value={role} onChange={(event) => onChange("role", event.target.value)} aria-label="Filter users by role">
        <option value="">All roles</option>
        <option value="User">Trip Mate / Applicant</option>
        <option value="Organizer">Organizer</option>
        <option value="Admin">Admin</option>
      </select>
      <select className={selectClass} value={status} onChange={(event) => onChange("status", event.target.value)} aria-label="Filter users by status">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      {(role || status) && (
        <button type="button" onClick={onReset} className="min-h-11 px-2 text-sm font-bold text-[#00796B] hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
