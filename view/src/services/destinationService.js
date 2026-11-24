import { api } from "../utils/api";

export const destinationService = {
  getCountries: () => api.get("/destinations/countries"),
  getStates: (country) => api.get(`/destinations/states/${encodeURIComponent(country)}`),
  getCities: (state, country) => api.get(
    `/destinations/cities/${encodeURIComponent(state)}?${new URLSearchParams({ country })}`
  ),
  getPlaces: (country, state, city) => api.get(
    `/destinations/places?${new URLSearchParams({ country, state, city })}`
  ),
};
