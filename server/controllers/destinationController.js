const { City, Country, State } = require("country-state-city");
const Destination = require("../models/Destination");
const { asyncHandler } = require("../middleware/errorMiddleware");

const getCountries = asyncHandler(async (req, res) => {
  const countries = Country.getAllCountries()
    .map(({ name, isoCode }) => ({ name, isoCode }))
    .sort((first, second) => first.name.localeCompare(second.name));

  res.status(200).json({ countries });
});

const getStates = asyncHandler(async (req, res) => {
  const countryName = decodeURIComponent(req.params.country).trim();
  const country = Country.getAllCountries().find(
    (entry) => entry.name.toLowerCase() === countryName.toLowerCase()
  );

  if (!country) {
    return res.status(404).json({ message: "Country not found." });
  }

  const states = State.getStatesOfCountry(country.isoCode)
    .map(({ name, isoCode }) => ({ name, isoCode }))
    .sort((first, second) => first.name.localeCompare(second.name));

  res.status(200).json({ states });
});

const getCities = asyncHandler(async (req, res) => {
  const stateName = decodeURIComponent(req.params.state).trim().toLowerCase();
  const countryName = typeof req.query.country === "string"
    ? req.query.country.trim().toLowerCase()
    : "";
  const countries = Country.getAllCountries().filter(
    (country) => !countryName || country.name.toLowerCase() === countryName
  );

  const matchingStates = countries.flatMap((country) =>
    State.getStatesOfCountry(country.isoCode)
      .filter((state) => state.name.toLowerCase() === stateName)
      .map((state) => ({ country, state }))
  );

  const cities = [...new Set(matchingStates.flatMap(({ country, state }) =>
    City.getCitiesOfState(country.isoCode, state.isoCode).map((city) => city.name)
  ))]
    .sort((first, second) => first.localeCompare(second))
    .map((name) => ({ name }));

  res.status(200).json({ cities });
});

const getPlaces = asyncHandler(async (req, res) => {
  const { country, state, city } = req.query;
  if (![country, state, city].every((value) => typeof value === "string" && value.trim())) {
    return res.status(400).json({
      message: "Country, state, and city query parameters are required.",
    });
  }

  const destination = await Destination.findOne({
    country: country.trim(),
    state: state.trim(),
    city: city.trim(),
  }).select("famousPlaces");

  res.status(200).json({ places: destination?.famousPlaces || [] });
});

module.exports = { getCountries, getStates, getCities, getPlaces };
