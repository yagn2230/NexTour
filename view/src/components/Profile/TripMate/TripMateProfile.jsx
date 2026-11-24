import { useState } from "react";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiBell,
  FiBookmark,
  FiCalendar,
  FiCreditCard,
  FiGrid,
  FiHeart,
  FiImage,
  FiInfo,
  FiMapPin,
  FiSettings,
  FiStar,
  FiUsers,
} from "react-icons/fi";
import ProfileStats from "../ProfileStats";
import AboutSection from "../AboutSection";
import ContactInfo from "../ContactInfo";
import SocialLinks from "../SocialLinks";
import TravelPreferences from "../TravelPreferences";
import Gallery from "../Gallery";
import Reviews from "../Reviews";
import Achievements from "../Achievements";
import SettingsCard from "../SettingsCard";
import UpcomingTrips from "./UpcomingTrips";
import JoinedTrips from "./JoinedTrips";
import PreviousTrips from "./PreviousTrips";
import TripHistory from "./TripHistory";
import Wishlist from "./Wishlist";
import FavoriteDestinations from "./FavoriteDestinations";
import Notifications from "../Organizer/Notifications";
import TravelerBookingsPage from "../../../pages/TravelerBookingsPage";

const HASH_SECTIONS = {
  "tripmate-overview": "overview",
  "tripmate-upcoming": "upcoming",
  "tripmate-joined": "joined",
  "tripmate-previous": "previous",
  "tripmate-history": "history",
  "tripmate-bookings": "bookings",
  "tripmate-wishlist": "wishlist",
  "tripmate-favorites": "favorites",
  "profile-notifications": "notifications",
  "tripmate-gallery": "gallery",
  "tripmate-reviews": "reviews",
  "tripmate-achievements": "achievements",
  "tripmate-about": "about",
  "tripmate-settings": "settings",
  "organizer-settings": "settings",
};

export default function TripMateProfile({ user, data, statistics, onWishlistRemove, onGalleryAdd, onNotificationRead, onNotificationDelete, onEditProfile, onPasswordChange }) {
  const initialSection = HASH_SECTIONS[window.location.hash.slice(1)] || "overview";
  const [activeSection, setActiveSection] = useState(initialSection);

  const menuItems = [
    { id: "overview", label: "Overview", Icon: FiGrid },
    { id: "upcoming", label: "Upcoming trips", Icon: FiCalendar },
    { id: "joined", label: "Joined trips", Icon: FiUsers },
    { id: "previous", label: "Previous trips", Icon: FiActivity },
    { id: "history", label: "Trip history", Icon: FiMapPin },
    { id: "bookings", label: "My Bookings", Icon: FiCreditCard },
    { id: "wishlist", label: "Wishlist", Icon: FiBookmark },
    { id: "favorites", label: "Favorite destinations", Icon: FiHeart },
    { id: "notifications", label: "Notifications", Icon: FiBell },
    { id: "gallery", label: "Travel gallery", Icon: FiImage },
    { id: "reviews", label: "Reviews", Icon: FiStar },
    { id: "achievements", label: "Achievements", Icon: FiStar },
    { id: "about", label: "About & contact", Icon: FiInfo },
    { id: "settings", label: "Settings", Icon: FiSettings },
  ];

  const selectSection = (section) => {
    setActiveSection(section);
    window.requestAnimationFrame(() => {
      document.getElementById("tripmate-profile-content")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const content = {
    overview: (
      <div className="space-y-8">
        {Number(statistics.noShowCount || 0) >= 2 && (
          <div role="status" className={`rounded-2xl border p-4 text-sm leading-6 ${user.noShowRestrictedUntil && new Date(user.noShowRestrictedUntil) > new Date() ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            <p className="font-bold">{user.noShowRestrictedUntil && new Date(user.noShowRestrictedUntil) > new Date() ? "Trip requests temporarily restricted" : "Attendance warning"}</p>
            <p className="mt-1">{user.noShowRestrictedUntil && new Date(user.noShowRestrictedUntil) > new Date() ? `You can request to join trips again after ${new Date(user.noShowRestrictedUntil).toLocaleDateString()}.` : "Repeated no-shows can temporarily restrict new trip requests. If a no-show was recorded in error, submit an appeal from My Bookings."}</p>
          </div>
        )}
        <ProfileStats statistics={statistics} />
        <UpcomingTrips trips={data.trips.upcoming} />
      </div>
    ),
    upcoming: <UpcomingTrips trips={data.trips.upcoming} />,
    joined: <JoinedTrips trips={data.trips.joined} />,
    previous: <PreviousTrips trips={data.trips.previous} />,
    history: <TripHistory trips={data.trips.history || []} />,
    bookings: <TravelerBookingsPage embedded />,
    wishlist: <Wishlist destinations={data.wishlist} onRemove={onWishlistRemove} />,
    favorites: data.favoriteDestinations.length > 0
      ? <FavoriteDestinations destinations={data.favoriteDestinations} />
      : <FavoriteDestinations destinations={[]} />,
    notifications: <Notifications notifications={data.notifications} onMarkRead={onNotificationRead} onDelete={onNotificationDelete} />,
    gallery: <Gallery images={data.gallery} onAdd={onGalleryAdd} />,
    reviews: <Reviews reviews={data.reviews} />,
    achievements: data.achievements.length > 0
      ? <Achievements achievements={data.achievements} />
      : <Achievements achievements={[]} />,
    about: (
      <div className="grid gap-8 xl:grid-cols-2">
        <AboutSection bio={user.bio} interests={user.preferences.slice(0, 3)} />
        <ContactInfo location={user.location} email={user.email} phone={user.phone} />
        <SocialLinks links={user.social} />
        <TravelPreferences preferences={user.preferences} />
      </div>
    ),
    settings: <SettingsCard onEditProfile={onEditProfile} onPasswordChange={onPasswordChange} onOpenNotifications={() => selectSection("notifications")} />,
  };

  return (
    <motion.div
      key="traveler-profile"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"
    >
      <aside className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_8px_30px_rgba(15,23,42,0.04)] lg:sticky lg:top-24">
        <p className="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">TripMate menu</p>
        <nav className="flex gap-1 overflow-x-auto pb-1 lg:block lg:max-h-[calc(100vh-8rem)] lg:space-y-1 lg:overflow-y-auto lg:pb-0" aria-label="TripMate profile sections">
          {menuItems.map(({ id, label, Icon }) => {
            const active = activeSection === id;
            const className = `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition lg:w-full ${
              active
                ? "bg-[#00796B] text-white shadow-sm"
                : "text-slate-600 hover:bg-[#f1f8f7] hover:text-[#00796B]"
            }`;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => selectSection(id)}
                className={className}
              >
                <Icon size={17} className="shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main id="tripmate-profile-content" className="min-w-0 scroll-mt-24">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18 }}
        >
          {content[activeSection]}
        </motion.div>
      </main>
    </motion.div>
  );
}
