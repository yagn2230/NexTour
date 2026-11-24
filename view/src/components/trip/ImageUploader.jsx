import { FiImage, FiPlus, FiTrash2 } from "react-icons/fi";

const imageInputClass = "h-[46px] w-full rounded-xl border border-gray-200 bg-[#f8faf9] px-4 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";

export default function ImageUploader({ coverImage, images, onCoverChange, onImagesChange }) {
  const updateAdditionalImage = (index, url) => {
    onImagesChange(images.map((image, imageIndex) => imageIndex === index ? { ...image, url } : image));
  };

  return (
    <section aria-labelledby="trip-images-title">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900" id="trip-images-title">Trip images</h3>
        <p className="mt-1 text-xs leading-5 text-gray-500">Paste image URLs. The first image is used as the trip cover.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-600 sm:col-span-2">
          Cover image URL <span className="text-red-500">*</span>
          <span className="mt-1.5 flex items-center gap-3 rounded-xl border border-gray-200 bg-[#f8faf9] px-3">
            <FiImage className="shrink-0 text-[#00796B]" size={18} />
            <input required type="url" value={coverImage.url} onChange={(event) => onCoverChange({ ...coverImage, url: event.target.value })} placeholder="https://example.com/trip.jpg" className={`${imageInputClass} border-0 bg-transparent px-0 focus:ring-0`} />
          </span>
        </label>
        {coverImage.url && (
          <img src={coverImage.url} alt={coverImage.alt || "Trip cover preview"} className="h-44 w-full rounded-2xl border border-gray-100 object-cover sm:col-span-2" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} onLoad={(event) => { event.currentTarget.style.visibility = "visible"; }} />
        )}
        {images.map((image, index) => (
          <div key={index} className="flex items-center gap-2 sm:col-span-2">
            <input type="url" aria-label={`Additional image ${index + 1} URL`} value={image.url} onChange={(event) => updateAdditionalImage(index, event.target.value)} placeholder="https://example.com/another-view.jpg" className={imageInputClass} />
            <button type="button" aria-label={`Remove additional image ${index + 1}`} onClick={() => onImagesChange(images.filter((_, imageIndex) => imageIndex !== index))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-all duration-200 hover:-translate-y-[1px] hover:bg-red-50 hover:text-red-500">
              <FiTrash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onImagesChange([...images, { url: "", alt: "Trip image" }])} className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#00796B] transition-all duration-200 hover:-translate-y-[1px] hover:text-[#006f68]">
        <FiPlus size={16} />Add another image
      </button>
    </section>
  );
}
