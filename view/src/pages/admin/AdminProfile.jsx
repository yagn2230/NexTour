import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";

export default function AdminProfile() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState({ fullName: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    profileService.getMyProfile()
      .then((response) => {
        const user = response.data?.user || response.data || response.user;
        if (!user || typeof user !== "object") throw new Error("The server returned an unexpected profile response.");
        if (active) setProfile({
          fullName: user.fullName || "",
          email: user.email || "",
          phone: user.phone || "",
        });
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load your profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await profileService.updateProfile({
        fullName: profile.fullName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });
      if (response.data) updateUser(response.data);
      toast.success("Profile updated.");
    } catch (saveError) {
      setError(saveError.message || "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (password.newPassword !== password.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (password.newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }
    setChangingPassword(true);
    setError("");
    try {
      await profileService.changePassword(password.currentPassword, password.newPassword);
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully.");
    } catch (changeError) {
      setError(changeError.message || "Unable to change your password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const inputClass = "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#00796B] focus:ring-4 focus:ring-[#00796B]/10";
  if (loading) return <div className="rounded-2xl border border-gray-200 bg-white py-20 text-center text-sm font-semibold text-gray-500" role="status">Loading administrator profile…</div>;

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">Account</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-1px] text-gray-900">Admin profile</h1>
        <p className="mt-2 text-sm leading-7 text-gray-500">Update your administrator details and password.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <form onSubmit={saveProfile} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
        <div><h2 className="text-lg font-black text-gray-900">Profile details</h2><p className="mt-1 text-sm text-gray-500">Your contact information used by NexTour.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700">Full name<input required maxLength={100} value={profile.fullName} onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700">Email<input required type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Phone<input maxLength={30} value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} className={inputClass} /></label>
        </div>
        <div className="flex justify-end border-t border-gray-100 pt-4"><button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[#006f68] px-5 text-sm font-bold text-white hover:bg-[#005c56] disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button></div>
      </form>

      <form onSubmit={savePassword} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
        <div><h2 className="text-lg font-black text-gray-900">Change password</h2><p className="mt-1 text-sm text-gray-500">Enter your current password before choosing a new one.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Current password<input required type="password" maxLength={128} autoComplete="current-password" value={password.currentPassword} onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700">New password<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password.newPassword} onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700">Confirm new password<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password.confirmPassword} onChange={(event) => setPassword((current) => ({ ...current, confirmPassword: event.target.value }))} className={inputClass} /></label>
        </div>
        <div className="flex justify-end border-t border-gray-100 pt-4"><button type="submit" disabled={changingPassword} className="min-h-11 rounded-xl border border-gray-200 px-5 text-sm font-bold text-gray-700 hover:border-[#00796B] hover:text-[#00796B] disabled:opacity-50">{changingPassword ? "Changing…" : "Change password"}</button></div>
      </form>
    </section>
  );
}
