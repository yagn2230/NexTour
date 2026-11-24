import { FiArrowLeft, FiArrowRight, FiCheck, FiLoader } from "react-icons/fi";

export default function NavigationButtons({ currentStep, onBack, onNext, onSubmit, submitting }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6">
      {currentStep > 0 ? (
        <button type="button" onClick={onBack} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 hover:-translate-y-[1px] hover:border-[#00796B] hover:text-[#00796B]">
          <FiArrowLeft size={17} />Back
        </button>
      ) : <span />}
      {currentStep < 4 ? (
        <button type="button" onClick={onNext} className="ml-auto flex items-center gap-2 rounded-xl bg-[#006f68] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,111,104,0.18)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#005c56] hover:shadow-[0_6px_16px_rgba(0,111,104,0.25)]">
          Continue<FiArrowRight size={17} />
        </button>
      ) : (
        <button type="button" onClick={onSubmit} disabled={submitting} className="ml-auto flex items-center gap-2 rounded-xl bg-[#006f68] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,111,104,0.18)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#005c56] hover:shadow-[0_6px_16px_rgba(0,111,104,0.25)] disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <FiLoader className="animate-spin" size={17} /> : <FiCheck size={17} />}
          {submitting ? "Creating trip..." : "Create trip"}
        </button>
      )}
    </div>
  );
}
