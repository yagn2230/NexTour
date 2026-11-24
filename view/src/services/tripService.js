import { api } from '../utils/api';

export const tripService = {
  /**
   * Get all approved trips for Explore Trips page
   */
  getApprovedTrips: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(`/trips/explore${queryString ? `?${queryString}` : ''}`);
  },


  //  * Get user created trips
 
  getMyTrips: async () => {
    return await api.get('/trips/my');
  },

  /**
   * Get user joined trips
   */
  getJoinedTrips: async () => {
    const response = await api.get('/trips/my');
    return { ...response, trips: response.joinedTrips || [] };
  },

  /**
   * Get trip by ID
   */
  getTripById: async (id) => {
    return await api.get(`/trips/public/${id}`);
  },

  getRelatedTrips: async (id) => api.get(`/trips/related/${id}`),

  requestToJoinTrip: async (id, message = '') => {
    return await api.post(`/trips/${id}/requests`, { message });
  },

  getMyTripRequests: async () => api.get('/trips/requests/mine'),

  cancelTripRequest: async (tripId, requestId) =>
    api.patch(`/trips/${tripId}/requests/${requestId}/cancel`, {}),

  getItinerary: async (tripId) => api.get(`/trips/${tripId}/itinerary`),

  /**
   * Create a new trip
   */
  createTrip: async (tripData) => {
    return await api.post('/trips/create', tripData);
  },

  /**
   * Update existing trip
   */
  updateTrip: async (id, tripData) => {
    return await api.put(`/trips/${id}`, tripData);
  },

  /**
   * Delete trip
   */
  deleteTrip: async (id) => {
    return await api.delete(`/trips/${id}`);
  },

  /**
   * Join a trip
   */
  joinTrip: async (id) => {
    return await api.post(`/trips/${id}/join`);
  },

  /**
   * Leave a trip
   */
  leaveTrip: async (id) => {
    return await api.post(`/trips/${id}/leave`);
  },

  /**
   * Itinerary Management Methods
   */
  addItineraryDay: async (tripId, dayData) =>
    api.post(`/trips/${tripId}/itinerary/days`, dayData),

  updateItineraryDay: async (tripId, dayId, dayData) =>
    api.put(`/trips/${tripId}/itinerary/days/${dayId}`, dayData),

  deleteItineraryDay: async (tripId, dayId) =>
    api.delete(`/trips/${tripId}/itinerary/days/${dayId}`),

  addActivity: async (tripId, dayId, activityData) =>
    api.post(`/trips/${tripId}/itinerary/days/${dayId}/activities`, activityData),

  updateActivity: async (tripId, dayId, activityId, activityData) =>
    api.put(`/trips/${tripId}/itinerary/days/${dayId}/activities/${activityId}`, activityData),

  deleteActivity: async (tripId, dayId, activityId) =>
    api.delete(`/trips/${tripId}/itinerary/days/${dayId}/activities/${activityId}`),
};
