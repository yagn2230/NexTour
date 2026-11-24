const assert = require("node:assert/strict");
const { test } = require("node:test");
const { buildRevenueAnalytics } = require("../utils/revenueAnalytics");

test("revenue analytics groups actual paid bookings and compares equivalent periods", () => {
  const bookings = [
    { paymentStatus: "Paid", amount: 120, paidAt: "2026-11-10T12:00:00.000Z", trip: { _id: "trip-a", title: "Nepal" } },
    { paymentStatus: "Paid", amount: 100, paidAt: "2026-10-10T12:00:00.000Z", trip: { _id: "trip-a", title: "Nepal" } },
    { paymentStatus: "Paid", amount: 50, paidAt: "2025-11-10T12:00:00.000Z", trip: { _id: "trip-b", title: "Ladakh" } },
    { paymentStatus: "Pending", amount: 75 },
    { paymentStatus: "Cash Payment Pending", amount: 25 },
  ];
  const result = buildRevenueAnalytics(bookings, "monthly", new Date("2026-11-24T00:00:00.000Z"));

  assert.equal(result.totals.totalRevenue, 270);
  assert.equal(result.totals.completedPayments, 3);
  assert.equal(result.totals.pendingPayments, 2);
  assert.equal(result.totals.pendingAmount, 100);
  assert.equal(result.totals.currentPeriodRevenue, 220);
  assert.equal(result.totals.previousPeriodRevenue, 50);
  assert.equal(result.totals.growthPercent, 340);
  assert.equal(result.series.length, 12);
  assert.equal(result.series.find((point) => point.date.startsWith("2026-11"))?.revenue, 120);
  assert.equal(result.revenueByTrip[0].tripId, "trip-a");
});

test("revenue analytics supports day, week, month, and year periods", () => {
  const now = new Date("2026-11-24T00:00:00.000Z");
  for (const [period, count] of [["daily", 14], ["weekly", 12], ["monthly", 12], ["yearly", 5]]) {
    const result = buildRevenueAnalytics([], period, now);
    assert.equal(result.period, period);
    assert.equal(result.series.length, count);
    assert.equal(result.totals.totalRevenue, 0);
    assert.equal(result.totals.growthPercent, null);
  }
});

test("revenue analytics rejects unsupported periods", () => {
  assert.throws(() => buildRevenueAnalytics([], "hourly"), /unsupported/i);
});
