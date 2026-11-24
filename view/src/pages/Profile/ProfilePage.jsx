import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import Navbar from "../../components/Navbar";
import RoleSwitcher from "../../components/Profile/RoleSwitcher";
import ProfileHeader from "../../components/Profile/ProfileHeader";
import TripMateProfile from "../../components/Profile/TripMate/TripMateProfile";
import OrganizerProfile from "../../components/Profile/Organizer/OrganizerProfile";
import LoadingSkeleton from "../../components/Profile/Common/LoadingSkeleton";
import { profileService } from "../../services/profileService";
import { adaptProfile, resolveProfileImageUrl } from "./profileAdapter";
import { useAuth } from "../../hooks/useAuth";

function EditProfileDialog({ user, role, onClose, onSave }) {
  const [form, setForm] = useState({
    fullName: user.fullName,
    location: user.location,
    city: user.city || "",
    country: user.country || "",
    bio: user.bio || "",
    travelPreferences: (user.preferences || []).join(", "),
    socialLinks: {
      website: user.socialLinks?.website || "",
      instagram: user.socialLinks?.instagram || "",
      facebook: user.socialLinks?.facebook || "",
      linkedin: user.socialLinks?.linkedin || "",
    },
    organizerExperience: user.organizerExperience || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const updates = {
      ...form,
      travelPreferences: form.travelPreferences.split(",").map((preference) => preference.trim()).filter(Boolean),
    };
    delete updates.organizerExperience;
    if (role === "organizer") updates.organizerExperience = form.organizerExperience;
    Promise.resolve(onSave(updates))
      .catch((saveError) => setError(saveError.message || "Unable to save profile changes."))
      .finally(() => setSaving(false));
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-md sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}
    >
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        onSubmit={submit}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-5 shadow-[0_30px_100px_rgba(2,6,23,0.4)] sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00796B]">Your profile</p>
            <h2 id="edit-profile-title" className="mt-1 text-2xl font-black text-slate-900">Edit profile</h2>
            <p className="mt-1 text-sm text-slate-500">Update how other travelers get to know you.</p>
          </div>
          <button type="button" disabled={saving} onClick={onClose} aria-label="Close dialog" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"><FiX /></button>
        </div>
        <label className="mb-4 block text-sm font-semibold text-slate-700">Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#f1f8f7]" /></label>
        <label className="mb-4 block text-sm font-semibold text-slate-700">Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#f1f8f7]" /></label>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">City<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#f1f8f7]" /></label>
          <label className="block text-sm font-semibold text-slate-700">Country<input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#f1f8f7]" /></label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">About me<textarea rows={4} maxLength={1000} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="Share a little about yourself…" className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-normal leading-6 outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#f1f8f7]" /></label>
        <label className="mt-4 block text-sm font-semibold text-slate-700">Travel preferences <span className="font-normal text-slate-500">(comma-separated)</span><input value={form.travelPreferences} onChange={(event) => setForm({ ...form, travelPreferences: event.target.value })} placeholder="Hiking, food, photography" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#f1f8f7]" /></label>
        <fieldset className="mt-5 space-y-3">
          <legend className="text-sm font-bold text-slate-800">Find me online</legend>
          <p className="text-xs text-slate-500">Add full profile URLs. Leave a field blank to hide it.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["website", "Website"],
              ["instagram", "Instagram"],
              ["facebook", "Facebook"],
              ["linkedin", "LinkedIn"],
            ].map(([field, label]) => (
              <label key={field} className="block text-sm font-semibold text-slate-700">{label}
                <input type="url" value={form.socialLinks[field]} onChange={(event) => setForm({ ...form, socialLinks: { ...form.socialLinks, [field]: event.target.value } })} placeholder="https://" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#f1f8f7]" />
              </label>
            ))}
          </div>
        </fieldset>
        {role === "organizer" && <label className="mt-4 block text-sm font-semibold text-slate-700">Organizer experience<textarea rows={4} maxLength={2000} value={form.organizerExperience} onChange={(event) => setForm({ ...form, organizerExperience: event.target.value })} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-normal leading-6 outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#f1f8f7]" /></label>}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-[#00796B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#005c56] disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button></div>
      </motion.form>
    </motion.div>
  );
}

