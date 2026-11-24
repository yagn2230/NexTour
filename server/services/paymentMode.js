const isDemoPaymentsEnabled = () => (
  process.env.NODE_ENV !== "production"
  && (process.env.PAYMENT_MODE || "demo") === "demo"
);

module.exports = { isDemoPaymentsEnabled };
