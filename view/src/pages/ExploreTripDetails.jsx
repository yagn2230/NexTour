import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiFlag,
  FiHeart,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ReportModal from "../components/ReportModal";
import TripItinerary from "../components/admin/trips/TripItinerary";
import RelatedTrips from "../components/trip/RelatedTrips";
import { useAuth } from "../hooks/useAuth";
import { profileService } from "../services/profileService";
import { tripService } from "../services/tripService";
import { API_BASE_URL } from "../utils/api";
import { calculateDuration, formatCurrency, formatDateRange } from "../utils/formatters";

const resolveImageUrl = (image) => {
  const value = typeof image === "string" ? image : image?.url;
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("//")) return `${window.location.protocol}${value}`;
  return `${API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

const getImages = (trip) => [...new Set(
  [trip.coverImage, ...(Array.isArray(trip.images) ? trip.images : [])]
    .map(resolveImageUrl)
    .filter(Boolean)
)];

const getUserId = (user) => (user?._id || user?.id)?.toString() || "";

export default function ExploreTripDetails() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const currentUserId = getUserId(user);
  const [tripPage, setTripPage] = useState({ tripId: null, trip: null, loading: true, error: "" });
  const [activeImage, setActiveImage] = useState("");
  const [requestState, setRequestState] = useState({ tripId: null, userId: null, status: "idle" });
  const [requestError, setRequestError] = useState("");
  const [requestLookup, setRequestLookup] = useState({ tripId: null, userId: null, request: null });
  const [wishlistLookup, setWishlistLookup] = useState({ tripId: null, userId: null, saved: false, error: "" });
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated || !currentUserId) return () => { active = false; };
    profileService.getWishlist()
      .then((response) => {
        if (!active) return;
        const saved = (response.data || []).some(
          (item) => (item._id || item.id)?.toString() === tripId
        );
        setWishlistLookup({ tripId, userId: currentUserId, saved, error: "" });
      })
      .catch((wishlistError) => {
        if (active) {
          setWishlistLookup({
            tripId,
            userId: currentUserId,
            saved: false,
            error: wishlistError.message || "Unable to check your wishlist.",
          });
        }
      });
    return () => { active = false; };
  }, [tripId, isAuthenticated, currentUserId]);

  useEffect(() => {
    let active = true;
    tripService.getTripById(tripId)
      .then((response) => {
        if (!active) return;
        if (!response.trip) throw new Error("The server returned an unexpected trip response.");
        setActiveImage(getImages(response.trip)[0] || "");
        setTripPage({ tripId, trip: response.trip, loading: false, error: "" });
      })
      .catch((loadError) => {
        if (active) {
          setTripPage({
            tripId,
            trip: null,
            loading: false,
            error: loadError.message || "Unable to load trip details.",
          });
        }
      });
    return () => { active = false; };
  }, [tripId]);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) return () => { active = false; };
    tripService.getMyTripRequests()
      .then((response) => {
        if (!active) return;
        const request = (response.data || []).find((item) => item.tripId === tripId || item.tripId?.toString() === tripId);
        setRequestLookup({ tripId, userId: currentUserId, request: request || null });
        setRequestState({ tripId, userId: currentUserId, status: request?.status === "Pending" ? "pending" : "idle" });
      })
      .catch((requestFailure) => {
        if (active) setRequestError(requestFailure.message || "Unable to check your join-request status.");
      });
    return () => { active = false; };
  }, [tripId, isAuthenticated, currentUserId]);

  const loading = tripPage.tripId !== tripId || tripPage.loading;
  const trip = tripPage.tripId === tripId ? tripPage.trip : null;
  const error = tripPage.tripId === tripId ? tripPage.error : "";
  const activeRequest = isAuthenticated
    && requestLookup.tripId === tripId
    && requestLookup.userId === currentUserId
    ? requestLookup.request
    : null;
  const currentRequestState = requestState.tripId === tripId && requestState.userId === currentUserId
    ? requestState.status
    : "idle";
  const wishlistIsCurrent = wishlistLookup.tripId === tripId && wishlistLookup.userId === currentUserId;
  const isWishlisted = isAuthenticated && wishlistIsCurrent && wishlistLookup.saved;
  const wishlistLoading = isAuthenticated && Boolean(currentUserId) && !wishlistIsCurrent;
  const wishlistError = wishlistIsCurrent ? wishlistLookup.error : "";
  const images = useMemo(() => trip ? getImages(trip) : [], [trip]);
  const organizerId = typeof trip?.organizer === "string"
    ? trip.organizer
    : getUserId(trip?.organizer);
  const isOrganizer = Boolean(user && organizerId === getUserId(user));
  const remainingSpots = Math.max(0, Number(trip?.maxMembers || 0) - Number(trip?.currentMembers || 0));
  const destination = [trip?.city, trip?.state, trip?.country]
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(", ") || trip?.destination || "Destination to be announced";

  const requestSpot = async () => {
    setRequestState({ tripId, userId: currentUserId, status: "submitting" });
    setRequestError("");
    try {
      await tripService.requestToJoinTrip(trip._id);
      setRequestState({ tripId, userId: currentUserId, status: "pending" });
    } catch (requestFailure) {
      setRequestError(requestFailure.message || "Unable to request a spot.");
      setRequestState({ tripId, userId: currentUserId, status: "idle" });
    }
  };

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }
    if (favoriteBusy || wishlistLoading) return;
    setFavoriteBusy(true);
    try {
      if (isWishlisted) {
        await profileService.removeWishlistItem(trip._id);
        setWishlistLookup({ tripId, userId: currentUserId, saved: false, error: "" });
        toast.success("Removed from your wishlist.");
      } else {
        try {
          await profileService.addWishlistItem(trip._id);
        } catch (addError) {
          if (addError.status !== 409 || addError.message !== "Trip is already in your wishlist.") throw addError;
        }
        setWishlistLookup({ tripId, userId: currentUserId, saved: true, error: "" });
        toast.success("Saved to your wishlist.");
      }
    } catch (favoriteError) {
      toast.error(favoriteError.message || "Unable to update your wishlist.");
    } finally {
      setFavoriteBusy(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f8faf9]"><Navbar /><main className="mx-auto max-w-7xl px-5 py-16 text-center text-sm font-semibold text-gray-500" role="status">Loading trip details…</main></div>;
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-[#f8faf9]">
        <Navbar />
        <main className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
          <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error || "Trip not found."}</p>
          <Link to="/explore" className="mt-6 inline-flex items-center gap-2 font-bold text-[#00796B] hover:underline"><FiArrowLeft />Back to Explore</Link>
        </main>
      </div>
    );
  }

  const tripDays = calculateDuration(trip.startDate, trip.endDate);
  const organizerName = trip.organizer?.fullName || trip.organizer?.username || "NexTour organizer";

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
        <Link to="/explore" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-[#00796B]">
          <FiArrowLeft />Back to Explore
        </Link>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-7">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-[300px] bg-slate-200 sm:h-[440px]">
                {activeImage ? (
                  <img src={activeImage} alt={trip.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-sm font-medium text-slate-500">No trip photos available</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
                  {trip.category && <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-200">{trip.category}</p>}
                  <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">{trip.title}</h1>
                  <p className="mt-3 flex items-center gap-2 text-sm font-medium text-white/90 sm:text-base"><FiMapPin />{destination}</p>
                </div>
              </div>
              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto p-4">
                  {images.map((image, index) => (
                    <button
                      type="button"
                      key={image}
                      onClick={() => setActiveImage(image)}
                      aria-label={`Show trip photo ${index + 1}`}
                      aria-pressed={activeImage === image}
                      className={`h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition ${activeImage === image ? "border-[#00796B]" : "border-transparent opacity-75 hover:opacity-100"}`}
                    >
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <h2 className="text-xl font-black text-slate-900">About this trip</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {trip.description?.trim() || "The organizer has not added a trip description yet."}
              </p>
              {Array.isArray(trip.famousPlaces) && trip.famousPlaces.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-slate-900">Places on the route</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {trip.famousPlaces.map((place) => <span key={place} className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">{place}</span>)}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00796B]">The plan</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">Trip itinerary</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{trip.itinerary?.length || 0} days planned</span>
              </div>
              <TripItinerary days={Array.isArray(trip.itinerary) ? trip.itinerary : []} />
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Estimated trip budget</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">{formatCurrency(Number(trip.totalBudget || 0))}</p>
                  {trip.pricePerPerson != null && <p className="mt-1 text-sm font-semibold text-slate-600">{formatCurrency(Number(trip.pricePerPerson))} per person</p>}
                </div>
                <button
                  type="button"
                  onClick={toggleWishlist}
                  disabled={favoriteBusy || wishlistLoading}
                  aria-label={isWishlisted ? "Remove trip from wishlist" : "Add trip to wishlist"}
                  aria-pressed={isWishlisted}
                  title={!isAuthenticated ? "Sign in to save this trip" : isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition hover:scale-105 disabled:cursor-wait disabled:opacity-60 ${isWishlisted ? "bg-rose-50 text-rose-600" : "bg-teal-50 text-[#00796B]"}`}
                >
                  <FiHeart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                </button>
              </div>
              {wishlistError && <p role="status" className="mt-2 text-xs text-amber-700">{wishlistError} You can still try saving this trip.</p>}
              <div className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-5">
                <TripFact icon={<FiCalendar />} label="Dates" value={formatDateRange(trip.startDate, trip.endDate)} />
                <TripFact icon={<FiClock />} label="Duration" value={`${tripDays} day${tripDays === 1 ? "" : "s"}`} />
                <TripFact icon={<FiUsers />} label="Group size" value={`${trip.currentMembers || 0} / ${trip.maxMembers || "—"} travelers`} />
                <TripFact icon={<FiMapPin />} label="Spots left" value={trip.maxMembers ? String(remainingSpots) : "Not specified"} />
              </div>
              {isAuthenticated ? (
                isOrganizer ? (
                  <p className="mt-5 rounded-xl bg-slate-50 p-3 text-center text-sm font-semibold text-slate-600">You’re organizing this trip.</p>
                ) : activeRequest?.status === "Accepted" ? (
                  <Link to="/bookings" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800"><FiCheck />Request accepted · View booking</Link>
                ) : currentRequestState === "pending" ? (
                  <Link to="/my-requests" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-teal-50 p-3 text-sm font-bold text-teal-800"><FiCheck />Request pending · Track status</Link>
                ) : remainingSpots === 0 || trip.status !== "Open" ? (
                  <p className="mt-5 rounded-xl bg-slate-50 p-3 text-center text-sm font-semibold text-slate-600">This trip is not accepting requests right now.</p>
                ) : (
                  <button type="button" onClick={requestSpot} disabled={currentRequestState === "submitting"} className="mt-5 w-full rounded-xl bg-[#006f68] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#005c56] disabled:cursor-wait disabled:opacity-60">
                    {currentRequestState === "submitting" ? "Sending request…" : "Request to join"}
                  </button>
                )
              ) : (
                <Link to="/login" state={{ from: location }} className="mt-5 block w-full rounded-xl bg-[#006f68] px-5 py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#005c56]">Sign in to request a spot</Link>
              )}
              {requestError && <p role="alert" className="mt-3 text-sm text-red-700">{requestError}</p>}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Trip organizer</p>
              <div className="mt-4 flex items-center gap-3">
                {trip.organizer?.profileImage ? (
                  <img src={resolveImageUrl(trip.organizer.profileImage)} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-teal-50 text-lg font-black text-[#00796B]">{organizerName.charAt(0).toUpperCase()}</span>
                )}
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-slate-900">{organizerName}</h2>
                  {trip.organizer?.averageRating != null && <p className="mt-1 text-xs text-slate-500">★ {Number(trip.organizer.averageRating).toFixed(1)} organizer rating</p>}
                </div>
              </div>
            </section>

            {isAuthenticated && !isOrganizer && activeRequest?.status === "Accepted" && (
              <section className="space-y-2" aria-label="Report this joined trip or organizer">
                <button type="button" onClick={() => setReportTarget({ type: "Trip", id: trip._id, label: "trip and organizer" })} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50">
                  <FiFlag />Report trip and organizer
                </button>
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-bold text-slate-900">Travel preferences</h2>
              <div className="mt-4 space-y-3 text-sm">
                <Preference label="Transport" value={trip.transportation} />
                <Preference label="Accommodation" value={trip.hotelPreference} />
                <Preference label="Food" value={trip.foodPreference} />
                {trip.activityPreference && <Preference label="Activities" value={trip.activityPreference} />}
              </div>
            </section>
          </aside>
        </div>
        <RelatedTrips key={tripId} tripId={tripId} />
      </main>
      {reportTarget && (
        <ReportModal
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetLabel={reportTarget.label}
          contextTripId={trip._id}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}

function TripFact({ icon, label, value }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">{icon}{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Preference({ label, value }) {
  if (!value) return null;
  return <p className="flex justify-between gap-3"><span className="text-slate-500">{label}</span><span className="text-right font-semibold text-slate-800">{value}</span></p>;
}
