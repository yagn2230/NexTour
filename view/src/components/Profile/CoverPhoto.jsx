import { useRef } from "react";
import { FiCamera } from "react-icons/fi";

export default function CoverPhoto({ src, editable = false, onEdit, uploading = false }) {
  const fileInput = useRef(null);
  return (
    <div className="group relative h-48 overflow-hidden bg-[#f1f8f7] sm:h-64 lg:h-72">
      {src && <img src={src} alt="Profile cover" className="h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/10" />
      {editable && (
        <>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-[#006f68]/90 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#005c56] disabled:cursor-wait disabled:opacity-80">
            <FiCamera size={14} /> {uploading ? "Uploading..." : "Update cover photo"}
          </button>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onEdit?.(file); event.target.value = ""; }} />
        </>
      )}
    </div>
  );
}
