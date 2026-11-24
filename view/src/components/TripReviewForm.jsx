import { useState } from "react";
import { FiStar } from "react-icons/fi";
import { profileService } from "../services/profileService";

const reviewTargetId = (review) => review?.user?._id?.toString() || review?.user?.toString();

export default function TripReviewForm({ tripId, targetUserId, targetName, existingReviews = [] }) {
  const existingReview = existingReviews.find((review) => reviewTargetId(review) === targetUserId?.toString());
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!targetUserId) return null;
  if (existingReview || submitted) {
    return <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">You reviewed {targetName} for this trip.</p>;
  }

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await profileService.createReview({
        tripId,
        userId: targetUserId,
        rating,
        comment: comment.trim(),
      });
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError.message || "Unable to submit your review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-900">Review {targetName}</h3>
      <div className="mt-2 flex gap-1" role="group" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={rating === value} className={`rounded p-1 ${value <= rating ? "text-amber-500" : "text-slate-300"}`}>
            <FiStar fill={value <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={`review-${tripId}-${targetUserId}`}>Review comment</label>
      <textarea id={`review-${tripId}-${targetUserId}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={2} placeholder="Share a few words about your trip…" className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700" />
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="mt-2 rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white hover:bg-teal-900 disabled:opacity-50">{busy ? "Submitting…" : "Submit review"}</button>
    </form>
  );
}