export default function ProfilePage({ embedded = false, initialRole, organizerSection, onOrganizerSectionChange }) {
  const { updateUser } = useAuth();
  const location = useLocation();
  const [role, setRole] = useState(() => initialRole || (new URLSearchParams(location.search).get("view") === "organizer" ? "organizer" : "traveler"));
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [uploadingField, setUploadingField] = useState("");

  const loadProfile = useCallback(async () => {
    setError("");
    const response = await profileService.getMyProfile();
    setProfile(adaptProfile(response));
  }, []);

  useEffect(() => {
    let active = true;
    profileService.getMyProfile()
      .then((response) => {
        if (active) setProfile(adaptProfile(response));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load your profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [loadProfile]);

  useEffect(() => {
    if (embedded || loading || role !== "organizer" || !location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [embedded, loading, location.hash, role]);

  const saveProfile = async (updates) => {
    await profileService.updateProfile(updates);
    const { organizerExperience, ...userUpdates } = updates;
    updateUser(userUpdates);
    setProfile((current) => ({
      ...current,
      user: {
        ...current.user,
        ...userUpdates,
        preferences: userUpdates.travelPreferences || current.user.preferences,
        social: userUpdates.socialLinks
          ? Object.entries(userUpdates.socialLinks)
            .filter(([, value]) => value)
            .map(([label, value]) => ({
              label: label[0].toUpperCase() + label.slice(1),
              value,
              href: value.startsWith("http") ? value : `https://${value}`,
            }))
          : current.user.social,
        avatar: current.user.avatar,
        cover: current.user.cover,
      },
      data: organizerExperience === undefined ? current.data : {
        ...current.data,
        organizer: { ...current.data.organizer, experience: organizerExperience },
      },
    }));
    setEditing(false);
  };

  const removeWishlistItem = async (place) => {
    await profileService.removeWishlistItem(place.id);
    await loadProfile();
  };

  const markNotificationRead = async (notificationId) => {
    await profileService.markNotificationRead(notificationId);
    await loadProfile();
  };

  const deleteNotification = async (notificationId) => {
    await profileService.deleteNotification(notificationId);
    await loadProfile();
  };

  const changePassword = (currentPassword, newPassword) =>
    profileService.changePassword(currentPassword, newPassword);

  const uploadProfileImage = async (field, file) => {
    setError("");
    setUploadingField(field);
    try {
      const response = await profileService.updateProfileImage(field, file);
      const imageUrl = resolveProfileImageUrl(response.data?.[field]);
      if (!imageUrl) throw new Error("The server did not return the updated image.");
      updateUser({ [field]: imageUrl });
      setProfile((current) => current ? {
        ...current,
        user: {
          ...current.user,
          ...(field === "profileImage" ? { avatar: imageUrl } : { cover: imageUrl }),
        },
      } : current);
      await loadProfile();
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload profile image.");
    } finally {
      setUploadingField("");
    }
  };

  const addGalleryImage = async () => {
    const imageUrl = window.prompt("Enter a public image URL to add to your gallery:");
    if (!imageUrl) return;
    let parsedUrl;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      setError("Enter a valid image URL.");
      return;
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setError("Gallery image URLs must use HTTP or HTTPS.");
      return;
    }
    try {
      const gallery = [...profile.data.gallery, parsedUrl.toString()];
      await profileService.updateProfile({ gallery });
      await loadProfile();
    } catch (galleryError) {
      setError(galleryError.message || "Unable to add this gallery image.");
    }
  };

  if (loading) {
    return embedded
      ? <LoadingSkeleton />
      : <div className="min-h-screen bg-[#f8faf9]"><Navbar /><main className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><LoadingSkeleton /></main></div>;
  }

  if (error && !profile) {
    if (embedded) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-xl font-black text-slate-900">Unable to load organizer profile</h2>
          <p role="alert" className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">{error}</p>
          <button type="button" onClick={() => { setLoading(true); loadProfile().catch((loadError) => setError(loadError.message || "Unable to load your profile.")).finally(() => setLoading(false)); }} className="mt-5 rounded-xl bg-[#006f68] px-5 py-3 text-sm font-semibold text-white hover:bg-[#005c56]">Try again</button>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#f8faf9]"><Navbar /><main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h1 className="text-2xl font-black text-slate-900">Unable to load your profile</h1>
        <p role="alert" className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">{error}</p>
        <div className="mt-6 flex justify-center gap-3"><button type="button" onClick={() => { setLoading(true); loadProfile().catch((loadError) => setError(loadError.message || "Unable to load your profile.")).finally(() => setLoading(false)); }} className="rounded-xl bg-[#006f68] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,111,104,0.18)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#005c56]">Try again</button><Link to="/login" className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 hover:border-[#00796B] hover:text-[#00796B]">Sign in</Link></div>
      </main></div>
    );
  }

  const { user, data } = profile;
  const organizerContent = (
    <OrganizerProfile
      user={user}
      data={{ ...data, onGalleryAdd: addGalleryImage }}
      statistics={profile.statistics}
      onEdit={() => setEditing(true)}
      onImageUpload={uploadProfileImage}
      onNotificationRead={markNotificationRead}
      onNotificationDelete={deleteNotification}
      onPasswordChange={changePassword}
      uploadingField={uploadingField}
      showSidebar={!embedded}
      showProfileHeader={!embedded}
      selectedSection={embedded ? organizerSection : undefined}
      onSectionChange={embedded ? onOrganizerSectionChange : undefined}
    />
  );

  if (embedded) {
    return (
      <div className="space-y-5">
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {organizerContent}
        <AnimatePresence>{editing && <EditProfileDialog user={user} role="organizer" onClose={() => setEditing(false)} onSave={saveProfile} />}</AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-7 px-5 pb-16 pt-8 sm:px-8">
        <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">YOUR NEXTOUR STORY</p><h1 className="mt-4 text-4xl font-black tracking-[-1px] text-gray-900 sm:text-5xl">My profile</h1><p className="mt-2 text-sm leading-7 text-gray-500">One account, two ways to see the world.</p></div>
          <RoleSwitcher role={role} onChange={setRole} />
        </header>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <AnimatePresence mode="wait">
          {role === "traveler" ? <motion.div key="tripmate-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-8"><ProfileHeader user={user} role={role} onEdit={() => setEditing(true)} onImageUpload={uploadProfileImage} uploadingField={uploadingField} /><TripMateProfile user={user} data={data} statistics={profile.statistics} onWishlistRemove={removeWishlistItem} onGalleryAdd={addGalleryImage} onNotificationRead={markNotificationRead} onNotificationDelete={deleteNotification} onEditProfile={() => setEditing(true)} onPasswordChange={changePassword} /></motion.div> : <motion.div key="organizer-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>{organizerContent}</motion.div>}
        </AnimatePresence>
      </main>
      <AnimatePresence>{editing && <EditProfileDialog user={user} role={role} onClose={() => setEditing(false)} onSave={saveProfile} />}</AnimatePresence>
    </div>
  );
}
