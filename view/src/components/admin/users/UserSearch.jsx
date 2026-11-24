import { FiSearch, FiX } from "react-icons/fi";

export default function UserSearch({ value, onChange }) {
  return (
    <label className="flex h-[46px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-[#f8faf9] px-4 transition-all duration-200 focus-within:border-[#00796B] focus-within:ring-4 focus-within:ring-[#00796B]/10">
      <FiSearch className="shrink-0 text-gray-400" />
      <input
        type="search"
        className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search name or email"
        aria-label="Search users"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="transition-all duration-200 hover:-translate-y-[1px] hover:text-[#00796B]" aria-label="Clear search">
          <FiX />
        </button>
      )}
    </label>
  );
}
