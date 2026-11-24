import { useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiHeart,
  FiMapPin,
  FiStar,
  FiUsers,
} from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { profileService } from "../services/profileService";
import { formatCurrency } from "../utils/formatters";
import { API_BASE_URL } from "../utils/api";

/* ---------- helpers ---------- */

const getOrganizerName = (organizer) => {
  if (typeof organizer === "string") return organizer;
  return (
    organizer?.fullName ||
    organizer?.name ||
    organizer?.username ||
    "NexTour organizer"
  );
};

const getImages = (trip) => {
  const candidates = [
    trip.coverImage,
    ...(Array.isArray(trip.images) ? trip.images : []),
  ];
  const seen = new Set();
  return candidates
    .map((img) => (typeof img === "string" ? img : img?.url))
    .filter((url) => {
      if (typeof url !== "string") return false;
      const trimmed = url.trim();
      if (!trimmed || seen.has(trimmed)) return false;
      seen.add(trimmed);
      return true;
    })
    .map((url) => resolveImageUrl(url));
};

const resolveImageUrl = (value) => {
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("//")) return `${window.location.protocol}${value}`;
  return `${API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

const getDuration = (trip) => {
  if (trip.duration) return String(trip.duration);
  if (!trip.startDate || !trip.endDate) return "";
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return "";
  const days = Math.ceil((end - start) / 86_400_000) + 1;
  return days > 0 ? `${days} day${days > 1 ? "s" : ""}` : "";
};

/* ---------- component ---------- */

export default function ExploreTripCard({ trip, isFavorite = false, onFavoriteChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [activeImage, setActiveImage] = useState(0);
  const [failedImages, setFailedImages] = useState(() => new Set());
  const [organizerAvatarFailed, setOrganizerAvatarFailed] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const images = useMemo(() => getImages(trip), [trip]);
  const availableImages = images
    .map((image, index) => ({ image, index }))
    .filter(({ index }) => !failedImages.has(index));
  const currentImage = availableImages.find(({ index }) => index === activeImage)
    || availableImages[0];
  const organizerName = useMemo(
    () => getOrganizerName(trip.organizer || trip.createdBy || trip.user),
    [trip]
  );
  const destination = useMemo(
    () =>
      [trip.city, trip.state, trip.country || trip.destination]
        .filter(Boolean)
        .filter((p, i, arr) => arr.indexOf(p) === i)
        .join(", "),
    [trip]
  );
  const highlights = useMemo(
    () =>
      [
        trip.transportation,
        trip.hotelPreference && `${trip.hotelPreference} stay`,
        trip.foodPreference && `${trip.foodPreference} food`,
      ].filter(Boolean),
    [trip]
  );
  const duration = useMemo(() => getDuration(trip), [trip]);

  const budget = trip.totalBudget ?? trip.budget ?? trip.price;
  const hasBudget = budget !== undefined && budget !== null && budget !== "";
  const organizerAvatarValue =
    trip.organizer?.profileImage || trip.organizer?.avatar;
  const organizerAvatar = organizerAvatarValue
    ? resolveImageUrl(organizerAvatarValue)
    : "";

  const changeImage = (direction) => {
    if (availableImages.length < 2 || !currentImage) return;
    const currentPosition = availableImages.findIndex(({ index }) => index === currentImage.index);
    const nextPosition = (currentPosition + direction + availableImages.length) % availableImages.length;
    setActiveImage(availableImages[nextPosition].index);
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }
    setFavoriteBusy(true);
    try {
      if (isFavorite) {
        await profileService.removeWishlistItem(trip._id);
        onFavoriteChange?.(trip._id, false);
        toast.success("Removed from your wishlist.");
      } else {
        try {
          await profileService.addWishlistItem(trip._id);
        } catch (error) {
          if (error.status !== 409 || error.message !== "Trip is already in your wishlist.") throw error;
        }
        onFavoriteChange?.(trip._id, true);
        toast.success("Saved to your wishlist.");
      }
    } catch (error) {
      toast.error(error.message || "Unable to update your wishlist.");
    } finally {
      setFavoriteBusy(false);
    }
  };

  const openTripDetails = () => navigate(`/explore/${trip._id}`);
  const handleCardClick = (event) => {
    if (event.target.closest("a, button")) return;
    openTripDetails();
  };
  const handleCardKeyDown = (event) => {
    if (event.target !== event.currentTarget || event.key !== "Enter") return;
    event.preventDefault();
    openTripDetails();
  };

  return (
    <article
      role="group"
      tabIndex={0}
      aria-label={`Trip details: ${trip.title || "Untitled trip"}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="h-full w-full cursor-pointer overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(15,23,42,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
    >
      {/* ---------- image gallery ---------- */}
      <div className="relative h-[220px] overflow-hidden bg-slate-100 2xl:h-[250px]">
        <Link
          to={`/explore/${trip._id}`}
          aria-label={`View ${trip.title || "trip"} details`}
          className="absolute inset-0"
        >
        {currentImage ? (
          <img
            src={currentImage.image}
            alt={`${trip.title || "Trip"} — photo ${currentImage.index + 1}`}
            onError={() => {
              setFailedImages((failed) => new Set(failed).add(currentImage.index));
              const nextImage = availableImages.find(({ index }) => index !== currentImage.index);
              if (nextImage) setActiveImage(nextImage.index);
            }}
            className="h-full w-full object-cover object-center transition duration-500"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            {images.length ? "Trip photos are unavailable" : "No trip photos yet"}
          </div>
        )}
        </Link>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15" />

        {destination && (
          <div className="absolute left-3.5 top-3.5 inline-flex max-w-[75%] items-center gap-1.5 truncate rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
            <FiMapPin size={13} className="shrink-0 text-teal-700" />
            <span className="truncate">{destination}</span>
          </div>
        )}

        {trip.isFeatured && (
          <span className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-sm">
            <FiStar size={13} fill="currentColor" />Featured
          </span>
        )}

        <button
          type="button"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFavorite}
          onClick={toggleFavorite}
          disabled={favoriteBusy}
          className={`absolute right-3.5 top-3.5 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105 disabled:cursor-wait disabled:opacity-60 ${
            isFavorite ? "text-rose-500" : "text-slate-600"
          }`}
        >
          <FiHeart size={17} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        {availableImages.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => changeImage(-1)}
              className="absolute left-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 shadow-sm transition hover:bg-white"
            >
              <FiChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => changeImage(1)}
              className="absolute right-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 shadow-sm transition hover:bg-white"
            >
              <FiChevronRight size={18} />
            </button>

            <div
              className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
              aria-label={`Photo ${availableImages.findIndex(({ index }) => index === currentImage.index) + 1} of ${availableImages.length}`}
            >
              {availableImages.map(({ index }) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentImage.index ? "w-4 bg-white" : "w-1.5 bg-white/65"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---------- body ---------- */}
      <div className="bg-gradient-to-b from-white to-[#f8fbfa] px-3.5 pb-3 pt-2.5">
        {/* organizer */}
        <div className="flex items-center gap-2.5">
          {organizerAvatar && !organizerAvatarFailed ? (
            <img
              src={organizerAvatar}
              alt={organizerName}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm"
              onError={() => setOrganizerAvatarFailed(true)}
            />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">
              {organizerName.charAt(0).toUpperCase()}
            </span>
          )}
          <p className="min-w-0 truncate text-sm text-slate-500">
            With{" "}
            <span className="font-semibold text-slate-800">{organizerName}</span>
          </p>
        </div>

        {/* title */}
        <Link to={`/explore/${trip._id}`} className="mt-1.5 block">
        <h2 className="line-clamp-2 text-[18px] font-bold leading-[1.25] tracking-tight text-slate-900 hover:text-[#00796B]">
          {trip.title || "Untitled trip"}
        </h2>
        </Link>

        {/* description */}
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-[1.2rem] text-slate-600">
          {trip.description?.trim() ||
            "The organizer has not added a trip description yet."}
        </p>

        {/* highlights */}
        {highlights.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {highlights.map((h) => (
              <span
                key={h}
                className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600"
              >
                {h}
              </span>
            ))}
          </div>
        )}

        {/* meta row: duration + travelers */}
        {(duration || trip.maxMembers) && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            {duration && <span>{duration}</span>}
            {trip.maxMembers && (
              <span className="flex items-center gap-1.5">
                <FiUsers size={14} className="text-teal-700" />
                Up to {trip.maxMembers} travelers
              </span>
            )}
          </div>
        )}

        {/* footer: budget + category */}
        <div className="mt-2 flex items-end justify-between border-t border-slate-200/70 pt-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Trip budget
            </p>
            <p className="mt-0.5 text-[20px] font-extrabold tracking-tight text-slate-900">
              {hasBudget
                ? formatCurrency(Number(budget))
                : "Not specified"}
            </p>
          </div>

          {trip.category && (
            <span className="mb-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
              {trip.category}
            </span>
          )}
        </div>
        <Link
          to={`/explore/${trip._id}`}
          className="mt-2 block rounded-lg bg-[#006f68] px-3 py-2 text-center text-xs font-bold text-white transition hover:bg-[#005c56]"
        >
          View trip details
        </Link>
      </div>
    </article>
  );
}