import { useEffect, useState } from "react";
import { FiArrowLeft, FiCalendar, FiMail, FiMapPin, FiShield, FiUser } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { getTripsFromResponse, getUserEmail, getUserFromResponse, getUserName, getUserRole, getUserStatus } from "../../utils/adminUsers";

export default function UserDetails() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const [userResponse, tripsResponse] = await Promise.all([
          adminService.getUser(userId),
          adminService.getUserTrips(userId),
        ]);
        const loadedUser = getUserFromResponse(userResponse);
        const loadedTrips = getTripsFromResponse(tripsResponse);
        if (!loadedUser || typeof loadedUser !== "object" || Array.isArray(loadedUser)) throw new Error("The server returned an unexpected user response.");
        if (!loadedTrips) throw new Error("The server returned an unexpected trips response.");
        if (active) { setUser(loadedUser); setTrips(loadedTrips.filter(Boolean)); }
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load user details.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadDetails();
    return () => { active = false; };
  }, [userId]);

  if (loading) return <div className="py-20 text-center text-sm font-semibold text-gray-500" role="status">Loading user details…</div>;
  if (error) return <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert"><p>{error}</p><Link to="/admin/users" className="mt-3 inline-flex font-bold underline">Back to users</Link></div>;
  if (!user) return null;

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 transition hover:text-[#00796B]"><FiArrowLeft />Back to users</Link>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f1f8f7] text-2xl font-black text-[#00796B]">{getUserName(user).charAt(0).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#00796B]">User profile</p><h1 className="mt-1 truncate text-3xl font-black tracking-tight text-gray-900">{getUserName(user)}</h1><p className="mt-1 text-sm text-gray-500">{getUserEmail(user)}</p></div>
          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-700">{getUserRole(user)}</span>
        </div>
        <div className="mt-7 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem icon={<FiMail />} label="Email" value={getUserEmail(user)} />
          <DetailItem icon={<FiShield />} label="Role" value={getUserRole(user)} />
          <DetailItem icon={<FiShield />} label="Organizer application" value={user.organizer?.status || "Not applied"} />
          <DetailItem icon={<FiUser />} label="Status" value={getUserStatus(user)} />
          <DetailItem icon={<FiCalendar />} label="Joined" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Not available"} />
          <DetailItem icon={<FiShield />} label="No-show count" value={Number(user.noShowCount || 0)} />
          <DetailItem icon={<FiShield />} label="Trip request restriction" value={user.noShowRestrictedUntil && new Date(user.noShowRestrictedUntil) > new Date() ? `Until ${new Date(user.noShowRestrictedUntil).toLocaleDateString()}` : "Not restricted"} />
        </div>
      </div>
      <div className="space-y-4">
        <div><h2 className="text-xl font-black text-gray-900">User trips</h2><p className="mt-1 text-sm text-gray-500">Trips created by or joined by this user.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Created</p><p className="mt-1 text-2xl font-black text-gray-900">{trips.filter((trip) => trip._adminRelationship === "Created").length}</p></div>
          <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Joined</p><p className="mt-1 text-2xl font-black text-gray-900">{trips.filter((trip) => trip._adminRelationship === "Joined").length}</p></div>
        </div>
        {trips.length ? <div className="grid gap-3 md:grid-cols-2">{trips.map((trip, index) => <article key={`${trip._adminRelationship}-${trip._id || trip.id || index}`} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-gray-900">{trip.title || trip.name || "Untitled trip"}</h3><span className="shrink-0 rounded-full bg-[#f1f8f7] px-2.5 py-1 text-xs font-bold text-[#00796B]">{trip._adminRelationship || "Trip"}</span></div><p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500"><FiMapPin />{trip.destination || trip.location || "Destination not specified"}</p><div className="mt-4 flex items-center justify-between text-xs text-gray-500"><span>{trip.status || "Status unavailable"}</span><span>{trip.startDate ? new Date(trip.startDate).toLocaleDateString() : "Date not set"}</span></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">No trips found for this user.</div>}
      </div>
    </section>
  );
}

function DetailItem({ icon, label, value }) {
  return <div className="min-w-0"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">{icon}{label}</div><p className="mt-1 truncate text-sm font-semibold text-gray-800" title={String(value)}>{value}</p></div>;
}
