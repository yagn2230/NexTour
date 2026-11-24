import { FiImage } from "react-icons/fi";
import SectionHeader from "./Common/SectionHeader";
import EmptyState from "./Common/EmptyState";

export default function Gallery({ images = [], onAdd }) {
  return (
    <section>
      <SectionHeader title="Travel gallery" eyebrow="Snapshots" action={<button type="button" onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[#00796B] hover:text-[#00796B]"><FiImage />Add photo URL</button>} />
      {images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((src, index) => <img key={src} src={src} alt={`Travel memory ${index + 1}`} className={`h-36 w-full rounded-2xl object-cover transition hover:scale-[1.02] sm:h-44 ${index === 0 ? "sm:col-span-2 sm:row-span-2 sm:h-full" : ""}`} loading="lazy" />)}</div> : <EmptyState title="Your gallery is waiting" description="Add a few favorite travel memories to share your story." />}
    </section>
  );
}
