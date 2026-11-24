import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCompass,
  FiFacebook,
  FiInstagram,
  FiMapPin,
  FiSearch,
  FiShield,
  FiStar,
  FiUsers,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { tripService } from "../services/tripService";
import { resolveProfileImageUrl } from "./Profile/profileAdapter";
import Footer from "../components/Footer";

const tripCategories = [
  { label: "All adventures", value: "" },
  { label: "Trekking", value: "Trekking" },
  { label: "Wildlife", value: "Wildlife" },
  { label: "Beach", value: "Beach" },
];

const popularSearches = [
  "Amalfi Coast",
  "Cherry Blossom Japan",
  "Patagonia W-Trek",
  "Iceland Aurora",
  "Serengeti Migration",
];

const experiences = [
  {
    category: "Trekking",
    name: "Find your wild",
    detail: "Take the long way to somewhere unforgettable.",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85",
  },
  {
    category: "Beach",
    name: "Follow the coastline",
    detail: "Slow days, salt air, and a new favorite view.",
    image:
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=900&q=85",
  },
  {
    category: "Wildlife",
    name: "Get closer to nature",
    detail: "See the natural world with local guides.",
    image:
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=85",
  },
];

const communityPhotos = [
  {
    image:
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=800&q=85",
    alt: "Traveler enjoying an ocean-side adventure",
  },
  {
    image:
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=85",
    alt: "Friends exploring a turquoise mountain lake",
  },
  {
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=85",
    alt: "Travelers taking in a wide-open landscape",
  },
  {
    image:
      "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=800&q=85",
    alt: "Friends sharing a trip together",
  },
  {
    image:
      "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=800&q=85",
    alt: "A quiet beach discovered along the way",
  },
  {
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=85",
    alt: "A mountain trail winding into the distance",
  },
];

const getTripImages = (trip) =>
  [trip.coverImage, ...(Array.isArray(trip.images) ? trip.images : [])]
    .map((image) => resolveProfileImageUrl(image))
    .filter(Boolean);

const getTripDestination = (trip) =>
  trip.country || trip.city || trip.destination || "";

const getFullTripDestination = (trip) =>
  [trip.city, trip.state, trip.country || trip.destination]
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(", ");

const getOrganizerId = (organizer) =>
  typeof organizer === "object" && organizer
    ? organizer._id || organizer.id || ""
    : organizer || "";

