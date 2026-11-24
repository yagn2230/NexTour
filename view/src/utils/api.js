/**
 * NexTour API Client with Fetch API
 * Provides unified HTTP request handling with session-cookie authentication,
 * JSON response parsing, error handling, and mock fallbacks when API server is unreachable.
 */

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:5000' : '');
export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '');

/**
 * Get stored Auth Token
 */
export const getAuthToken = () => {
  return localStorage.getItem('nextour_token');
};

/**
 * Fetch API Wrapper
 */
export const apiFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    credentials: 'include',
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const details = Array.isArray(data.errors) ? data.errors.join(" ") : "";
      const error = new Error([data.message, details].filter(Boolean).join(": ") || `API Error: ${response.status} ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) {
      console.warn(`[API Call Failed: ${endpoint}] - ${error.message}`);
    }
    throw error;
  }
};

/**
 * HTTP Method Helpers
 */
export const api = {
  get: (endpoint, headers = {}) => apiFetch(endpoint, { method: 'GET', headers }),
  post: (endpoint, body, headers = {}) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body), headers }),
  put: (endpoint, body, headers = {}) => apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body), headers }),
  patch: (endpoint, body, headers = {}) => apiFetch(endpoint, { method: 'PATCH', body: JSON.stringify(body), headers }),
  delete: (endpoint, headers = {}) => apiFetch(endpoint, { method: 'DELETE', headers }),
};
