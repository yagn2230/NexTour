import { api } from '../utils/api';

export const authService = {
  /**
   * Login user with email & password
   */
  login: async (credentials) => {
    return await api.post('/auth/login', credentials);
  },

  /**
   * Register a new user
   */
  register: async (userData) => {
    return await api.post('/auth/register', userData);
  },

  /**
   * Get current authenticated user profile
   */
  getProfile: async () => {
    return await api.get('/auth/profile');
  },

  /**
   * End the current server-side session
   */
  logout: async () => {
    return await api.get('/auth/logout');
  },

  /**
   * Update profile details
   */
  updateProfile: async (profileData) => {
    return await api.put('/profile/update', profileData);
  },
};
