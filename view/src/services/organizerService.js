import { api } from "../utils/api";

export const organizerService = {
  getTrips: () => api.get("/organizer/trips"),
  getDashboardStats: () => api.get("/organizer/dashboard/stats"),
  getTripRequests: (tripId) => api.get(`/organizer/trips/${tripId}/requests`),
  updateTripPrice: (tripId, pricePerPerson) => api.patch(`/organizer/trips/${tripId}/price`, { pricePerPerson }),
  updateTripStatus: (tripId, status) => api.patch(`/organizer/trips/${tripId}/status`, { status }),
  deleteTrip: (tripId) => api.delete(`/organizer/trips/${tripId}`),
  removeMember: (tripId, memberId) => api.delete(`/organizer/trips/${tripId}/members/${memberId}`),
  acceptRequest: (requestId) => api.patch(`/organizer/requests/${requestId}/accept`, {}),
  rejectRequest: (requestId) => api.patch(`/organizer/requests/${requestId}/reject`, {}),
  markAttendance: (bookingId, attendanceStatus) => api.patch(`/organizer/payments/${bookingId}/attendance`, { attendanceStatus }),
};
