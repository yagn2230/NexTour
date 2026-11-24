import { useEffect, useMemo, useState } from "react";
import { adminService } from "../../services/adminService";

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    adminService.getAdminStats()
      .then((response) => {
        if (active) setStats(response.stats || null);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load platform analytics.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const monthly = useMemo(() => makeMonthlySeries(stats), [stats]);
  if (loading) return <StatePanel role="status">Loading analytics…</StatePanel>;
  if (error) return <StatePanel role="alert" error>{error}</StatePanel>;
  if (!stats) return <StatePanel role="alert" error>The server returned an unexpected analytics response.</StatePanel>;

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">Platform insights</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-1px] text-gray-900">Analytics</h1>
        <p className="mt-2 text-sm leading-7 text-gray-500">Growth, activity, and engagement across the platform.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="User growth (6 months)" value={monthly.reduce((total, item) => total + item.users, 0)} />
        <SummaryCard label="Trip creation (6 months)" value={monthly.reduce((total, item) => total + item.trips, 0)} />
        <SummaryCard label="Approved trips" value={stats.approvedTrips || 0} />
        <SummaryCard label="Active organizers" value={stats.totalOrganizers || 0} />
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-black text-gray-900">Monthly platform growth</h2><p className="mt-1 text-sm text-gray-500">New account signups and trip creation.</p></div>
          <div className="flex gap-4 text-xs font-semibold text-gray-600"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#00796B]" />Users</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-amber-400" />Trips</span></div>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {monthly.map((month) => {
            const max = Math.max(...monthly.flatMap((item) => [item.users, item.trips]), 1);
            return (
              <div key={month.key} className="rounded-xl bg-[#f8faf9] p-3">
                <p className="truncate text-xs font-bold text-gray-500">{month.label}</p>
                <div className="mt-3 flex h-32 items-end justify-center gap-2 border-b border-gray-200 pb-1">
                  <div className="relative w-5 rounded-t bg-[#00796B]" style={{ height: `${Math.max(3, (month.users / max) * 100)}%` }} title={`${month.users} users`} />
                  <div className="relative w-5 rounded-t bg-amber-400" style={{ height: `${Math.max(3, (month.trips / max) * 100)}%` }} title={`${month.trips} trips`} />
                </div>
                <p className="mt-2 text-center text-xs text-gray-500">{month.users} users · {month.trips} trips</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <RankedList title="Popular destinations" subtitle="By approved trip count" items={stats.popularDestinations || []} labelKey="_id" countKey="trips" empty="No destination activity yet." />
        <RankedList title="Most active organizers" subtitle="By trips created" items={stats.activeOrganizers || []} labelKey="name" countKey="trips" empty="No organizer activity yet." />
        <RankedList title="Most joined trips" subtitle="By traveler participants" items={stats.mostJoinedTrips || []} labelKey="title" countKey="members" empty="No trips have participants yet." />
      </div>
    </section>
  );
}

function SummaryCard({ label, value }) {
  return <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-gray-500">{label}</p><p className="mt-2 text-3xl font-black text-gray-900">{value}</p></article>;
}

function RankedList({ title, subtitle, items, labelKey, countKey, empty }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">{title}</h2><p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      {items.length ? <ol className="mt-4 divide-y divide-gray-100">{items.map((item, index) => <li key={`${item[labelKey] || "item"}-${index}`} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0 truncate text-sm font-semibold text-gray-700">{index + 1}. {item[labelKey] || "Unknown"}</span><span className="shrink-0 rounded-full bg-[#f1f8f7] px-2.5 py-1 text-xs font-bold text-[#00796B]">{item[countKey] || 0}</span></li>)}</ol> : <p className="mt-5 rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">{empty}</p>}
    </section>
  );
}

function StatePanel({ children, error, role }) {
  return <div role={role} className={`rounded-2xl border p-8 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-gray-200 bg-white text-gray-500"}`}>{children}</div>;
}

function makeMonthlySeries(stats) {
  if (!stats) return [];
  const userCounts = new Map((stats.monthlyUsers || []).map((item) => [item._id, item.count]));
  const tripCounts = new Map((stats.monthlyTrips || []).map((item) => [item._id, item.count]));
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - (5 - index));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: date.toLocaleDateString(undefined, { month: "short", year: "2-digit", timeZone: "UTC" }),
      users: userCounts.get(key) || 0,
      trips: tripCounts.get(key) || 0,
    };
  });
}
