import { Link, useNavigate } from "react-router-dom";
import {
  FiMap,
  FiChevronRight,
  FiMapPin,
  FiArrowUp,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { isVerifiedOrganizer } from "../utils/organizerAccess";
import { toast } from "react-hot-toast";

const Footer = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, logout, user, isAdmin } = useAuth();
  const isOrganizer = isVerifiedOrganizer(user);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Unable to sign out from the footer:", error);
      toast.error(error.message || "Unable to sign out. Please try again.");
    }
  };

  const exploreLinks = [
    { label: "Explore all trips", to: "/explore" },
    { label: "How it works", to: "/how-it-works" },
    { label: "Become a trip leader", to: "/organizer/apply" },
  ];

  const destinationLinks = [
    { label: "Amalfi Coast", search: "Amalfi Coast", color: "#f59e0b" },
    { label: "Japan", search: "Japan", color: "#ec4899" },
    { label: "Patagonia", search: "Patagonia", color: "#10b981" },
    { label: "Iceland", search: "Iceland", color: "#06b6d4" },
    { label: "Serengeti", search: "Serengeti", color: "#8b5cf6" },
  ];

  const accountLinks = isAuthenticated
    ? [
      { label: "My profile", to: "/profile" },
      ...(!isAdmin && !isOrganizer ? [{ label: "Apply to organize", to: "/organizer/apply" }] : []),
      ...(isOrganizer ? [{ label: "Organizer dashboard", to: "/organizer/dashboard" }, { label: "Create a trip", to: "/create-trip" }] : []),
      ...(isAdmin ? [{ label: "Admin dashboard", to: "/admin" }] : []),
    ]
    : [
      { label: "Create an account", to: "/register" },
      { label: "Sign in", to: "/login" },
    ];

  return (
    /* ✅ overflow-visible so the floating arrow can escape the footer bounds */
    <footer className="relative overflow-visible border-t border-gray-100 bg-gradient-to-b from-[#f8faf9] via-white to-[#f0f5f3] text-gray-700">
      {/* Decorative background elements - clipped in their own wrapper */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-[#006f68]/5 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-[#00796B]/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#006f68]/3 to-[#00796B]/3 blur-3xl" />
      </div>

      {/* =========================================================
          BACK TO TOP FLOATING BUTTON
          ✅ Higher z-index, explicit white icon color, no overflow clipping
      ========================================================= */}
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        className="group absolute -top-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#006f68] to-[#00796B] text-white shadow-[0_6px_18px_rgba(0,111,104,0.40)] ring-4 ring-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(0,111,104,0.55)] sm:right-10"
      >
        <FiArrowUp
          size={20}
          strokeWidth={2.5}
          className="text-white transition-transform duration-300 group-hover:-translate-y-0.5"
          style={{ color: "#ffffff" }}
        />
      </button>

      {/* =========================================================
          MAIN CONTAINER
      ========================================================= */}
      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">

        {/* =========================================================
            BRAND COLUMN
        ========================================================= */}
        <div className="flex flex-col gap-4">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-gradient-to-br from-[#006f68] to-[#00796B] shadow-[0_4px_12px_rgba(0,111,104,0.25)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_6px_20px_rgba(0,111,104,0.40)]">
              <FiMap className="text-white text-[22px]" />
            </div>
            <div className="flex items-center leading-none">
              <span className="text-[26px] font-black tracking-[-1.2px] text-gray-900">
                Nex
              </span>
              <span className="text-[26px] font-black tracking-[-1.2px] bg-gradient-to-r from-[#006f68] to-[#00796B] bg-clip-text text-transparent">
                Tour
              </span>
            </div>
          </Link>

          <p className="max-w-[280px] text-sm leading-7 text-gray-500">
            Find thoughtful adventures, meet local trip leaders, and discover your next journey with NexTour.
          </p>
        </div>

        <div>
          <h4 className="relative mb-5 pb-2.5 text-base font-bold tracking-wide text-gray-900 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-9 after:rounded-full after:bg-gradient-to-r after:from-[#006f68] after:to-[#00796B]">
            NexTour
          </h4>
          <ul className="flex flex-col gap-3">
            {exploreLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="group inline-flex items-center gap-2 text-sm text-gray-500 transition-all duration-150 hover:pl-1 hover:text-[#00796B]"
                >
                  <FiChevronRight
                    size={12}
                    className="text-[#00796B] transition-transform duration-150 group-hover:translate-x-0.5"
                  />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="relative mb-5 pb-2.5 text-base font-bold tracking-wide text-gray-900 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-9 after:rounded-full after:bg-gradient-to-r after:from-[#006f68] after:to-[#00796B]">
            Popular searches
          </h4>
          <ul className="flex flex-col gap-3">
            {destinationLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={`/explore?${new URLSearchParams({ search: link.search })}`}
                  className="group inline-flex items-center gap-2 text-sm text-gray-500 transition-all duration-150 hover:pl-1 hover:font-medium hover:text-[#00796B]"
                >
                  <FiMapPin
                    size={13}
                    className="transition-transform duration-200 group-hover:scale-125"
                    style={{ color: link.color }}
                  />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="relative mb-5 pb-2.5 text-base font-bold tracking-wide text-gray-900 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-9 after:rounded-full after:bg-gradient-to-r after:from-[#006f68] after:to-[#00796B]">
            Get started
          </h4>
          <ul className="flex flex-col gap-3">
            {!loading && accountLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="group inline-flex items-center gap-2 text-sm text-gray-500 transition-all duration-150 hover:pl-1 hover:text-[#00796B]"
                >
                  <FiChevronRight
                    size={12}
                    className="text-[#00796B] transition-transform duration-150 group-hover:translate-x-0.5"
                  />
                  {link.label}
                </Link>
              </li>
            ))}
            {!loading && isAuthenticated && (
              <li>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="group inline-flex items-center gap-2 text-sm text-gray-500 transition-all duration-150 hover:pl-1 hover:text-[#00796B]"
                >
                  <FiChevronRight
                    size={12}
                    className="text-[#00796B] transition-transform duration-150 group-hover:translate-x-0.5"
                  />
                  Sign out
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* =========================================================
          BOTTOM BAR
      ========================================================= */}
      <div className="relative z-10 border-t border-gray-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-6 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#006f68] to-[#00796B] text-[8px] font-bold text-white">
              ©
            </span>
            <span>
              {new Date().getFullYear()} NexTour. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;