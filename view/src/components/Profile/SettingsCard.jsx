import { useState } from "react";
import { FiChevronRight, FiLock, FiBell, FiX } from "react-icons/fi";
import SectionHeader from "./Common/SectionHeader";

export default function SettingsCard({ onEditProfile, onPasswordChange, onOpenNotifications }) {
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const openNotifications = () => {
    if (onOpenNotifications) {
      onOpenNotifications();
      return;
    }
    document.getElementById("profile-notifications")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation must match.");
      return;
    }
    setSaving(true);
    try {
      await onPasswordChange(form.currentPassword, form.newPassword);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccess("Password changed successfully.");
      setPasswordDialog(false);
    } catch (changeError) {
      setError(changeError.message || "Unable to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section id="organizer-settings" className="scroll-mt-24">
        <SectionHeader title="Your settings" />
        {success && <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>}
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white px-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <button type="button" onClick={onEditProfile} className="flex w-full items-center gap-3 py-4 text-left transition hover:text-[#00796B]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-slate-500"><FiLock size={16} /></span>
            <span className="flex-1"><span className="block text-sm font-semibold text-slate-800">Edit profile</span><span className="mt-0.5 block text-xs text-slate-500">Update your name, bio, and location</span></span>
            <FiChevronRight className="text-slate-400" />
          </button>
          <button type="button" onClick={() => { setError(""); setPasswordDialog(true); }} className="flex w-full items-center gap-3 py-4 text-left transition hover:text-[#00796B]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-slate-500"><FiLock size={16} /></span>
            <span className="flex-1"><span className="block text-sm font-semibold text-slate-800">Change password</span><span className="mt-0.5 block text-xs text-slate-500">Update your account password securely</span></span>
            <FiChevronRight className="text-slate-400" />
          </button>
          <button type="button" onClick={openNotifications} className="flex w-full items-center gap-3 py-4 text-left transition hover:text-[#00796B]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-slate-500"><FiBell size={16} /></span>
            <span className="flex-1"><span className="block text-sm font-semibold text-slate-800">Notifications</span><span className="mt-0.5 block text-xs text-slate-500">Review your trip updates</span></span>
            <FiChevronRight className="text-slate-400" />
          </button>
        </div>
      </section>
      {passwordDialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !saving && setPasswordDialog(false)}>
          <form onSubmit={submitPassword} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Account security</p><h2 className="mt-1 text-xl font-black text-slate-900">Change password</h2></div><button type="button" disabled={saving} onClick={() => setPasswordDialog(false)} aria-label="Close dialog" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600"><FiX /></button></div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Current password<input type="password" autoComplete="current-password" required maxLength={128} value={form.currentPassword} onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /></label>
              <label className="block text-sm font-semibold text-slate-700">New password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /></label>
              <label className="block text-sm font-semibold text-slate-700">Confirm new password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /></label>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setPasswordDialog(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Change password"}</button></div>
          </form>
        </div>
      )}
    </>
  );
}
