import { useEffect, useState } from "react";
import { FiMapPin } from "react-icons/fi";
import { destinationService } from "../../services/destinationService";

const fieldClass = "mt-1.5 h-[46px] w-full rounded-xl border border-gray-200 bg-[#f8faf9] px-4 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10 disabled:cursor-not-allowed disabled:opacity-60";

function SearchableLocationField({ label, value, options, listId, placeholder, loading, disabled, onChange }) {
  return (
    <label className="text-sm font-semibold text-gray-700">
      {label}
      <input
        className={fieldClass}
        type="search"
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={loading ? "Loading options…" : placeholder}
        autoComplete="off"
        disabled={disabled || loading}
        aria-busy={loading}
        required
      />
      <datalist id={listId}>{options.map((option) => <option key={option.name} value={option.name} />)}</datalist>
    </label>
  );
}

export default function DestinationPicker({ form, update }) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [places, setPlaces] = useState([]);
  const [statesCountry, setStatesCountry] = useState("");
  const [citiesLocation, setCitiesLocation] = useState({ country: "", state: "" });
  const [placesLocation, setPlacesLocation] = useState({ country: "", state: "", city: "" });
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    destinationService.getCountries()
      .then((response) => {
        if (active) setCountries(Array.isArray(response.countries) ? response.countries : []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load countries.");
      })
      .finally(() => {
        if (active) setCountriesLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!form.country) {
      return undefined;
    }
    let active = true;
    const timer = setTimeout(() => destinationService.getStates(form.country)
      .then((response) => {
        if (active) {
          setStates(Array.isArray(response.states) ? response.states : []);
          setStatesCountry(form.country);
        }
      })
      .catch((loadError) => {
        if (active) {
          setStatesCountry(form.country);
          setError(loadError.message || "Unable to load states.");
        }
      }), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [form.country]);

  useEffect(() => {
    if (!form.state || !form.country) {
      return undefined;
    }
    let active = true;
    const timer = setTimeout(() => destinationService.getCities(form.state, form.country)
      .then((response) => {
        if (active) {
          setCities(Array.isArray(response.cities) ? response.cities : []);
          setCitiesLocation({ country: form.country, state: form.state });
        }
      })
      .catch((loadError) => {
        if (active) {
          setCitiesLocation({ country: form.country, state: form.state });
          setError(loadError.message || "Unable to load cities.");
        }
      }), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [form.country, form.state]);

  useEffect(() => {
    if (!form.country || !form.state || !form.city) {
      return undefined;
    }
    let active = true;
    const timer = setTimeout(() => destinationService.getPlaces(form.country, form.state, form.city)
      .then((response) => {
        if (active) {
          setPlaces(Array.isArray(response.places) ? response.places : []);
          setPlacesLocation({ country: form.country, state: form.state, city: form.city });
        }
      })
      .catch((loadError) => {
        if (active) {
          setPlacesLocation({ country: form.country, state: form.state, city: form.city });
          setError(loadError.message || "Unable to load famous places.");
        }
      }), 200);
    return () => { active = false; clearTimeout(timer); };
  }, [form.country, form.state, form.city]);

  const availableStates = statesCountry === form.country ? states : [];
  const availableCities = citiesLocation.country === form.country && citiesLocation.state === form.state ? cities : [];
  const placesMatchSelection = placesLocation.country === form.country
    && placesLocation.state === form.state
    && placesLocation.city === form.city;
  const availablePlaces = placesMatchSelection ? places : [];
  const loading = {
    countries: countriesLoading,
    states: Boolean(form.country) && statesCountry !== form.country,
    cities: Boolean(form.country && form.state)
      && (citiesLocation.country !== form.country || citiesLocation.state !== form.state),
    places: Boolean(form.country && form.state && form.city) && !placesMatchSelection,
  };

  const updateCountry = (country) => {
    setError("");
    update({
      country,
      state: "",
      city: "",
      destination: "",
      famousPlaces: [],
    });
  };
  const updateState = (state) => {
    setError("");
    update({
      state,
      city: "",
      destination: "",
      famousPlaces: [],
    });
  };
  const updateCity = (city) => {
    setError("");
    update({ city, destination: city, famousPlaces: [] });
  };
  const togglePlace = (place) => {
    const selected = new Set(form.famousPlaces);
    if (selected.has(place)) selected.delete(place);
    else selected.add(place);
    update({ famousPlaces: [...selected] });
  };

  return (
    <section className="sm:col-span-2" aria-labelledby="destination-picker-title">
      <h3 id="destination-picker-title" className="flex items-center gap-2 text-sm font-bold text-gray-800"><FiMapPin className="text-[#00796B]" />Choose your destination</h3>
      <p className="mt-1 text-xs leading-5 text-gray-500">Search and select a country, state, and city. Then choose the places to visit.</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <SearchableLocationField label="Country" value={form.country} options={countries} listId="trip-countries" placeholder="Search countries" loading={loading.countries} onChange={updateCountry} />
        <SearchableLocationField label="State / region" value={form.state} options={availableStates} listId="trip-states" placeholder={form.country ? "Search states" : "Choose a country first"} loading={loading.states} disabled={!form.country} onChange={updateState} />
        <SearchableLocationField label="City" value={form.city} options={availableCities} listId="trip-cities" placeholder={form.state ? "Search cities" : "Choose a state first"} loading={loading.cities} disabled={!form.state} onChange={updateCity} />
      </div>

      {loading.places && <p className="mt-4 text-sm text-gray-500" role="status">Loading famous places…</p>}
      {!loading.places && form.city && placesMatchSelection && availablePlaces.length > 0 && (
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-gray-700">Famous places in {form.city}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {availablePlaces.map((place) => (
              <label key={place} className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-100 bg-[#f8faf9] px-3 py-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.famousPlaces.includes(place)} onChange={() => togglePlace(place)} className="h-4 w-4 accent-[#006f68]" />
                {place}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!loading.places && form.city && placesMatchSelection && availablePlaces.length === 0 && (
        <p className="mt-4 rounded-xl bg-[#f8faf9] p-3 text-sm text-gray-500">No curated famous places are available for this city yet. You can still create the trip.</p>
      )}
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  );
}
