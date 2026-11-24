import { FiArrowRight } from "react-icons/fi";
import SectionHeader from "./Common/SectionHeader";
import ReviewCard from "./Common/ReviewCard";
import EmptyState from "./Common/EmptyState";

export default function Reviews({ reviews = [] }) {
  const rating = reviews.length
    ? (reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : "—";
  return (
    <section id="organizer-reviews" className="scroll-mt-24">
      <SectionHeader title="Kind words from the road" eyebrow="Reviews" action={<span className="flex items-center gap-1 text-sm font-bold text-[#00796B]">{rating}<FiArrowRight size={15} /></span>} />
      {reviews.length ? <div className="grid gap-4 lg:grid-cols-2">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <EmptyState title="No reviews yet" description="Reviews from your trips will appear here." />}
    </section>
  );
}
