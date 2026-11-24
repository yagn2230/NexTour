import { api } from '../utils/api';

export const userService = {
  getUserProfile: async (userId) => api.get(`/profile/${encodeURIComponent(userId)}`),

  updateProfile: async (data) => api.put('/profile/update', data),

  getMyStats: async () => {
    const response = await api.get('/profile/me');
    const statistics = response.data?.statistics || {};
    return {
      success: Boolean(response.success),
      stats: {
        tripsCreated: Number(statistics.totalTripsCreated || 0),
        tripsJoined: Number(statistics.totalTripsJoined || 0),
        totalCountries: Array.isArray(statistics.countriesVisited) ? statistics.countriesVisited.length : 0,
      },
    };
  }
};
