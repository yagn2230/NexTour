export default function RupeeIcon({ size, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center leading-none ${className}`}
      style={size ? { fontSize: size } : undefined}
    >
      ₹
    </span>
  );
}
