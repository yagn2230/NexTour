import { useEffect, useState } from "react";
import { FiFlag, FiMapPin, FiStar } from "react-icons/fi";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ReportModal from "../components/ReportModal";
import ReviewCard from "../components/Profile/Common/ReviewCard";
import { useAuth } from "../hooks/useAuth";
import { profileService } from "../services/profileService";
import { resolveProfileImageUrl } from "./Profile/profileAdapter";

export default function PublicTravelerProfile() {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [reportTarget, setReportTarget] = useState(null);
  const [result, setResult] = useState({ identifier: "", profile: null, error: "" });

  useEffect(() => {
    let active = true;
    profileService.getPublicProfile(identifier)
      .then((response) => {
        if (active) setResult({ identifier, profile: response.data || null, error: "" });
      })
      .catch((loadError) => {
        if (active) setResult({ identifier, profile: null, error: loadError.message || "Unable to load this profile." });
      });
    return () => { active = false; };
  }, [identifier]);

  const loading = result.identifier !== identifier;
  const profile = loading ? null : result.profile;
  const error = loading ? "" : result.error;
  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-9 sm:px-8">
        <Link to="/organizer/dashboard" className="inline-flex text-sm font-bold text-teal-800 hover:underline">Back to organizer dashboard</Link>
        {loading && <p role="status" className="rounded-2xl bg-white p-10 text-center text-sm font-semibold text-slate-500">Loading traveler profile…</p>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {!loading && !error && profile && (
          <>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="h-44 bg-gradient-to-br from-teal-100 to-slate-100 sm:h-56">
                {profile.coverImage && <img src={resolveProfileImageUrl(profile.coverImage)} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="p-5 sm:p-8">
                <div className="-mt-16 flex flex-wrap items-end gap-4">
                  {profile.profileImage
                    ? <img src={resolveProfileImageUrl(profile.profileImage)} alt="" className="h-24 w-24 rounded-2xl border-4 border-white bg-white object-cover" />
                    : <span className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-white bg-teal-50 text-3xl font-black text-teal-800">{(profile.fullName || "T").slice(0, 1).toUpperCase()}</span>}
                  <div className="pb-1"><h1 className="text-2xl font-black text-slate-900">{profile.fullName}</h1>{profile.username && <p className="text-sm text-slate-500">@{profile.username}</p>}</div>
                </div>
                {profile.bio && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">{profile.bio}</p>}
                {profile.location && <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><FiMapPin />{profile.location}</p>}
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><strong className="block text-xl text-slate-900">{profile.totalTripsCreated || 0}</strong>Trips organized</p>
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><strong className="block text-xl text-slate-900">{profile.totalTripsJoined || 0}</strong>Trips joined</p>
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><strong className="flex items-center gap-1 text-xl text-slate-900"><FiStar className="text-amber-500" />{Number(profile.averageRating || 0).toFixed(1)}</strong>{profile.reviewsCount || 0} reviews</p>
                </div>
                {isAuthenticated && (profile._id || profile.id)?.toString() !== (user?._id || user?.id)?.toString() && (
                  <button type="button" onClick={() => setReportTarget({ type: "User", id: profile._id || profile.id, label: "profile" })} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"><FiFlag />Report this profile</button>
                )}
                {!isAuthenticated && <button type="button" onClick={() => navigate("/login", { state: { from: location } })} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"><FiFlag />Sign in to report</button>}
              </div>
            </section>
            <section className="space-y-4">
              <h2 className="text-xl font-black text-slate-900">Recent reviews</h2>
              {profile.reviews?.length ? <div className="grid gap-4 md:grid-cols-2">{profile.reviews.slice(0, 8).map((review) => (
                <article key={review._id} className="rounded-2xl">
                  <ReviewCard review={{ ...review, id: review._id, name: review.reviewer?.fullName || "Traveler", avatar: resolveProfileImageUrl(review.reviewer?.profileImage), date: review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "", text: review.comment || "", trip: review.trip?.title || "" }} />
                  {isAuthenticated && <button type="button" onClick={() => setReportTarget({ type: "Review", id: review._id, label: "review" })} className="mt-2 inline-flex items-center gap-1.5 px-2 text-xs font-bold text-red-700 hover:underline"><FiFlag />Report review</button>}
                </article>
              ))}</div> : <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No reviews have been shared yet.</p>}
            </section>
            {reportTarget && <ReportModal targetType={reportTarget.type} targetId={reportTarget.id} targetLabel={reportTarget.label} onClose={() => setReportTarget(null)} />}
          </>
        )}
      </main>
    </div>
  );
}
