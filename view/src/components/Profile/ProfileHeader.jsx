import { useRef } from "react";
import { FiMapPin, FiStar, FiCalendar, FiCheckCircle, FiEdit2, FiCamera } from "react-icons/fi";
import CoverPhoto from "./CoverPhoto";

export default function ProfileHeader({ user, role, onEdit, onImageUpload, uploadingField = "" }) {
  const avatarInput = useRef(null);
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <CoverPhoto src={user.cover} editable uploading={uploadingField === "coverImage"} onEdit={(file) => onImageUpload?.("coverImage", file)} />
      <div className="px-5 pb-6 sm:px-8">
        <div className="-mt-14 flex flex-wrap items-end justify-between gap-4 sm:-mt-16">
          <div className="flex min-w-0 items-end gap-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#006f68] to-[#00796B] p-1 shadow-[0_8px_20px_rgba(0,111,104,0.25)] sm:h-32 sm:w-32">
                {user.avatar ? <img src={user.avatar} alt={`Profile photo of ${user.fullName}`} className="h-full w-full rounded-full bg-[#f1f8f7] object-cover" /> : <span className="grid h-full w-full place-items-center rounded-full bg-[#f1f8f7] text-3xl font-black tracking-[-1px] text-[#00796B]">{user.fullName?.slice(0, 1)}</span>}
              </div>
              <button type="button" onClick={() => avatarInput.current?.click()} aria-label="Change profile photo" disabled={uploadingField === "profileImage"} className="absolute -bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-xl border border-white bg-[#006f68] px-3 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(0,111,104,0.18)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#005c56] hover:shadow-[0_6px_16px_rgba(0,111,104,0.25)] disabled:cursor-wait disabled:opacity-80"><FiCamera size={14} />{uploadingField === "profileImage" ? "Uploading..." : "Change photo"}</button>
              <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImageUpload?.("profileImage", file); event.target.value = ""; }} />
            </div>
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-black tracking-[-1px] text-gray-900 sm:text-3xl">{user.fullName}</h1>
                {user.verified && <span className="inline-flex items-center gap-1 rounded-full bg-[#006f68]/10 px-2.5 py-1 text-[11px] font-bold text-[#00796B]"><FiCheckCircle size={13} />Verified</span>}
              </div>
              <p className="mt-1 text-sm font-medium text-gray-500">{user.username}</p>
            </div>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button type="button" onClick={onEdit} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#006f68] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,111,104,0.18)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#005c56] hover:shadow-[0_6px_16px_rgba(0,111,104,0.25)] sm:flex-none"><FiEdit2 size={15} />Edit profile</button>
          </div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="max-w-3xl text-sm leading-7 text-gray-500">{user.bio}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-gray-500">
              <span className="inline-flex items-center gap-1.5"><FiMapPin className="text-[#00796B]" />{user.location}</span>
              <span className="inline-flex items-center gap-1.5"><FiCalendar className="text-[#00796B]" />Member since {user.memberSince}</span>
              <span className="inline-flex items-center gap-1.5"><FiStar className="fill-[#00796B] text-[#00796B]" />{user.rating} rating · {user.reviewCount} reviews</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[#f1f8f7] px-4 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-white text-[#00796B]"><FiStar className="fill-current" /></span>
          <div><p className="text-xl font-black tracking-[-0.5px] text-gray-900">{role === "organizer" ? user.totalTripsCreated || 0 : user.countriesVisited?.length || 0}</p><p className="text-xs font-medium text-gray-500">{role === "organizer" ? "trips hosted" : "countries explored"}</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
