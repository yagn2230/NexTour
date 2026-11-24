/**
 * Format number to INR currency string
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format ISO date string into a readable date.
 */
export const formatDate = (dateString) => {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

/**
 * Format date range (e.g. Oct 24 - Nov 02, 2026)
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return "Dates TBD";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return `${startDate} - ${endDate}`;
  }
  const startMonth = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(start);
  const endMonth = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(end);
  return `${startMonth} – ${endMonth}`;
};

/**
 * Calculate trip duration in days.
 */
export const calculateDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return isNaN(diffDays) ? 1 : diffDays;
};

/**
 * Get status color badge class.
 */
export const getStatusBadgeColor = (status) => {
  const normalized = (status || "").toLowerCase();
  switch (normalized) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "pending":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "rejected":
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    case "active":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "inactive":
      return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    default:
      return "bg-sky-500/10 text-sky-400 border-sky-500/30";
  }
};
