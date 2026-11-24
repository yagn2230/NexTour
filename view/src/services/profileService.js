import { api, API_BASE_URL } from "../utils/api";

export const profileService = {
  getMyProfile: () => api.get("/profile/me"),
  getWishlist: () => api.get("/profile/wishlist"),
  getPublicProfile: (identifier) => api.get(`/profile/${encodeURIComponent(identifier)}`),
  updateProfile: (updates) => api.put("/profile/update", updates),
  markNotificationRead: (notificationId) => api.patch(`/profile/notifications/${notificationId}/read`),
  deleteNotification: (notificationId) => api.delete(`/profile/notifications/${notificationId}`),
  changePassword: (currentPassword, newPassword) => api.patch("/profile/change-password", { currentPassword, newPassword }),
  getVerificationStatus: () => api.get("/verification/status"),
  applyForVerification: async (formData) => {
    const token = localStorage.getItem("nextour_token");
    const response = await fetch(`${API_BASE_URL}/verification/apply`, {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.message || "Unable to submit verification.");
      error.status = response.status;
      throw error;
    }
    return result;
  },
  addWishlistItem: (tripId) => api.post("/profile/wishlist", { tripId }),
  removeWishlistItem: (tripId) => api.delete(`/profile/wishlist/${tripId}`),
  createReview: (review) => api.post("/reviews", review),
  getMyTripReviews: (tripId) => api.get(`/reviews/trips/${tripId}/mine`),
  respondToTripRequest: (tripId, requestId, decision) => {
    const action = decision === "Accepted" ? "accept" : decision === "Declined" ? "decline" : "";
    if (!action) throw new Error("Trip request decision must be Accepted or Declined.");
    return api.post(`/trips/${tripId}/requests/${requestId}/${action}`);
  },
  requestToJoinTrip: (tripId, message = "") => api.post(`/trips/${tripId}/requests`, { message }),
  updateProfileImage: async (field, file) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`${API_BASE_URL}/profile/${field === "coverImage" ? "cover-image" : "profile-image"}`, {
      method: "PATCH",
      credentials: "include",
      headers: localStorage.getItem("nextour_token")
        ? { Authorization: `Bearer ${localStorage.getItem("nextour_token")}` }
        : {},
      body: formData,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.message || "Unable to upload image.");
      error.status = response.status;
      throw error;
    }
    return result;
  },
};
