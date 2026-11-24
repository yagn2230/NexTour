import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import {
    FiMap,
    FiMail,
    FiLock,
    FiPhone,
    FiUser,
    FiStar,
    FiUsers,
    FiMapPin,
} from "react-icons/fi";

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        agree: false,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            return setError("Passwords do not match.");
        }
        if (!formData.agree) {
            return setError("Please accept the Terms & Conditions.");
        }

        setLoading(true);
        try {
            const result = await authService.register({
                fullName: formData.fullName,
                email: formData.email,
                password: formData.password,
                phone: formData.phone,
            });

            if (!result.success) throw new Error(result.message);
            navigate("/login", { state: location.state });
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-[#f1f8f7] to-[#e6f2f0] px-5 py-16 sm:px-8">

            <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] md:grid-cols-2">

                {/* =========================================================
                    LEFT SIDE — Full-bleed Image with Soft Teal Wash
                ========================================================= */}
                <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#006f68] via-[#005c56] to-[#1a2e2b] p-10 md:flex">
                    <img
                        src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85"
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#003d38]/80 via-[#005c56]/55 to-[#102321]/75" />
                    <div className="pointer-events-none absolute -right-20 top-12 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-[#7dd3c8]/10 blur-3xl" />

                    {/* ---------- Content on top ---------- */}
                    <div className="relative z-10 flex h-full flex-col justify-between text-white">

                        {/* -------- Top: Logo + Heading -------- */}
                        <div>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/20 backdrop-blur-md ring-1 ring-white/30 shadow-lg">
                                    <FiMap className="text-[24px] text-white" />
                                </div>
                                <div className="flex items-center leading-none">
                                    <span className="text-[28px] font-black tracking-[-1.2px] text-white">
                                        Nex
                                    </span>
                                    <span className="text-[28px] font-black tracking-[-1.2px] text-[#a8e0d9]">
                                        Tour
                                    </span>
                                </div>
                            </div>

                            <h1 className="text-[34px] font-bold mb-3 leading-tight drop-shadow-lg">
                                Your next journey
                                <br />
                                starts here.
                            </h1>

                            <p className="max-w-sm text-sm leading-7 text-white/75">
                                Discover destinations, meet fellow travelers, and plan your next journey.
                            </p>
                        </div>

                        {/* -------- Bottom: Travel highlights -------- */}
                        <div>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { icon: FiUsers, label: "Connect" },
                                    { icon: FiMapPin, label: "Explore" },
                                    { icon: FiStar, label: "Plan" },
                                ].map(({ icon: Icon, label }) => {
                                    return (
                                        <div
                                            key={label}
                                            className="rounded-2xl bg-white/10 px-3 py-4 text-center"
                                        >
                                            <Icon
                                                size={18}
                                                className="mx-auto mb-2 text-[#7dd3c8]"
                                            />
                                            <p className="text-xs font-semibold text-white/90">
                                                {label}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>

                {/* =========================================================
                    RIGHT SIDE — Form
                ========================================================= */}
                <div className="p-8 md:p-10">

                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-bold text-gray-900">
                            Create Account
                        </h2>
                        <p className="text-gray-500 mt-2">
                            Join NexTour and start your next journey.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 rounded-xl bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Full Name */}
                        <div>
                            <label className="block mb-2 text-sm font-semibold text-gray-700">
                                Full Name
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all duration-200 focus-within:border-[#00796B] focus-within:ring-4 focus-within:ring-[#00796B]/10">
                                <FiUser className="text-gray-400 text-[17px]" />
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block mb-2 text-sm font-semibold text-gray-700">
                                Email Address
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all duration-200 focus-within:border-[#00796B] focus-within:ring-4 focus-within:ring-[#00796B]/10">
                                <FiMail className="text-gray-400 text-[17px]" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                                    required
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block mb-2 text-sm font-semibold text-gray-700">
                                Phone Number
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all duration-200 focus-within:border-[#00796B] focus-within:ring-4 focus-within:ring-[#00796B]/10">
                                <FiPhone className="text-gray-400 text-[17px]" />
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder="+91 9876543210"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block mb-2 text-sm font-semibold text-gray-700">
                                Password
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all duration-200 focus-within:border-[#00796B] focus-within:ring-4 focus-within:ring-[#00796B]/10">
                                <FiLock className="text-gray-400 text-[17px]" />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    minLength={8}
                                    maxLength={128}
                                    className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                                    required
                                />
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block mb-2 text-sm font-semibold text-gray-700">
                                Confirm Password
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all duration-200 focus-within:border-[#00796B] focus-within:ring-4 focus-within:ring-[#00796B]/10">
                                <FiLock className="text-gray-400 text-[17px]" />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                                    required
                                />
                            </div>
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer pt-1">
                            <input
                                type="checkbox"
                                name="agree"
                                checked={formData.agree}
                                onChange={handleChange}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#006f68] focus:ring-[#00796B] accent-[#006f68]"
                            />
                            <span>I agree to the Terms &amp; Conditions.</span>
                        </label>

                        {/* Register Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#006f68] to-[#00796B] hover:shadow-[0_8px_22px_rgba(0,111,104,0.35)] text-white py-3.5 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-[2px] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                        </button>

                    </form>

                    <p className="mt-8 text-center text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            state={location.state}
                            className="text-[#006f68] font-semibold hover:underline"
                        >
                            Sign In
                        </Link>
                    </p>

                </div>

            </div>
        </div>
    );
}