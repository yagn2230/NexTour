import { api, apiFetch } from "../utils/api";

export const attendanceService = {
  cancelBooking: (bookingId, reason) => api.patch(`/payments/${bookingId}/cancel`, { reason }),
  markAttendance: (bookingId, attendanceStatus) => api.patch(`/organizer/payments/${bookingId}/attendance`, { attendanceStatus }),
  submitAppeal: (bookingId, reason, evidence) => {
    const formData = new FormData();
    formData.append("bookingId", bookingId);
    formData.append("reason", reason);
    formData.append("evidence", evidence);
    return apiFetch("/appeals/no-show", { method: "POST", body: formData });
  },
};
