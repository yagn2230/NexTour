import { toast } from "react-hot-toast";
import { API_BASE_URL, getAuthToken } from "../utils/api";

const BASE_URL = `${API_BASE_URL}/admin`;

/**
 * Fetch helper for admin routes.
 * Sends the JWT token from localStorage and keeps the session cookie support.
 */
const fetchApi = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const config = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data.message || `Request failed (${response.status})`;

      if (response.status === 401) {
        toast.error("Please login first.");
      } else if (response.status === 403) {
        toast.error("Admin permission required.");
      } else {
        toast.error(message);
      }

      throw new Error(message);
    }

    return data;

  } catch (error) {
    if (error.name === "TypeError") {
      toast.error("Backend server not reachable.");
    }

    throw error;
  }
};


export const adminService = {

  getOrganizerRequests: () => fetchApi("/organizer-requests", { method: "GET" }),

  approveOrganizer: async (userId) => {
    const response = await fetchApi(`/users/${userId}/approve-organizer`, { method: "PUT" });
    toast.success(response.message || "Organizer approved.");
    return response;
  },

  rejectOrganizer: async (userId) => {
    const response = await fetchApi(`/users/${userId}/reject-organizer`, { method: "PUT" });
    toast.success(response.message || "Organizer request rejected.");
    return response;
  },

  revokeOrganizer: async (userId) => {
    const response = await fetchApi(`/users/${userId}/revoke-organizer`, { method: "PATCH" });
    toast.success(response.message || "Organizer privileges removed.");
    return response;
  },

  // Dashboard Statistics
  getAdminStats: () => {
    return fetchApi("/stats", {
      method: "GET",
    });
  },

  getNoShowAppeals: (status = "Pending") => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return fetchApi(`/no-show-appeals${query}`, { method: "GET" });
  },

  getNoShowOffenders: () => fetchApi("/no-show-offenders", { method: "GET" }),

  decideNoShowAppeal: (appealId, decision, reason = "") => fetchApi(`/no-show-appeals/${appealId}/decision`, {
    method: "PATCH",
    body: JSON.stringify({ decision, reason }),
  }),

  downloadNoShowEvidence: async (appealId) => {
    const token = getAuthToken();
    const response = await fetch(`${BASE_URL}/no-show-appeals/${appealId}/evidence`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Evidence download failed (${response.status}).`);
    }
    return response.blob();
  },

  getJoinRequests: (status = "") => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const query = params.toString();
    return fetchApi(`/join-requests${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  respondToJoinRequest: (requestId, decision) => {
    if (!["accept", "reject"].includes(decision)) {
      throw new Error("Join request decision must be accept or reject.");
    }
    return fetchApi(`/join-requests/${requestId}/${decision}`, {
      method: "PATCH",
    });
  },

  sendNotification: (audience, title, message) => fetchApi("/notifications", {
    method: "POST",
    body: JSON.stringify({ audience, title, message }),
  }),

  getReports: (status = "", targetType = "") => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (targetType) params.set("targetType", targetType);
    const query = params.toString();
    return fetchApi(`/reports${query ? `?${query}` : ""}`, { method: "GET" });
  },

  updateReport: (reportId, status, resolution = "") => fetchApi(`/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, resolution }),
  }),

  moderateReport: (reportId, action) => fetchApi(`/reports/${reportId}/moderate`, {
    method: "POST",
    body: JSON.stringify({ action }),
  }),

  getSettings: () => fetchApi("/settings", { method: "GET" }),

  updateSettings: (settings) => fetchApi("/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  }),

  getDestinations: () => fetchApi("/destinations", { method: "GET" }),

  createDestination: (destination) => fetchApi("/destinations", {
    method: "POST",
    body: JSON.stringify(destination),
  }),

  updateDestination: (destinationId, destination) => fetchApi(`/destinations/${destinationId}`, {
    method: "PUT",
    body: JSON.stringify(destination),
  }),

  deleteDestination: (destinationId) => fetchApi(`/destinations/${destinationId}`, {
    method: "DELETE",
  }),


  // Get all users
  getAllUsers: (search = "", role = "", status = "") => {

    const params = new URLSearchParams();

    if (search) params.append("search", search);
    if (role) params.append("role", role);
    if (status) params.append("status", status);


    return fetchApi(`/users?${params.toString()}`, {
      method:"GET",
    });
  },


  // Get single user
  getUser: (userId) => {
    return fetchApi(`/users/${userId}`, {
      method:"GET",
    });
  },

  // Update user profile details
  updateUser: async (userId, userData) => {
    const res = await fetchApi(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });

    toast.success(res.message || "User updated successfully");
    return res;
  },


  // User trips
  getUserTrips: (userId) => {
    return fetchApi(`/users/${userId}/trips`, {
      method:"GET",
    });
  },


  // Update user role
  updateUserRole: async (userId, role) => {

    const res = await fetchApi(`/users/${userId}/role`, {
      method:"PATCH",
      body:JSON.stringify({
        role
      }),
    });

    toast.success(
      res.message || "Role updated successfully"
    );

    return res;
  },


  // Change user status
  toggleUserStatus: async (userId, currentIsActive) => {

    const res = await fetchApi(`/users/${userId}/status`, {
      method:"PATCH",
      body: JSON.stringify({ isActive: !currentIsActive }),
    });

    toast.success(
      res.message || "Status updated"
    );

    return res;
  },


  // Delete user
  deleteUser: async(userId)=>{

    const res = await fetchApi(`/users/${userId}`,{
      method:"DELETE",
    });

    toast.success(
      res.message || "User deleted"
    );

    return res;
  },


  // Pending trips
  getPendingTrips:()=>{
    return fetchApi("/trips/pending",{
      method:"GET",
    });
  },


  // Approved trips
  getApprovedTripsAdmin:()=>{
    return fetchApi("/trips/approved",{
      method:"GET",
    });
  },


  // Rejected trips
  getRejectedTripsAdmin:()=>{
    return fetchApi("/trips/rejected",{
      method:"GET",
    });
  },

  // Get a single trip
  getTripAdmin: (tripId) => {
    return fetchApi(`/trips/${tripId}`, {
      method: "GET",
    });
  },

  // Update trip details
  updateTripAdmin: async (tripId, tripData) => {
    const res = await fetchApi(`/trips/${tripId}`, {
      method: "PUT",
      body: JSON.stringify(tripData),
    });

    toast.success(res.message || "Trip updated successfully");
    return res;
  },


  // Approve trip
  approveTrip:async(tripId)=>{

    const res = await fetchApi(
      `/trips/${tripId}/approve`,
      {
        method:"PUT",
      }
    );

    toast.success(
      res.message || "Trip approved"
    );

    return res;
  },


  // Reject trip
  rejectTrip:async(tripId, reason="")=>{

    const res = await fetchApi(
      `/trips/${tripId}/reject`,
      {
        method:"PUT",
        body:JSON.stringify({
          reason
        }),
      }
    );

    toast.success(
      res.message || "Trip rejected"
    );

    return res;
  },


  // Delete trip
  deleteTripAdmin:async(tripId)=>{

    const res = await fetchApi(
      `/trips/${tripId}`,
      {
        method:"DELETE",
      }
    );

    toast.success(
      res.message || "Trip deleted"
    );

    return res;
  },


  // Restore trip
  restoreTrip:async(tripId)=>{

    const res = await fetchApi(
      `/trips/${tripId}/restore`,
      {
        method:"PATCH",
      }
    );

    toast.success(
      res.message || "Trip restored"
    );

    return res;
  }

};