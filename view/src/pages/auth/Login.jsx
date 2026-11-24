

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth.js";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(formData);
      const requestedPath = location.state?.from;
      const returnTo = typeof requestedPath?.pathname === "string"
        && requestedPath.pathname.startsWith("/")
        && !requestedPath.pathname.startsWith("//")
        && !requestedPath.pathname.startsWith("/\\")
        ? `${requestedPath.pathname}${requestedPath.search || ""}${requestedPath.hash || ""}`
        : "";
      navigate(returnTo || (result.user.role === "Admin" ? "/admin" : "/"), { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-[#f1f8f7] to-[#e6f2f0] px-5 py-16 sm:px-8">
      <section className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:p-10">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#00796B]">Welcome back</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-1px] text-gray-900">Sign in to NexTour</h1>
            <p className="mt-2 text-sm leading-7 text-gray-500">Your next great story starts here.</p>
          </div>

          {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-sm font-semibold text-slate-700">
              Email address
              <span className="mt-2 flex h-[46px] items-center gap-3 rounded-xl border border-gray-200 bg-[#f8faf9] px-4 transition-all duration-200 focus-within:border-[#00796B] focus-within:ring-4 focus-within:ring-[#00796B]/10">
                <FiMail className="shrink-0 text-slate-400" />
                <input type="email" name="email" autoComplete="email" required value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} placeholder="you@example.com" className="w-full bg-transparent text-sm font-normal outline-none placeholder:text-slate-400" />
              </span>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Password
              <span className="mt-2 flex h-[46px] items-center gap-3 rounded-xl border border-gray-200 bg-[#f8faf9] px-4 transition-all duration-200 focus-within:border-[#00796B] focus-within:ring-4 focus-within:ring-[#00796B]/10">
                <FiLock className="shrink-0 text-slate-400" />
                <input type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" required value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} placeholder="Enter your password" className="w-full bg-transparent text-sm font-normal outline-none placeholder:text-slate-400" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="rounded-full p-1 text-gray-400 transition-all duration-200 hover:-translate-y-[1px] hover:text-[#00796B]">{showPassword ? <FiEyeOff /> : <FiEye />}</button>
              </span>
            </label>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#006f68] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,111,104,0.18)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#005c56] hover:shadow-[0_6px_16px_rgba(0,111,104,0.25)] disabled:cursor-wait disabled:opacity-60">{loading ? "Signing in…" : "Sign in"}</button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">New to NexTour? <Link to="/register" state={location.state} className="font-semibold text-[#00796B] hover:text-[#006f68]">Create an account</Link></p>
      </section>
    </main>
  );
}
