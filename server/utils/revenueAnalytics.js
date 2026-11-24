const PERIODS = {
  daily: { count: 14, unit: "day" },
  weekly: { count: 12, unit: "week" },
  monthly: { count: 12, unit: "month" },
  yearly: { count: 5, unit: "year" },
};

const startOfPeriod = (date, unit) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (unit === "week") {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  } else if (unit === "month") {
    start.setUTCDate(1);
  } else if (unit === "year") {
    start.setUTCMonth(0, 1);
  }
  return start;
};

const shiftPeriod = (date, unit, count) => {
  const result = new Date(date);
  if (unit === "day") result.setUTCDate(result.getUTCDate() + count);
  if (unit === "week") result.setUTCDate(result.getUTCDate() + (count * 7));
  if (unit === "month") result.setUTCMonth(result.getUTCMonth() + count);
  if (unit === "year") result.setUTCFullYear(result.getUTCFullYear() + count);
  return result;
};

const getBucketStart = (date, unit) => {
  if (unit === "day") return startOfPeriod(date, "day");
  if (unit === "week") return startOfPeriod(date, "week");
  if (unit === "month") return startOfPeriod(date, "month");
  return startOfPeriod(date, "year");
};

const buildRevenueAnalytics = (bookings, period, now = new Date()) => {
  const configuration = PERIODS[period];
  if (!configuration) throw new Error("Unsupported revenue analytics period.");
  const { count, unit } = configuration;
  const currentStart = shiftPeriod(startOfPeriod(now, unit), unit, -(count - 1));
  const previousStart = shiftPeriod(currentStart, unit, -count);
  const buckets = Array.from({ length: count }, (_, index) => {
    const start = shiftPeriod(currentStart, unit, index);
    return { start, revenue: 0 };
  });
  let currentRevenue = 0;
  let previousRevenue = 0;
  let paidRevenue = 0;
  let paidPayments = 0;
  let pendingPayments = 0;
  let pendingAmount = 0;
  const revenueByTrip = new Map();

  for (const booking of bookings) {
    if (booking.paymentStatus === "Paid") {
      paidPayments += 1;
      paidRevenue += Number(booking.amount || 0);
      const tripId = booking.trip?._id?.toString() || booking.trip?.toString();
      if (tripId) {
        const trip = revenueByTrip.get(tripId) || {
          tripId,
          title: booking.trip?.title || "Trip",
          revenue: 0,
          payments: 0,
        };
        trip.revenue += Number(booking.amount || 0);
        trip.payments += 1;
        revenueByTrip.set(tripId, trip);
      }

      const paidAt = booking.paidAt ? new Date(booking.paidAt) : null;
      if (!paidAt || Number.isNaN(paidAt.getTime())) continue;
      if (paidAt >= currentStart && paidAt <= now) {
        currentRevenue += Number(booking.amount || 0);
        const bucketStart = getBucketStart(paidAt, unit);
        const bucketIndex = buckets.findIndex((bucket) => bucket.start.getTime() === bucketStart.getTime());
        if (bucketIndex >= 0) buckets[bucketIndex].revenue += Number(booking.amount || 0);
      } else if (paidAt >= previousStart && paidAt < currentStart) {
        previousRevenue += Number(booking.amount || 0);
      }
    } else if (["Pending", "Cash Payment Pending"].includes(booking.paymentStatus)) {
      pendingPayments += 1;
      pendingAmount += Number(booking.amount || 0);
    }
  }

  const growthPercent = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : null;

  return {
    period,
    totals: {
      totalRevenue: paidRevenue,
      completedPayments: paidPayments,
      pendingPayments,
      pendingAmount,
      currentPeriodRevenue: currentRevenue,
      previousPeriodRevenue: previousRevenue,
      growthPercent,
    },
    series: buckets.map(({ start, revenue }) => ({ date: start.toISOString(), revenue })),
    revenueByTrip: [...revenueByTrip.values()].sort((a, b) => b.revenue - a.revenue),
  };
};

module.exports = { buildRevenueAnalytics };
