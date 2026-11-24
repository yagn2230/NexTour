import { api } from "../utils/api";

export const reportService = {
  submit: (targetType, targetId, reason, contextTripId) => api.post("/reports", {
    targetType,
    targetId,
    reason,
    ...(contextTripId ? { contextTripId } : {}),
  }),
};
