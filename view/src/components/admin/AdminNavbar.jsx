import { useState } from "react";
import { FiLogOut, FiSearch } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";

const pageTitles = [
  ["/admin/dashboard", "Admin dashboard"],
  ["/admin/users", "User management"],
  ["/admin/organizers", "Organizer requests"],
  ["/admin/join-requests", "Join requests"],
  ["/admin/trips", "Trip management"],
  ["/admin/reports", "Reports & moderation"],
  ["/admin/analytics", "Platform analytics"],
  ["/admin/notifications", "Notifications"],
  ["/admin/settings", "Platform settings"],
  ["/admin/profile", "Admin profile"],
];

const AdminNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("users");
  const pageTitle =
    pageTitles.find(([path]) => location.pathname.startsWith(path))?.[1]
    || "Admin dashboard";
  const displayName = user?.fullName || user?.name || user?.email || "Administrator";

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.message || "Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;
    navigate(`/admin/${searchType}?search=${encodeURIComponent(query)}`);
    setSearchTerm("");
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{pageTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your NexTour platform</p>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <form onSubmit={handleSearch} className="flex h-[42px] min-w-0 items-center gap-2 rounded-xl border border-gray-200 bg-[#f8faf9] px-2 transition-all duration-200 focus-within:border-[#00796B] focus-within:ring-4 focus-within:ring-[#00796B]/10">
          <label className="sr-only" htmlFor="admin-search-type">Search section</label>
          <select id="admin-search-type" value={searchType} onChange={(event) => setSearchType(event.target.value)} aria-label="Search users or trips" className="max-w-24 bg-transparent text-xs font-semibold text-gray-600 outline-none">
            <option value="users">Users</option>
            <option value="trips">Trips</option>
          </select>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search..."
            aria-label={`Search ${searchType}`}
            className="w-28 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 sm:w-40"
          />
          <button type="submit" disabled={!searchTerm.trim()} aria-label="Submit admin search" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-white hover:text-[#00796B] disabled:opacity-40"><FiSearch aria-hidden="true" size={17} /></button>
        </form>

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#006f68] to-[#00796B] text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,111,104,0.25)]">
            {displayName.charAt(0).toUpperCase()}
          </span>
          <div className="hidden sm:block">
            <p className="max-w-44 truncate text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
        <button type="button" onClick={handleLogout} disabled={loggingOut} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50" aria-label="Log out of administrator account"><FiLogOut />{loggingOut ? "Logging out…" : "Logout"}</button>
      </div>
    </header>
  );
};

export default AdminNavbar;
