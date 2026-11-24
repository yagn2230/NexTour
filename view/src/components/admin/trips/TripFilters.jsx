export default function TripFilters({ filters, options, onChange, onReset }) {
  const selectClass = "min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";
  const active = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <select className={selectClass} value={filters.status} onChange={(event) => onChange("status", event.target.value)} aria-label="Filter by trip status">
        <option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
      </select>
      <select className={selectClass} value={filters.country} onChange={(event) => onChange("country", event.target.value)} aria-label="Filter by country">
        <option value="">All countries</option>{options.countries.map((country) => <option key={country} value={country}>{country}</option>)}
      </select>
      <select className={selectClass} value={filters.category} onChange={(event) => onChange("category", event.target.value)} aria-label="Filter by category">
        <option value="">All categories</option>{options.categories.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
      {active && <button type="button" onClick={onReset} className="min-h-11 px-2 text-sm font-bold text-[#00796B] hover:underline">Clear filters</button>}
    </div>
  );
}