export default function Home() {
  const navigate = useNavigate();
  const leadersRef = useRef(null);
  const [destination, setDestination] = useState("");
  const [category, setCategory] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState("");

  useEffect(() => {
    let active = true;
    tripService
      .getApprovedTrips()
      .then((response) => {
        if (active) setTrips(response.trips || []);
      })
      .catch((error) => {
        if (active) {
          setTripsError(error.message || "Unable to load featured trips.");
        }
      })
      .finally(() => {
        if (active) setTripsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("[data-home-search]")) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const featuredDestinations = useMemo(() => {
    const grouped = new Map();
    trips.forEach((trip) => {
      const name = getTripDestination(trip);
      if (!name) return;
      const current = grouped.get(name) || { destination: name, trips: [], images: [] };
      current.trips.push(trip);
      current.images.push(...getTripImages(trip));
      grouped.set(name, current);
    });
    return [...grouped.values()]
      .map((destinationGroup) => ({
        ...destinationGroup,
        images: [...new Set(destinationGroup.images)].slice(0, 6),
      }))
      .sort((first, second) => second.trips.length - first.trips.length);
  }, [trips]);

  const tripLeaders = useMemo(() => {
    const grouped = new Map();
    trips.forEach((trip) => {
      const organizer = trip.organizer;
      const organizerId = getOrganizerId(organizer);
      if (!organizerId || typeof organizer !== "object") return;
      const current = grouped.get(organizerId) || {
        id: organizerId,
        name: organizer.fullName || organizer.username || "Trip leader",
        image: resolveProfileImageUrl(
          organizer.profileImage || organizer.avatar,
        ),
        username: organizer.username || "",
        rating: Number(organizer.averageRating || 0),
        trips: [],
      };
      current.trips.push(trip);
      grouped.set(organizerId, current);
    });
    return [...grouped.values()].sort(
      (first, second) =>
        second.rating - first.rating || second.trips.length - first.trips.length,
    );
  }, [trips]);

  const featured = featuredDestinations.length
    ? featuredDestinations[featuredIndex % featuredDestinations.length]
    : null;
  const heroImage = featured?.images[0];
  const searchSuggestions = useMemo(() => {
    const query = destination.trim().toLowerCase();
    if (!query) return [];

    const items = [];
    const seen = new Set();
    trips.forEach((trip) => {
      [trip.title, getFullTripDestination(trip), trip.category].filter(Boolean).forEach((label) => {
        const normalized = String(label).trim();
        const key = normalized.toLowerCase();
        if (normalized && key.includes(query) && !seen.has(key)) {
          seen.add(key);
          items.push(normalized);
        }
      });
    });
    return items.slice(0, 6);
  }, [destination, trips]);

  const moveFeatured = (direction) => {
    if (!featuredDestinations.length) return;
    setFeaturedIndex((current) => (
      current + direction + featuredDestinations.length
    ) % featuredDestinations.length);
  };

  const scrollLeaders = (direction) => {
    leadersRef.current?.scrollBy({
      left: direction * leadersRef.current.clientWidth * 0.82,
      behavior: "smooth",
    });
  };

  const exploreTrips = (search = destination, selectedCategory = category) => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (selectedCategory) params.set("category", selectedCategory);
    navigate(`/explore${params.size ? `?${params.toString()}` : ""}`);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setSuggestionsOpen(false);
    exploreTrips();
  };

  const selectSuggestion = (value) => {
    setDestination(value);
    setSuggestionsOpen(false);
    exploreTrips(value);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      <main>
        <section className="px-3 pt-4 sm:px-5 sm:pt-6">
          <div
            className="relative mx-auto flex min-h-[430px] max-w-[1440px] flex-col justify-center overflow-hidden rounded-[24px] bg-cover bg-center px-6 pb-24 pt-12 text-white shadow-[0_24px_55px_rgba(13,34,43,0.18)] sm:min-h-[470px] sm:px-10 sm:pb-28 sm:pt-16 lg:px-12"
            style={{
              backgroundImage:
                `linear-gradient(90deg, rgba(10, 25, 41, .88) 0%, rgba(10, 25, 41, .66) 47%, rgba(10, 25, 41, .12) 100%), linear-gradient(0deg, rgba(10, 25, 41, .24), transparent 60%), url('${heroImage || "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2200&q=90"}')`,
            }}
          >
            <div className="relative z-10 max-w-4xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[10px] font-bold tracking-[0.1em] text-white backdrop-blur-sm sm:text-xs">
                <FiShield className="text-[#71dfce]" />
                TRAVEL THOUGHTFULLY. LEAVE A LIGHTER FOOTPRINT.
              </p>
              <h1 className="mt-5 max-w-4xl text-[2.65rem] font-black leading-[0.99] tracking-[-0.055em] sm:text-[2.75rem] lg:text-[4rem]">
                Extraordinary journeys,
                <br className="hidden sm:block" /> tailored to your{" "}
                <span className="font-medium italic text-[#73e3d2]">
                  wanderlust.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
                Handpicked adventures, local guides, and like-minded travelers.
                Find a journey that stays with you long after you get home.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/90 sm:text-sm">
                <span className="inline-flex items-center gap-2">
                  <FiCompass className="text-[#73e3d2]" /> Curated trips
                </span>
                <span className="hidden text-white/40 sm:inline">•</span>
                <span className="inline-flex items-center gap-2">
                  <FiStar className="text-[#73e3d2]" /> Local experiences
                </span>
                <span className="hidden text-white/40 sm:inline">•</span>
                <span className="inline-flex items-center gap-2">
                  <FiUsers className="text-[#73e3d2]" /> Better together
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-20 mx-auto -mt-14 max-w-[1240px] rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_16px_40px_rgba(21,35,47,0.14)] sm:-mt-16 sm:p-5 lg:px-6 lg:py-5">
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by trip category">
              {tripCategories.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={category === item.value}
                  onClick={() => setCategory(item.value)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                    category === item.value
                      ? "bg-[#006f68] text-white shadow-sm"
                      : "bg-[#f3f5fa] text-gray-600 hover:bg-[#e8f2f0] hover:text-[#006f68]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleSearch}
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
              role="search"
            >
              <div className="relative" data-home-search>
              <label className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-100 bg-[#f8f9fc] px-4 py-3 focus-within:border-[#00796B] focus-within:ring-2 focus-within:ring-[#00796B]/10">
                <FiMapPin className="shrink-0 text-lg text-[#008c80]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                    Where to?
                  </span>
                  <input
                    type="search"
                    aria-label="Search trip destinations"
                    aria-controls="home-search-suggestions"
                    aria-expanded={suggestionsOpen}
                    value={destination}
                    onChange={(event) => {
                      setDestination(event.target.value);
                      setSuggestionsOpen(Boolean(event.target.value.trim()));
                    }}
                    onFocus={() => searchSuggestions.length > 0 && setSuggestionsOpen(true)}
                    placeholder="Try Patagonia, Japan, or anywhere"
                    className="mt-1 w-full bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:font-normal placeholder:text-gray-400"
                  />
                </span>
              </label>
              {suggestionsOpen && searchSuggestions.length > 0 && (
                <div
                  id="home-search-suggestions"
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.16)]"
                >
                  {searchSuggestions.map((suggestion) => (
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
              <button
                type="submit"
                className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-xl bg-[#006f68] px-7 text-sm font-bold text-white shadow-[0_5px_14px_rgba(0,111,104,0.2)] transition hover:-translate-y-0.5 hover:bg-[#005c56] hover:shadow-[0_8px_18px_rgba(0,111,104,0.25)]"
              >
                <FiSearch size={18} />
                Explore trips
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">
                Popular searches
              </span>
              {popularSearches.map((search) => (
                <button
                  key={search}
                  type="button"
                  onClick={() => {
                    setDestination(search);
                    exploreTrips(search);
                  }}
                  className="rounded-full bg-[#f0f2ff] px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-[#e1e6ff] hover:text-[#006f68]"
                >
                  <span className="mr-1.5 text-[#008c80]">•</span>
                  {search}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-8 sm:pt-20 lg:pb-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#00796B]">
                <FiCalendar /> A world of ways to wander
              </p>
              <h2 className="text-3xl font-black tracking-[-0.04em] text-gray-900 sm:text-4xl">
                Find your rhythm
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                From mountain trails to slow days by the sea, your next story
                starts with a single trip.
              </p>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 pb-1 text-sm font-semibold text-[#006f68] transition hover:gap-3"
            >
              View all trips <FiArrowRight />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((experience) => {
              return (
                <button
                  key={experience.category}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/explore?${new URLSearchParams({ category: experience.category })}`,
                    )
                  }
                  className="group relative min-h-[250px] overflow-hidden rounded-2xl bg-slate-200 text-left shadow-[0_8px_24px_rgba(21,35,47,0.1)] transition hover:-translate-y-1 sm:min-h-[290px]"
                  aria-label={`Explore ${experience.category} trips`}
                >
                  <img
                    src={experience.image}
                    alt={`${experience.category} travel scenery`}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#10212b]/85 via-[#10212b]/20 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                    <span className="mb-2 inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] backdrop-blur-sm">
                      {experience.category}
                    </span>
                    <span className="block text-xl font-bold tracking-tight sm:text-2xl">
                      {experience.name}
                    </span>
                    <span className="mt-1 block text-sm text-white/80">
                      {experience.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            {featured ? (
              <>
                <div className="grid h-[430px] grid-cols-3 grid-rows-3 gap-2.5 sm:h-[540px] sm:gap-3">
                  {Array.from({ length: 6 }, (_, index) => {
                    const image = featured.images[index];
                    const tileClass = `h-full w-full rounded-xl object-cover ${
                      index === 0
                        ? "col-start-1 row-start-1"
                        : index === 1
                          ? "col-start-2 row-start-1 row-span-2"
                          : index === 2
                            ? "col-start-3 row-start-1"
                            : index === 3
                              ? "col-start-1 row-start-2 row-span-2"
                              : index === 4
                                ? "col-start-3 row-start-2"
                                : "col-start-2 row-start-3"
                    }`;
                    return image ? (
                      <img
                        key={`${featured.destination}-${image}`}
                        src={image}
                        alt={`${featured.destination} trip`}
                        loading="lazy"
                        className={tileClass}
                      />
                    ) : (
                      <div
                        key={`empty-${index}`}
                        className={`${tileClass} bg-gradient-to-br from-slate-100 to-slate-200`}
                        aria-hidden="true"
                      />
                    );
                  })}
                </div>

                <div className="max-w-xl">
                  <p className="text-sm font-medium text-[#00796B]">
                    Featured destination
                  </p>
                  <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.04em] text-gray-950 sm:text-4xl">
                    Explore {featured.destination} with like-minded people
                  </h2>
                  <p className="mt-5 text-base leading-7 text-slate-600">
                    Browse {featured.trips.length} approved{" "}
                    {featured.trips.length === 1 ? "trip" : "trips"} to{" "}
                    {featured.destination}, created by NexTour trip leaders.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                          `/explore?${new URLSearchParams({ search: featured.destination })}`,
                      )
                    }
                    className="mt-8 inline-flex min-h-14 items-center gap-2 rounded-full bg-[#006f68] px-7 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#005c56]"
                  >
                    Explore {featured.destination} trips <FiArrowRight />
                  </button>
                  <div className="mt-10 flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Previous featured destination"
                      onClick={() => moveFeatured(-1)}
                      disabled={featuredDestinations.length < 2}
                      className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 text-[#006f68] transition hover:border-[#006f68] hover:bg-[#f1f8f7] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FiChevronLeft size={22} />
                    </button>
                    <button
                      type="button"
                      aria-label="Next featured destination"
                      onClick={() => moveFeatured(1)}
                      disabled={featuredDestinations.length < 2}
                      className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 text-[#006f68] transition hover:border-[#006f68] hover:bg-[#f1f8f7] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FiChevronRight size={22} />
                    </button>
                    <span className="ml-2 text-xs font-medium text-slate-400">
                      {featuredIndex + 1} / {featuredDestinations.length}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p
                className="rounded-2xl bg-slate-50 p-8 text-sm text-slate-600 lg:col-span-2"
                role={tripsError ? "alert" : "status"}
              >
                {tripsError ||
                  (tripsLoading
                    ? "Loading featured destinations from approved trips…"
                    : "Featured destinations will appear when approved trips are available.")}
              </p>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#00796B]">
                Some of our favorite trip leaders
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-gray-950 sm:text-4xl">
                Led by people who’ve been there
              </h2>
            </div>
            <div className="hidden gap-3 sm:flex">
              <button
                type="button"
                aria-label="Scroll to previous trip leaders"
                onClick={() => scrollLeaders(-1)}
                className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 text-[#006f68] transition hover:border-[#006f68] hover:bg-[#f1f8f7]"
              >
                <FiChevronLeft size={22} />
              </button>
              <button
                type="button"
                aria-label="Scroll to more trip leaders"
                onClick={() => scrollLeaders(1)}
                className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 text-[#006f68] transition hover:border-[#006f68] hover:bg-[#f1f8f7]"
              >
                <FiChevronRight size={22} />
              </button>
            </div>
          </div>

          <div
            ref={leadersRef}
            className="grid snap-x snap-mandatory grid-flow-col auto-cols-[82%] gap-4 overflow-x-auto scroll-smooth pb-3 sm:auto-cols-[45%] lg:auto-cols-[calc((100%-3rem)/4)]"
            role="region"
            aria-label="Featured trip leaders"
          >
            {tripLeaders.map((leader) => (
              <article
                key={leader.id}
                className="snap-start overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_28px_rgba(21,35,47,0.08)]"
              >
                <div className="relative grid h-[285px] place-items-center overflow-hidden bg-slate-100 sm:h-[340px]">
                  {leader.image ? (
                    <img
                      src={leader.image}
                      alt={leader.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 hover:scale-105"
                    />
                  ) : (
                    <span className="grid h-24 w-24 place-items-center rounded-full bg-[#006f68] text-3xl font-bold text-white">
                      {leader.name
                        .split(/\s+/)
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                  {leader.rating > 0 && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-medium text-slate-500 shadow-sm">
                      <FiStar className="fill-[#00796B] text-[#00796B]" />
                      {leader.rating.toFixed(1)}/5
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 bg-[#fffaf5] px-4 py-4 sm:px-5">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-gray-900">
                      {leader.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {leader.trips.length} public{" "}
                      {leader.trips.length === 1 ? "trip" : "trips"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/explore?${new URLSearchParams({ organizerId: leader.id })}`,
                      )
                    }
                    className="shrink-0 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-[#006f68] shadow-sm transition hover:bg-[#f1f8f7]"
                  >
                    View trips
                  </button>
                </div>
              </article>
            ))}
            {tripLeaders.length === 0 && (
              <p
                className="col-span-full rounded-2xl bg-white p-8 text-sm text-slate-600"
                role={tripsError ? "alert" : "status"}
              >
                {tripsError ||
                  (tripsLoading
                    ? "Loading trip leaders from approved trips…"
                    : "Trip leaders will appear here when they have approved public trips.")}
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-center gap-2 sm:hidden">
            {tripLeaders.map((leader, index) => (
              <button
                key={leader.id}
                type="button"
                aria-label={`Show trip leader ${index + 1}`}
                onClick={() =>
                  leadersRef.current?.children[index]?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "start",
                  })
                }
                className="h-2.5 w-2.5 rounded-full bg-[#006f68]/40 transition hover:bg-[#006f68]"
              />
            ))}
          </div>
        </section>

        <section className="overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="max-w-lg">
              <p className="text-sm font-medium text-[#00796B]">
                Join our travel community
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.045em] text-gray-950 sm:text-5xl">
                Moments from
                <br />
                the road
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Meet the travelers who turn new places into shared stories.
                Find your next crew, swap inspiration, and make more room for
                adventure.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/explore"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#006f68] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#005c56]"
                >
                  <FiInstagram size={18} /> Explore the community
                </Link>
                <Link
                  to="/create-trip"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#006f68] px-6 text-sm font-bold text-[#006f68] transition hover:bg-[#f1f8f7]"
                >
                  <FiFacebook size={18} /> Share your trip
                </Link>
              </div>
            </div>
            {communityPhotos.length ? (
              <div className="grid h-[440px] grid-cols-3 grid-rows-3 gap-2.5 sm:h-[560px] sm:gap-3">
                {communityPhotos.slice(0, 6).map((photo, index) => (
                  <img
                    key={photo.image}
                    src={photo.image}
                    alt={photo.alt}
                    loading="lazy"
                    className={`h-full w-full rounded-xl object-cover ${
                      index === 0
                        ? "col-start-1 row-start-1 row-span-2"
                        : index === 1
                          ? "col-start-2 row-start-1"
                          : index === 2
                            ? "col-start-3 row-start-1"
                            : index === 3
                              ? "col-start-2 row-start-2 row-span-2"
                              : index === 4
                                ? "col-start-1 row-start-3"
                                : "col-start-3 row-start-2 row-span-2"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div
                className="grid min-h-[300px] place-items-center rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-600 lg:min-h-[440px]"
                role={tripsError ? "alert" : "status"}
              >
                {tripsError ||
                  (tripsLoading
                    ? "Loading real moments from NexTour travelers…"
                    : "Traveler photos will appear here as trip members add profile pictures.")}
              </div>
            )}
          </div>

        </section>
      </main>
      <Footer />
    </div>
  );
}
