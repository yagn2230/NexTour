import { FiStar } from "react-icons/fi";

export default function ReviewCard({ review }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src={review.avatar} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{review.name}</p>
            <p className="text-xs text-slate-500">{review.date}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-[#f1f8f7] px-2.5 py-1 text-xs font-bold text-[#00796B]"><FiStar size={13} className="fill-current" />{review.rating}.0</span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">“{review.text}”</p>
      {review.trip && <p className="mt-3 text-xs font-semibold text-[#00796B]">Trip · {review.trip}</p>}
    </article>
  );
}
