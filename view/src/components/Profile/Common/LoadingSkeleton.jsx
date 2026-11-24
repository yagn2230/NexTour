export default function LoadingSkeleton({ cards = 3 }) {
  return (
    <div className="animate-pulse space-y-5" aria-label="Loading profile" role="status">
      <span className="sr-only">Loading profile…</span>
      <div className="h-64 rounded-3xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="h-48 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
