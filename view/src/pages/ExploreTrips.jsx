import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ExploreTripCard from "../components/ExploreTripCard";
import { useAuth } from "../hooks/useAuth";
import { profileService } from "../services/profileService";
import { platformService } from "../services/platformService";
import { tripService } from "../services/tripService";
import { DEFAULT_TRIP_CATEGORIES } from "../constants/tripCategories";
const regions = ["Africa", "Asia", "Europe", "Americas", "Oceania"];
const transportations = ["Car", "Bus", "Train", "Flight", "Bike", "Other"];
const filterKeys = [
  "country", "region", "indiaRegion", "category", "organizerId", "departureMonth",
  "organizerLanguage", "minBudget", "maxBudget", "minDurationDays", "maxDurationDays",
  "transportation",
];
const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#00796B]";

export default function ExploreTrips() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_TRIP_CATEGORIES);
  const [categoryError, setCategoryError] = useState("");
  const [wishlist, setWishlist] = useState({ userId: null, tripIds: [] });
  const [sortPanelOpen, setSortPanelOpen] = useState(false);
  const searchString = searchParams.toString();
  const [filterDraft, setFilterDraft] = useState(() => ({
    source: searchString,
    values: Object.fromEntries(filterKeys.map((key) => [key, searchParams.get(key) || ""])),
  }));
  const [loadedKey, setLoadedKey] = useState(null);
  const [loadError, setLoadError] = useState({ key: null, message: "" });

  useEffect(() => {
    let active = true;
    platformService.getSettings()
      .then((response) => {
        const values = response.data?.tripCategories;
        if (!Array.isArray(values) || !values.length) throw new Error("The server returned an invalid trip categories list.");
        if (active) {
          setCategories(values);
          setCategoryError("");
        }
      })
      .catch((error) => {
        if (active) setCategoryError(error.message || "Unable to load current trip categories.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!sortPanelOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSortPanelOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [sortPanelOpen]);

  const search = searchParams.get("search") || "";
  const selectedSort = searchParams.get("sort") || "newest";
  const selectedCountry = searchParams.get("country") || "";
  const selectedRegion = searchParams.get("region") || "";
  const selectedIndiaRegion = searchParams.get("indiaRegion") || "";
  const selectedCategory = searchParams.get("category") || "";
  const selectedOrganizerId = searchParams.get("organizerId") || "";
  const selectedMonth = searchParams.get("departureMonth") || "";
  const selectedOrganizerLanguage = searchParams.get("organizerLanguage") || "";
  const selectedMinBudget = searchParams.get("minBudget") || "";
  const selectedMaxBudget = searchParams.get("maxBudget") || "";
  const selectedMinDays = searchParams.get("minDurationDays") || "";
  const selectedMaxDays = searchParams.get("maxDurationDays") || "";
  const selectedTransportation = searchParams.get("transportation") || "";
  const userId = user?._id || user?.id || null;
  const favoriteTripIds = wishlist.userId === userId ? wishlist.tripIds : [];
  const draftValues = filterDraft.source === searchString
    ? filterDraft.values
    : Object.fromEntries(filterKeys.map((key) => [key, searchParams.get(key) || ""]));
  const draftHasChanges = filterKeys.some(
    (key) => draftValues[key] !== (searchParams.get(key) || "")
  );
  const draftValidationError = useMemo(() => {
    const minBudget = draftValues.minBudget === "" ? null : Number(draftValues.minBudget);
    const maxBudget = draftValues.maxBudget === "" ? null : Number(draftValues.maxBudget);
    const minDuration = draftValues.minDurationDays === "" ? null : Number(draftValues.minDurationDays);
    const maxDuration = draftValues.maxDurationDays === "" ? null : Number(draftValues.maxDurationDays);
    if ([minBudget, maxBudget].some((value) => value !== null && (!Number.isFinite(value) || value < 0))) {
      return "Budget values must be non-negative numbers.";
    }
    if (minBudget !== null && maxBudget !== null && minBudget > maxBudget) {
      return "Minimum budget cannot be greater than maximum budget.";
    }
    if (minDuration !== null && (!Number.isInteger(minDuration) || minDuration < 1)) {
      return "Minimum duration must be a positive whole number of days.";
    }
    if (maxDuration !== null && (!Number.isInteger(maxDuration) || maxDuration < 1)) {
      return "Maximum duration must be a positive whole number of days.";
    }
    if (minDuration !== null && maxDuration !== null && minDuration > maxDuration) {
      return "Minimum duration cannot be greater than maximum duration.";
    }
    return "";
  }, [draftValues]);
  const requestKey = [
    search.trim(), selectedCountry, selectedRegion, selectedIndiaRegion,
    selectedCategory, selectedOrganizerId, selectedMonth, selectedOrganizerLanguage, selectedMinBudget,
    selectedMaxBudget, selectedMinDays, selectedMaxDays, selectedTransportation,
  ].join("\u0000");

  useEffect(() => {
    let active = true;
    const params = Object.fromEntries(
      Object.entries({
        search: search.trim(),
        country: selectedCountry,
        region: selectedRegion,
        indiaRegion: selectedIndiaRegion,
        category: selectedCategory,
        organizerId: selectedOrganizerId,
        departureMonth: selectedMonth,
        organizerLanguage: selectedOrganizerLanguage,
        minBudget: selectedMinBudget,
        maxBudget: selectedMaxBudget,
        minDurationDays: selectedMinDays,
        maxDurationDays: selectedMaxDays,
        transportation: selectedTransportation,
      }).filter(([, value]) => value)
    );
    tripService.getApprovedTrips(params)
      .then((response) => {
        if (active) setTrips(response.trips || []);
      })
      .catch((loadError) => {
        if (active) {
          setLoadError({
            key: requestKey,
            message: loadError.message || "Unable to load approved trips.",
          });
        }
      })
      .finally(() => {
        if (active) setLoadedKey(requestKey);
      });
    return () => { active = false; };
  }, [
    search, selectedCountry, selectedRegion, selectedIndiaRegion, selectedCategory,
    selectedOrganizerId, selectedMonth, selectedMinBudget, selectedMaxBudget,
    selectedOrganizerLanguage, selectedMinDays, selectedMaxDays, selectedTransportation, requestKey,
  ]);

  const loading = loadedKey !== requestKey;
  const error = loadError.key === requestKey ? loadError.message : "";
  const visibleTrips = loading ? [] : trips;

  useEffect(() => {
    if (!isAuthenticated || !userId) return undefined;
    let active = true;
    profileService.getWishlist()
      .then((response) => {
        if (active) {
          setWishlist({
            userId,
            tripIds: (response.data || []).map((trip) => trip._id || trip.id).filter(Boolean),
          });
        }
      })
      .catch((loadError) => {
        if (active) console.error("Unable to load saved trips:", loadError);
      });
    return () => { active = false; };
  }, [isAuthenticated, userId]);

  const sortedTrips = useMemo(() => {
    const sorted = [...trips];
    const dateValue = (value) => {
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
    };
    switch (selectedSort) {
      case "soonest":
        sorted.sort((a, b) => dateValue(a.startDate) - dateValue(b.startDate));
        break;
      case "budget-low":
        sorted.sort((a, b) => Number(a.totalBudget ?? Infinity) - Number(b.totalBudget ?? Infinity));
        break;
      case "budget-high":
        sorted.sort((a, b) => Number(b.totalBudget ?? -Infinity) - Number(a.totalBudget ?? -Infinity));
        break;
      case "spots":
        sorted.sort((a, b) => (Number(b.maxMembers) - Number(b.currentMembers)) - (Number(a.maxMembers) - Number(a.currentMembers)));
        break;
      default:
        sorted.sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt));
        break;
    }
    return sorted;
  }, [trips, selectedSort]);
  const tripsToRender = loading ? [] : sortedTrips;

  const updateSort = (event) => {
    const nextParams = new URLSearchParams(searchParams);
    if (event.target.value === "newest") nextParams.delete("sort");
    else nextParams.set("sort", event.target.value);
    setSearchParams(nextParams);
  };

  const updateFilterDraft = (key, value) => {
    setFilterDraft({
      source: searchString,
      values: { ...draftValues, [key]: value },
    });
  };

  const applyFilterDraft = () => {
    if (draftValidationError) return;
    const nextParams = new URLSearchParams(searchParams);
    for (const key of filterKeys) {
      if (draftValues[key]) nextParams.set(key, draftValues[key]);
      else nextParams.delete(key);
    }
    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    const nextParams = new URLSearchParams();
    if (search) nextParams.set("search", search);
    if (selectedSort !== "newest") nextParams.set("sort", selectedSort);
    setSearchParams(nextParams);
  };

  const filtersActive = filterKeys.some((key) => searchParams.has(key));

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-7 px-5 py-10 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#00796B]">Find your next adventure</p>
            <h1 className="mt-2 text-4xl font-black text-gray-900">
              {selectedOrganizerId ? "Trips by this trip leader" : selectedIndiaRegion ? `${selectedIndiaRegion} India Trips` : selectedCountry ? `Trips in ${selectedCountry}` : selectedRegion ? `Trips in ${selectedRegion}` : selectedCategory === "Beach" ? "Beach trips" : "Explore Trips"}
            </h1>
            <p className="mt-2 text-gray-500">
              {selectedOrganizerId ? "Discover this trip leader’s approved public trips." : selectedIndiaRegion ? `Discover approved trips across ${selectedIndiaRegion} India.` : selectedCountry ? `Discover approved trips in ${selectedCountry}.` : selectedRegion ? `Discover approved trips across ${selectedRegion}.` : "Join any approved trip as a Trip Mate."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSortPanelOpen((open) => !open)}
            aria-expanded={sortPanelOpen}
            aria-controls="explore-sort-filter-panel"
            className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#00796B] hover:text-[#00796B]"
          >
            Sort
            {filtersActive && <span className="h-2 w-2 rounded-full bg-[#00796B]" aria-label="Filters active" />}
            <span aria-hidden="true">{sortPanelOpen ? "−" : "+"}</span>
          </button>
        </header>

        {sortPanelOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm sm:py-10"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSortPanelOpen(false);
            }}
          >
            <section
              id="explore-sort-filter-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="explore-sort-filter-title"
              className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="explore-sort-filter-title" className="text-lg font-black text-slate-900">Sort and filter your search</h2>
                  <p className="mt-1 text-xs text-slate-500">Choose destinations, dates, budget, and trip preferences.</p>
                </div>
                <div className="flex items-center gap-4">
                  {(filtersActive || draftHasChanges) && <button type="button" onClick={clearFilters} className="text-sm font-bold text-[#00796B] hover:underline">Clear filters</button>}
                  <button
                    type="button"
                    onClick={() => setSortPanelOpen(false)}
                    aria-label="Close sort and filters"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                  >
                    ×
                  </button>
                </div>
              </div>
              <label className="mb-5 block max-w-sm text-xs font-bold text-slate-600">
                Sort by
                <select value={selectedSort} onChange={updateSort} aria-label="Sort trips" className={inputClass}>
                  <option value="newest">Recently added</option>
                  <option value="soonest">Starting soon</option>
                  <option value="budget-low">Budget: low to high</option>
                  <option value="budget-high">Budget: high to low</option>
                  <option value="spots">Most available spots</option>
                </select>
              </label>
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-bold text-slate-600">
                  Destination
                  <input value={draftValues.country} onChange={(event) => updateFilterDraft("country", event.target.value)} placeholder="Country, state, or city" className={inputClass} />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Continent
                  <select value={draftValues.region} onChange={(event) => updateFilterDraft("region", event.target.value)} className={inputClass}>
                    <option value="">All continents</option>
                    {regions.map((region) => <option key={region} value={region}>{region === "Americas" ? "North & South America" : region}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Departure month
                  <input type="month" value={draftValues.departureMonth} onChange={(event) => updateFilterDraft("departureMonth", event.target.value)} className={inputClass} />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Trip leader language
                  <input value={draftValues.organizerLanguage} onChange={(event) => updateFilterDraft("organizerLanguage", event.target.value)} placeholder="e.g. English" className={inputClass} />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Trip category
                  <select value={draftValues.category} onChange={(event) => updateFilterDraft("category", event.target.value)} className={inputClass}>
                    <option value="">All trip types</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  {categoryError && <span role="status" className="mt-1 block font-normal text-amber-700">{categoryError}</span>}
                </label>
                <fieldset className="text-xs font-bold text-slate-600">
                  <legend>Total trip budget (INR)</legend>
                  <div className="mt-1 flex gap-2">
                    <input type="number" min="0" value={draftValues.minBudget} onChange={(event) => updateFilterDraft("minBudget", event.target.value)} placeholder="Minimum" aria-label="Minimum budget" className="h-10 min-w-0 w-1/2 rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-[#00796B]" />
                    <input type="number" min="0" value={draftValues.maxBudget} onChange={(event) => updateFilterDraft("maxBudget", event.target.value)} placeholder="Maximum" aria-label="Maximum budget" className="h-10 min-w-0 w-1/2 rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-[#00796B]" />
                  </div>
                </fieldset>
                <fieldset className="text-xs font-bold text-slate-600">
                  <legend>Duration (days)</legend>
                  <div className="mt-1 flex gap-2">
                    <input type="number" min="1" step="1" value={draftValues.minDurationDays} onChange={(event) => updateFilterDraft("minDurationDays", event.target.value)} placeholder="Minimum" aria-label="Minimum duration in days" className="h-10 min-w-0 w-1/2 rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-[#00796B]" />
                    <input type="number" min="1" step="1" value={draftValues.maxDurationDays} onChange={(event) => updateFilterDraft("maxDurationDays", event.target.value)} placeholder="Maximum" aria-label="Maximum duration in days" className="h-10 min-w-0 w-1/2 rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-[#00796B]" />
                  </div>
                </fieldset>
                <label className="text-xs font-bold text-slate-600">
                  Transportation
                  <select value={draftValues.transportation} onChange={(event) => updateFilterDraft("transportation", event.target.value)} className={inputClass}>
                    <option value="">Any transportation</option>
                    {transportations.map((transportation) => <option key={transportation} value={transportation}>{transportation}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Indian region
                  <select value={draftValues.indiaRegion} onChange={(event) => updateFilterDraft("indiaRegion", event.target.value)} className={inputClass}>
                    <option value="">All India</option>
                    {["North", "South", "North East", "West"].map((region) => <option key={region} value={region}>{region}</option>)}
                  </select>
                </label>
              </div>
              {draftValidationError && <p role="alert" className="mt-4 text-sm font-medium text-red-700">{draftValidationError}</p>}
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    applyFilterDraft();
                    setSortPanelOpen(false);
                  }}
                  disabled={!draftHasChanges || Boolean(draftValidationError)}
                  className="rounded-xl bg-[#006f68] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#005c56] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply filters
                </button>
              </div>
            </section>
          </div>
        )}

        <p className="text-sm font-medium text-slate-500">{loading ? "Finding trips…" : `${sortedTrips.length} trip${sortedTrips.length === 1 ? "" : "s"} found`}</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {loading && <p role="status">Loading approved trips...</p>}
        {!loading && !error && visibleTrips.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-gray-500">
            <p>No approved trips found{selectedOrganizerId ? " for this trip leader" : selectedIndiaRegion ? ` in ${selectedIndiaRegion} India` : selectedCountry ? ` in ${selectedCountry}` : selectedRegion ? ` in ${selectedRegion}` : ""}.</p>
            {(selectedCountry || selectedRegion || selectedIndiaRegion || selectedCategory || selectedOrganizerId) && <Link to="/explore" className="mt-3 inline-block font-semibold text-[#00796B] hover:underline">Browse all trips</Link>}
          </div>
        )}

        <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {tripsToRender.map((trip) => (
            <div key={trip._id} className="min-w-0">
              <ExploreTripCard
                trip={trip}
                isFavorite={favoriteTripIds.includes(trip._id)}
                onFavoriteChange={(tripId, saved) => setWishlist((current) => ({
                  userId,
                  tripIds: saved
                    ? [...new Set([...current.tripIds, tripId])]
                    : current.tripIds.filter((id) => id !== tripId),
                }))}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
