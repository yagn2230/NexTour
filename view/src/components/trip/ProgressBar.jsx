const steps = ["Basics", "Budget", "Preferences", "Itinerary", "Review"];

export default function ProgressBar({ currentStep }) {
  return (
    <nav aria-label="Trip creation progress" className="mb-8">
      <ol className="grid grid-cols-5 gap-2">
        {steps.map((step, index) => {
          const complete = index < currentStep;
          const current = index === currentStep;

          return (
            <li key={step} className="min-w-0 text-center">
              <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-200 ${
                complete || current ? "bg-[#006f68] text-white" : "bg-[#f1f8f7] text-gray-400"
              }`} aria-current={current ? "step" : undefined}>
                {index + 1}
              </div>
              <p className={`mt-2 truncate text-[11px] font-semibold sm:text-xs ${current ? "text-[#00796B]" : "text-gray-500"}`}>
                {step}
              </p>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#f1f8f7]">
        <div
          className="h-full rounded-full bg-[#006f68] transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
    </nav>
  );
}
