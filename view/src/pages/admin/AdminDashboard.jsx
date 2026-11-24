import { useEffect, useState } from "react";
import { FiActivity, FiArrowRight, FiMap, FiUserCheck, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";

const cards = [
  ["Total users", "totalUsers", FiUsers],
  ["Organizers", "totalOrganizers", FiUserCheck],
  ["Total trips", "totalTrips", FiMap],
  ["Pending approvals", "pendingTrips", FiActivity],
  ["Active trips", "activeTrips", FiMap],
  ["Pending join requests", "pendingJoinRequests", FiUsers],
];

export default function AdminDashboard() {
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
        if (active) setError(loadError.message || "Unable to load dashboard data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!stats) return <ErrorState message="The server returned an unexpected dashboard response." />;

  return (
    <section className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">Platform overview</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-1px] text-gray-900">Admin dashboard</h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">A live overview of NexTour users, organizers, and trips.</p>
        </div>
        <Link to="/admin/analytics" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#006f68] px-5 text-sm font-bold text-white transition hover:bg-[#005c56]">View analytics<FiArrowRight /></Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, key, Icon]) => (
          <article key={key} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f1f8f7] text-[#00796B]"><Icon size={20} /></span>
            <div><p className="text-sm font-semibold text-gray-500">{label}</p><p className="mt-1 text-2xl font-black text-gray-900">{stats[key] ?? 0}</p></div>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-lg font-black text-gray-900">Recent activity</h2><p className="mt-1 text-sm text-gray-500">Latest user signups and trip submissions.</p></div>
            <FiActivity className="mt-1 text-[#00796B]" />
          </div>
          {stats.recentActivity?.length ? (
            <ol className="mt-5 divide-y divide-gray-100">
              {stats.recentActivity.map((item, index) => (
                <li key={`${item.type}-${item.createdAt}-${index}`} className="flex items-start justify-between gap-4 py-3">
                  <div><p className="text-sm font-semibold text-gray-800">{item.title}</p><p className="mt-1 text-xs text-gray-500">{item.type === "trip" ? `Trip ${item.status || "submitted"}` : "New account"}</p></div>
                  <time className="shrink-0 text-xs text-gray-400">{formatDate(item.createdAt)}</time>
                </li>
              ))}
            </ol>
          ) : <EmptyState text="No recent activity yet." />}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-lg font-black text-gray-900">Popular destinations</h2><p className="mt-1 text-sm text-gray-500">Approved trips by destination.</p></div>
            <FiMap className="mt-1 text-[#00796B]" />
          </div>
          {stats.popularDestinations?.length ? (
            <ol className="mt-5 space-y-4">
              {stats.popularDestinations.map((destination) => (
                <li key={destination._id} className="space-y-1.5">
                  <div className="flex justify-between gap-3 text-sm"><span className="truncate font-semibold text-gray-700">{destination._id || "Unspecified"}</span><span className="font-bold text-gray-900">{destination.trips}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#00796B]" style={{ width: `${barWidth(destination.trips, stats.popularDestinations)}%` }} /></div>
                </li>
              ))}
            </ol>
          ) : <EmptyState text="Approved trips will appear here." />}
          <Link to="/admin/trips" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#00796B] hover:underline">Manage trips<FiArrowRight /></Link>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction to="/admin/users" title="Manage users" detail="Search, edit, and moderate accounts" />
        <QuickAction to="/admin/organizers" title="Review organizers" detail="Approve or reject applications" />
        <QuickAction to="/admin/join-requests" title="Join requests" detail="Review requests across all trips" />
        <QuickAction to="/admin/notifications" title="Send announcement" detail="Notify users or organizers" />
      </div>
    </section>
  );
}

function QuickAction({ to, title, detail }) {
  return <Link to={to} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#00796B]/30"><h2 className="font-bold text-gray-900 group-hover:text-[#00796B]">{title}</h2><p className="mt-1 text-sm text-gray-500">{detail}</p></Link>;
}

function LoadingState() {
  return <div className="rounded-2xl border border-gray-200 bg-white py-20 text-center text-sm font-semibold text-gray-500" role="status">Loading dashboard…</div>;
}

function ErrorState({ message, onRetry }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert">{message}{onRetry && <button type="button" onClick={onRetry} className="ml-3 font-bold underline">Try again</button>}</div>;
}

function EmptyState({ text }) {
  return <p className="mt-6 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">{text}</p>;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "Date unavailable";
}

function barWidth(value, items) {
  const maximum = Math.max(...items.map((item) => item.trips), 1);
  return Math.max(8, (Number(value) / maximum) * 100);
}
