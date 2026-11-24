import { api } from "../utils/api";

export const paymentService = {
  getMine: () => api.get("/payments/mine"),
  getOrganizerPayments: () => api.get("/organizer/payments"),
  getRevenueAnalytics: (period) => api.get(`/organizer/payments/analytics?period=${period}`),
  completeDemoPayment: (bookingId) => api.post(`/payments/${bookingId}/demo/complete`, {}),
  chooseCash: (bookingId) => api.patch(`/payments/${bookingId}/payment-method`, {}),
  createRazorpayOrder: (bookingId) => api.post(`/payments/${bookingId}/razorpay/order`, {}),
  verifyRazorpayPayment: (bookingId, payment) => api.post(`/payments/${bookingId}/razorpay/verify`, payment),
  markCashPaid: (bookingId) => api.patch(`/organizer/payments/${bookingId}/mark-cash-paid`, {}),
  markCashRefunded: (bookingId) => api.patch(`/organizer/payments/${bookingId}/mark-cash-refunded`, {}),
  cancel: (bookingId) => api.patch(`/organizer/payments/${bookingId}/cancel`, {}),
};
