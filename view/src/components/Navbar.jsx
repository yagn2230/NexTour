import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiMap,
  FiSearch,
  FiUser,
  FiArrowRight,
  FiLogOut,
  FiChevronDown,
  FiGlobe,
  FiCalendar,
  FiMessageCircle,
  FiSend,
  FiUsers,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE_URL } from "../utils/api.js";
import { isVerifiedOrganizer } from "../utils/organizerAccess";
import { tripService } from "../services/tripService";
import { toast } from "react-hot-toast";

const destinationGroups = [
  { title: "Africa", countries: ["South Africa", "Morocco", "Egypt", "Tanzania"] },
  { title: "Asia", countries: ["Thailand", "Japan", "Indonesia", "India"] },
  { title: "Europe", countries: ["Iceland", "Italy", "Spain", "Portugal", "Greece"] },
  { title: "Americas", countries: ["Canada", "United States", "Mexico", "Brazil", "Peru", "Colombia"] },
  { title: "Oceania", countries: ["Australia", "New Zealand"] },
];

const indiaRegions = ["North", "South", "North East", "West"];

const destinationPath = (params) => `/explore?${new URLSearchParams(params).toString()}`;

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, isAdmin } = useAuth();
  const isOrganizer = isVerifiedOrganizer(user);
  const [searchDraft, setSearchDraft] = useState(() => ({
    source: location.search,
    value: new URLSearchParams(location.search).get("search") || "",
  }));
  const searchTerm = searchDraft.source === location.search
    ? searchDraft.value
    : new URLSearchParams(location.search).get("search") || "";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [destinationsOpen, setDestinationsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    const value = searchTerm.trim();
    if (!value) {
      return undefined;
    }

    let active = true;
    const timeoutId = window.setTimeout(() => {
      tripService.getApprovedTrips({ search: value })
        .then((response) => {
          if (!active) return;
          const query = value.toLowerCase();
          const items = [];
          const seen = new Set();

          (response.trips || []).forEach((trip) => {
            const destination = [
              trip.city,
              trip.state,
              trip.country || trip.destination,
            ].filter(Boolean).filter((part, index, parts) => parts.indexOf(part) === index).join(", ");

            [trip.title, destination, trip.category].filter(Boolean).forEach((label) => {
              const normalized = String(label).trim();
              if (
                normalized &&
                normalized.toLowerCase().includes(query) &&
                !seen.has(normalized.toLowerCase())
              ) {
                seen.add(normalized.toLowerCase());
                items.push(normalized);
              }
            });
          });

          setSuggestions(items.slice(0, 6));
          setSuggestionsOpen(items.length > 0);
        })
        .catch(() => {
          if (active) {
            setSuggestions([]);
            setSuggestionsOpen(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  const submitSearch = (event) => {
    event.preventDefault();
    const params = location.pathname.startsWith("/explore")
      ? new URLSearchParams(location.search)
      : new URLSearchParams();
    const value = searchTerm.trim();
    if (value) params.set("search", value);
    else params.delete("search");
    const query = params.toString();
    navigate(`/explore${query ? `?${query}` : ""}`);
    setMobileSearchOpen(false);
    setSuggestionsOpen(false);
  };

  const selectSuggestion = (value) => {
    setSearchDraft({ source: location.search, value });
    setSuggestionsOpen(false);
    const params = location.pathname.startsWith("/explore")
      ? new URLSearchParams(location.search)
      : new URLSearchParams();
    params.set("search", value);
    navigate(`/explore?${params.toString()}`);
    setMobileSearchOpen(false);
  };

  const updateSearchDraft = (value) => {
    setSearchDraft({ source: location.search, value });
    if (!value.trim()) {
      setSuggestions([]);
      setSuggestionsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("[data-user-menu]")) {
        setDropdownOpen(false);
      }
      if (!e.target.closest("[data-destination-menu]")) {
        setDestinationsOpen(false);
      }
      if (!e.target.closest("[data-mobile-search]")) {
        setMobileSearchOpen(false);
      }
      if (!e.target.closest("[data-search-menu]")) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------- Sign In / Sign Out ---------- */
  const handleSignIn = () => {
    navigate("/login");
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setDropdownOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error(error.message || "Unable to sign out. Please try again.");
    }
  };

  const displayName =
    user?.fullName ||
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "User";

  const firstName = displayName.split(" ")[0];

  const userInitials =
    user?.initials ||
    displayName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    "U";
  const profileImage = user?.profileImage
    ? /^(https?:|data:|blob:)/i.test(user.profileImage)
      ? user.profileImage
      : `${API_BASE_URL}${user.profileImage.startsWith("/") ? user.profileImage : `/${user.profileImage}`}`
    : "";

  /* ---------- Nav Links ---------- */
  const navLinks = [
    { label: "Explore", path: "/explore" },
    { label: "How it works", path: "/how-it-works" },
  ];

  const isActive = (path) => {
    if (location.pathname === path) return true;
    if (path !== "/" && location.pathname.startsWith(path + "/")) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">

        {/* ---------- Logo ---------- */}
        <Link to="/" className="group flex shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-gradient-to-br from-[#006f68] to-[#00796B] shadow-[0_4px_12px_rgba(0,111,104,0.25)] transition-transform duration-200 group-hover:scale-105">
            <FiMap className="text-[22px] text-white" />
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

        {/* ---------- Nav Links ---------- */}
        <nav className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.label}
                to={link.path}
                className={`relative py-2 text-[15px] font-semibold transition-colors duration-200 ${
                  active
                    ? "text-[#006f68]"
                    : "text-gray-600 hover:text-[#006f68]"
                }`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-0.5 left-0 h-[2.5px] rounded-full bg-[#006f68] transition-all duration-300 ${
                    active ? "w-full opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </Link>
            );
          })}
          <div
            data-destination-menu
            className="relative"
          >
            <button
              type="button"
              aria-expanded={destinationsOpen}
              aria-controls="destination-mega-menu"
              onClick={() => setDestinationsOpen((open) => !open)}
              className={`relative py-2 text-[15px] font-semibold transition-colors duration-200 ${
                destinationsOpen || location.pathname === "/destination"
                  ? "text-[#006f68]"
                  : "text-gray-600 hover:text-[#006f68]"
              }`}
            >
              Destination
              <span className={`absolute -bottom-0.5 left-0 h-[2.5px] rounded-full bg-[#006f68] transition-all duration-300 ${destinationsOpen ? "w-full opacity-100" : "w-0 opacity-0"}`} />
            </button>
            {destinationsOpen && (
              <div
                id="destination-mega-menu"
                className="fixed left-1/2 top-[76px] z-50 w-[min(1100px,calc(100vw-24px))] -translate-x-1/2 rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-8"
              >
                <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-0 lg:gap-y-0">
                  {destinationGroups.map((group) => (
                    <section key={group.title} className="flex min-h-56 flex-col border-gray-200 lg:border-r lg:px-5 first:lg:pl-2 last:lg:border-r-0">
                      <h2 className="mb-4 text-base font-bold text-gray-900">{group.title}</h2>
                      <ul className="space-y-2.5">
                        {group.countries.map((country) => (
                          <li key={country}>
                            <Link
                              to={destinationPath({ country })}
                              onClick={() => setDestinationsOpen(false)}
                              className="text-sm text-gray-700 transition-colors hover:text-[#00796B]"
                            >
                              {country}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to={destinationPath({ region: group.title })}
                        onClick={() => setDestinationsOpen(false)}
                        className="mt-auto pt-5 text-sm font-semibold text-gray-800 hover:text-[#00796B]"
                      >
                        All trips to {group.title}
                      </Link>
                    </section>
                  ))}
                  <section className="flex min-h-56 flex-col lg:px-5 lg:pr-2">
                    <h2 className="mb-4 text-base font-bold text-gray-900">Highlights</h2>
                    <div className="mb-4 rounded-xl bg-[#f1f8f7] p-3">
                      <Link
                        to={destinationPath({ country: "India" })}
                        onClick={() => setDestinationsOpen(false)}
                        className="text-sm font-bold text-[#00796B] hover:underline"
                      >
                        India
                      </Link>
                      <ul className="mt-2 space-y-2 border-l border-[#00796B]/20 pl-3">
                        {indiaRegions.map((region) => (
                          <li key={region}>
                            <Link
                              to={destinationPath({ country: "India", indiaRegion: region })}
                              onClick={() => setDestinationsOpen(false)}
                              className="text-sm text-gray-700 transition-colors hover:text-[#00796B]"
                            >
                              {region}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <ul className="space-y-2.5">
                      <li><Link to={destinationPath({ country: "Iceland" })} onClick={() => setDestinationsOpen(false)} className="text-sm text-gray-700 hover:text-[#00796B]">Iceland</Link></li>
                      <li><Link to={destinationPath({ country: "Japan" })} onClick={() => setDestinationsOpen(false)} className="text-sm text-gray-700 hover:text-[#00796B]">Japan</Link></li>
                      <li><Link to={destinationPath({ category: "Beach" })} onClick={() => setDestinationsOpen(false)} className="text-sm text-gray-700 hover:text-[#00796B]">On the beach</Link></li>
                    </ul>
                  </section>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* ---------- Right Side ---------- */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-destination-menu
            aria-label="Browse destinations"
            aria-expanded={destinationsOpen}
            aria-controls="mobile-destination-menu"
            onClick={() => setDestinationsOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:border-[#00796B] hover:text-[#00796B] md:hidden"
          >
            <FiGlobe size={19} />
          </button>

          {/* Search */}
          <div className="relative hidden lg:block" data-search-menu>
            <form onSubmit={submitSearch} role="search" className="flex h-[46px] w-[220px] items-center gap-2.5 rounded-full border border-gray-200 bg-white px-4 shadow-[0_2px_6px_rgba(0,0,0,0.03)] transition-all duration-200 focus-within:border-[#00796B] focus-within:ring-4 focus-within:ring-[#00796B]/10">
              <FiSearch className="shrink-0 text-[17px] text-gray-400" />
              <input
                type="search"
                aria-label="Search trips"
                aria-controls="desktop-search-suggestions"
                aria-expanded={suggestionsOpen}
                placeholder="Search trips..."
                value={searchTerm}
                onChange={(event) => updateSearchDraft(event.target.value)}
                onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
              <button type="submit" className="sr-only">Search</button>
            </form>
            {suggestionsOpen && (
              <div id="desktop-search-suggestions" role="listbox" className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.16)]">
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    role="option"
                    key={suggestion}
                    onClick={() => selectSuggestion(suggestion)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-[#f1f8f7] hover:text-[#00796B]"
                  >
                    <FiSearch className="shrink-0 text-gray-400" size={14} />
                    <span className="truncate">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative lg:hidden" data-mobile-search>
            <button
              type="button"
              aria-label="Search trips"
              aria-expanded={mobileSearchOpen}
              onClick={() => setMobileSearchOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:border-[#00796B] hover:text-[#00796B]"
            >
              <FiSearch size={18} />
            </button>
            {mobileSearchOpen && (
              <form onSubmit={submitSearch} role="search" data-search-menu className="absolute right-0 top-[calc(100%+14px)] z-50 flex w-[min(90vw,360px)] items-center gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
                <FiSearch className="shrink-0 text-gray-400" />
                <input
                  type="search"
                  aria-label="Search trips"
                  aria-controls="mobile-search-suggestions"
                  aria-expanded={suggestionsOpen}
                  placeholder="Search trips or destinations"
                  value={searchTerm}
                  onChange={(event) => updateSearchDraft(event.target.value)}
                  onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                  className="min-w-0 flex-1 text-sm outline-none"
                  autoFocus
                />
                <button type="submit" className="rounded-lg bg-[#006f68] px-3 py-2 text-xs font-bold text-white">Search</button>
                {suggestionsOpen && (
                  <div id="mobile-search-suggestions" role="listbox" className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.16)]">
                    {suggestions.map((suggestion) => (
                      <button
                        type="button"
                        role="option"
                        key={suggestion}
                        onClick={() => selectSuggestion(suggestion)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-[#f1f8f7] hover:text-[#00796B]"
                      >
                        <FiSearch className="shrink-0 text-gray-400" size={14} />
                        <span className="truncate">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            )}
          </div>

          {!isAdmin && (
            <Link
              to={isOrganizer ? "/create-trip" : "/organizer/apply"}
              className="group flex h-[46px] items-center gap-2 rounded-full bg-gradient-to-r from-[#006f68] to-[#00796B] px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(0,111,104,0.30)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_8px_22px_rgba(0,111,104,0.45)]"
            >
              {isOrganizer ? "Plan Trip" : "Become an organizer"}
              <FiArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          )}

          {/* =========================================================
              ✅ AUTH AREA: Sign In  OR  User Menu (Sign Out)
          ========================================================= */}
          {!user ? (
            /* ---------- Logged OUT: Sign In button ---------- */
            <button
              type="button"
              onClick={handleSignIn}
              className="hidden h-[46px] items-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 shadow-[0_2px_6px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#006f68] hover:text-[#006f68] hover:shadow-[0_6px_16px_rgba(0,111,104,0.15)] sm:flex"
            >
              <FiUser size={16} />
              Sign In
            </button>
          ) : (
            /* ---------- Logged IN: Avatar + dropdown with Sign Out ---------- */
            <div className="relative" data-user-menu>
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex h-[46px] items-center gap-2.5 rounded-full border border-gray-200 bg-white pl-1.5 pr-4 shadow-[0_2px_6px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#006f68] hover:shadow-[0_6px_16px_rgba(0,111,104,0.15)]"
              >
                {/* Avatar */}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#006f68] to-[#00796B] text-[13px] font-bold text-white">
                  {profileImage ? (
                  <img src={profileImage} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : userInitials}
                </span>

                {/* Name (hidden on mobile) */}
                <span className="hidden text-sm font-semibold text-gray-700 md:inline">
                  {firstName}
                </span>

                <FiChevronDown
                  size={15}
                  className={`text-gray-400 transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-60 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User info header */}
                  <div className="border-b border-gray-100 bg-gradient-to-br from-[#f8faf9] to-[#f0f5f3] px-4 py-3">
                    <p className="text-sm font-bold text-gray-900">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {user.email || "User Account"}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-[#f0f5f3] hover:text-[#006f68]"
                    >
                      <FiUser size={15} />
                      My Profile
                    </Link>
                    {!isAdmin && (
                      <Link
                        to="/my-requests"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-[#f0f5f3] hover:text-[#006f68]"
                      >
                        <FiSend size={15} />
                        My join requests
                      </Link>
                    )}
                    {!isAdmin && (
                      <Link
                        to="/bookings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-[#f0f5f3] hover:text-[#006f68]"
                      >
                        <FiCalendar size={15} />
                        My bookings
                      </Link>
                    )}
                    <Link
                      to="/chats"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-[#f0f5f3] hover:text-[#006f68]"
                    >
                      <FiMessageCircle size={15} />
                      Private trip chats
                    </Link>
                    {!isAdmin && (isOrganizer ? (
                      <Link
                        to="/organizer/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-[#f0f5f3] hover:text-[#006f68]"
                      >
                        <FiUsers size={15} />
                        Organizer dashboard
                      </Link>
                    ) : (
                      <Link
                        to="/organizer/apply"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-[#f0f5f3] hover:text-[#006f68]"
                      >
                        <FiUsers size={15} />
                        Organizer application
                      </Link>
                    ))}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-[#f0f5f3] hover:text-[#006f68]"
                      >
                        <FiMap size={15} />
                        Admin dashboard
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
                    >
                      <FiLogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

    
        </div>
      </div>
      {destinationsOpen && (
        <div
          id="mobile-destination-menu"
          data-destination-menu
          className="fixed inset-x-3 top-[76px] z-50 max-h-[calc(100vh-88px)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] md:hidden"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Browse destinations</h2>
            <Link
              to="/explore"
              onClick={() => setDestinationsOpen(false)}
              className="text-sm font-semibold text-[#00796B]"
            >
              All trips
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {destinationGroups.map((group) => (
              <section key={group.title} className="border-b border-gray-100 pb-4 last:border-0">
                <h3 className="mb-2 text-sm font-bold text-gray-900">{group.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {group.countries.map((country) => (
                    <Link
                      key={country}
                      to={destinationPath({ country })}
                      onClick={() => setDestinationsOpen(false)}
                      className="rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-700 hover:bg-[#f1f8f7] hover:text-[#00796B]"
                    >
                      {country}
                    </Link>
                  ))}
                </div>
                <Link
                  to={destinationPath({ region: group.title })}
                  onClick={() => setDestinationsOpen(false)}
                  className="mt-3 inline-block text-sm font-semibold text-[#00796B]"
                >
                  All trips to {group.title}
                </Link>
              </section>
            ))}
            <section>
              <h3 className="mb-2 text-sm font-bold text-gray-900">Highlights</h3>
              <div className="mb-3 rounded-xl bg-[#f1f8f7] p-3">
                <Link
                  to={destinationPath({ country: "India" })}
                  onClick={() => setDestinationsOpen(false)}
                  className="text-sm font-bold text-[#00796B]"
                >
                  India
                </Link>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {indiaRegions.map((region) => (
                    <Link
                      key={region}
                      to={destinationPath({ country: "India", indiaRegion: region })}
                      onClick={() => setDestinationsOpen(false)}
                      className="rounded-lg bg-white px-3 py-2 text-sm text-gray-700 hover:text-[#00796B]"
                    >
                      {region}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={destinationPath({ country: "Iceland" })} onClick={() => setDestinationsOpen(false)} className="rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-700">Iceland</Link>
                <Link to={destinationPath({ country: "Japan" })} onClick={() => setDestinationsOpen(false)} className="rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-700">Japan</Link>
                <Link to={destinationPath({ category: "Beach" })} onClick={() => setDestinationsOpen(false)} className="rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-700">On the beach</Link>
              </div>
            </section>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;