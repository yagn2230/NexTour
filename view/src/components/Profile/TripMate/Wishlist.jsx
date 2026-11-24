import { useState } from "react";
import { FiHeart, FiMapPin } from "react-icons/fi";
import SectionHeader from "../Common/SectionHeader";
import EmptyState from "../Common/EmptyState";

export default function Wishlist({ destinations = [], onRemove }) {
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState("");
  const remove = async (place) => {
    const tripId = place.id || place._id;
    if (!tripId) {
      setError("This saved trip could not be identified. Reload your profile and try again.");
      return;
    }
    setRemoving(tripId);
    setError("");
    try {
      if (!onRemove) throw new Error("Wishlist removal is unavailable. Please reload and try again.");
      await onRemove({ ...place, id: tripId });
    } catch (removeError) {
      setError(removeError.message || "Unable to remove this saved trip.");
    } finally {
      setRemoving("");
    }
  };
  return <section><SectionHeader title="On my wishlist" eyebrow="Dream destinations" />{error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<div className="grid gap-4 sm:grid-cols-3">{destinations.map((place) => { const tripId = place.id || place._id; return <article key={tripId || place.name} className="group relative h-48 overflow-hidden rounded-2xl bg-gradient-to-br from-[#cfe1de] via-[#f1f8f7] to-[#e6f2f0]">{place.image && <img src={place.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />}<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" /><button type="button" disabled={!tripId || removing === tripId} onClick={() => remove(place)} aria-label={`Remove ${place.name} from wishlist`} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#00796B] disabled:opacity-50"><FiHeart className="fill-current" /></button><div className="absolute bottom-4 left-4 text-white"><h3 className="text-lg font-bold">{place.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-white/80"><FiMapPin />{place.country}</p></div></article>; })}</div>{!destinations.length && <EmptyState title="Your wishlist is empty" description="Save trips from Explore to see them here." />}</section>;
}
