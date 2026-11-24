import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiImage,
  FiMapPin,
  FiMessageSquare,
  FiSettings,
  FiShield,
  FiStar,
  FiUsers,
} from "react-icons/fi";
import RupeeIcon from "../components/RupeeIcon";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ChatPage from "./ChatPage";
import CreateTrip from "./CreateTrip";
import { useAuth } from "../hooks/useAuth";
import { organizerService } from "../services/organizerService";
import { paymentService } from "../services/paymentService";
import { reportService } from "../services/reportService";
import { platformService } from "../services/platformService";
import { tripService } from "../services/tripService";
import { API_BASE_URL } from "../utils/api";
import { formatCurrency } from "../utils/formatters";
import { isVerifiedOrganizer } from "../utils/organizerAccess";
import { DEFAULT_TRIP_CATEGORIES } from "../constants/tripCategories";

const ProfilePage = lazy(() => import("./Profile/ProfilePage"));

const imageUrl = (image) => {
  const url = typeof image === "string" ? image : image?.url;
  if (!url || /^(https?:|data:|blob:)/i.test(url)) return url || "";
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

const dateKey = (value) => {
  if (!value) return "";
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const displayDate = (value, options = { month: "short", day: "numeric", year: "numeric" }) => {
  const key = dateKey(value);
  if (!key) return "Date not set";
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, options);
};

const locationLabel = (trip) => [trip.city || trip.destination, trip.state, trip.country].filter(Boolean).join(", ");
const tripMembers = (trip) => (trip.members || []).filter((member) => member.role === "TripMate");
const tripRevenue = (trip) => tripMembers(trip).length * Number(trip.pricePerPerson || 0);
const tripTransportations = ["Car", "Bus", "Train", "Flight", "Bike", "Other"];

const workspaceItems = [
  { label: "Dashboard", section: "dashboard-overview", to: "/organizer/dashboard#dashboard-overview", path: "/organizer/dashboard", hash: "#dashboard-overview", Icon: FiClipboard },
  { label: "My Trips", section: "dashboard-trips", to: "/organizer/dashboard#dashboard-trips", path: "/organizer/dashboard", hash: "#dashboard-trips", Icon: FiMapPin },
  { label: "Create Trip", section: "create-trip", to: "/create-trip", path: "/create-trip", Icon: FiMapPin },
  { label: "Trip Requests", section: "dashboard-requests", to: "/organizer/dashboard#dashboard-requests", path: "/organizer/dashboard", hash: "#dashboard-requests", Icon: FiMessageSquare },
  {
    label: "My Bookings",
    section: "dashboard-bookings",
    Icon: FiClipboard,
    children: [
      { label: "All Bookings", section: "dashboard-bookings", to: "/organizer/dashboard#dashboard-bookings", hash: "#dashboard-bookings" },
      { label: "Tripmates", section: "dashboard-members", to: "/organizer/dashboard#dashboard-members", hash: "#dashboard-members" },
    ],
  },
  { label: "Booking & Payments", section: "dashboard-payments", to: "/organizer/dashboard#dashboard-payments", path: "/organizer/dashboard", hash: "#dashboard-payments", Icon: FiCreditCard },
  { label: "Revenue & Analytics", section: "dashboard-revenue", to: "/organizer/dashboard#dashboard-revenue", path: "/organizer/dashboard", hash: "#dashboard-revenue", Icon: RupeeIcon },
  { label: "Reviews", section: "profile-reviews", to: "/profile?view=organizer#organizer-profile-section-reviews", path: "/profile", hash: "#organizer-profile-section-reviews", profileSection: "reviews", Icon: FiStar },
  { label: "Profile Settings", section: "profile-settings", to: "/profile?view=organizer#organizer-profile-section-settings", path: "/profile", hash: "#organizer-profile-section-settings", profileSection: "settings", Icon: FiSettings },
  { label: "Chats", section: "dashboard-chats", to: "/organizer/dashboard#dashboard-chats", path: "/organizer/dashboard", hash: "#dashboard-chats", Icon: FiMessageSquare },
  { label: "Calendar", section: "dashboard-calendar", to: "/organizer/dashboard#dashboard-calendar", path: "/organizer/dashboard", hash: "#dashboard-calendar", Icon: FiCalendar },
];

const profileItems = [
  { label: "Profile", section: "overview", Icon: FiGrid },
  { label: "Verification", section: "verification", Icon: FiShield },
  { label: "Documents", section: "documents", Icon: FiFileText },
  { label: "Notifications", section: "notifications", Icon: FiBell },
  { label: "Gallery", section: "gallery", Icon: FiImage },
];

const dashboardSections = new Map();
workspaceItems.forEach((item) => {
  [item, ...(item.children || [])]
    .filter(({ section }) => section.startsWith("dashboard-"))
    .forEach(({ label, section, Icon }) => {
      if (!dashboardSections.has(section)) dashboardSections.set(section, { label, id: section, Icon });
    });
});
const navItems = [...dashboardSections.values()];
const sectionLabels = Object.fromEntries([
  ...workspaceItems.map(({ label, section }) => [section, label]),
  ...profileItems.map(({ label, section }) => [`profile-${section}`, label]),
]);
const profileSections = Object.fromEntries([
  ...profileItems.map(({ section }) => [`profile-${section}`, section]),
  ...workspaceItems
    .filter(({ profileSection }) => profileSection)
    .map(({ section, profileSection }) => [section, profileSection]),
]);
const profileTabs = Object.fromEntries(
  Object.entries(profileSections).map(([tab, section]) => [section, tab]),
);

function organizerSidebarItemClass(selected, mobile) {
  return `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
    mobile ? "whitespace-nowrap" : "w-max whitespace-nowrap lg:w-full lg:whitespace-normal"
  } ${
    selected
      ? "bg-[#00796B] text-white shadow-sm"
      : "text-slate-600 hover:bg-[#f1f8f7] hover:text-[#00796B]"
  }`;
}

export function OrganizerSidebar({
  mobile = false,
  activeSection,
  onNavigate,
  activeProfileSection,
  onProfileSectionSelect,
  organizerStatus,
}) {
  const { user } = useAuth();
  const location = useLocation();
  const verified = organizerStatus
    ? organizerStatus === "Verified"
    : isVerifiedOrganizer(user);
  const profileNavigationItems = [
    ...profileItems,
    ...(!verified ? workspaceItems.filter(({ profileSection }) => profileSection) : []),
  ].map((item) => {
    const profileSection = item.profileSection || item.section;
    const hash = `#organizer-profile-section-${profileSection}`;
    return {
      ...item,
      profileSection,
      section: item.section?.startsWith("profile-")
        ? item.section
        : `profile-${profileSection}`,
      to: `/profile?view=organizer${hash}`,
      path: "/profile",
      hash,
    };
  });
  const [profileOverviewItem, ...profileDetailItems] = profileNavigationItems;

  const renderItem = ({ label, to, path, hash, Icon, children, profileSection, section }) => {
    const active = onNavigate
      ? activeSection === section
      : profileSection && location.pathname === "/profile" && onProfileSectionSelect
        ? activeProfileSection === profileSection
        : location.pathname === path && (!hash || location.hash === hash);
    const className = organizerSidebarItemClass(active, mobile);
    if (profileSection && location.pathname === "/profile" && onProfileSectionSelect) {
      return (
        <button
          key={label}
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={() => onProfileSectionSelect(profileSection)}
          className={className}
        >
          <Icon size={17} className="shrink-0" />
          <span>{label}</span>
        </button>
      );
    }

    if (onNavigate && section && !children) {
      return (
        <button
          key={label}
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={() => onNavigate(section)}
          className={className}
        >
          <Icon size={17} className="shrink-0" />
          <span>{label}</span>
        </button>
      );
    }

    if (children) {
      return (
        <div key={label} className={mobile ? "min-w-max" : ""}>
          <p className={`flex items-center gap-3 px-3 py-2 text-sm font-bold ${activeSection === section ? "text-[#00796B]" : "text-slate-500"}`}>
            <Icon size={17} className="shrink-0" />
            <span>{label}</span>
          </p>
          <div className={mobile
            ? "flex gap-1 pl-3"
            : "flex gap-1 pl-3 lg:block lg:space-y-1 lg:pl-4"}>
            {children.map((child) => {
              const childSelected = location.pathname === "/organizer/dashboard"
                && location.hash === child.hash;
              const childActive = onNavigate
                ? activeSection === child.section
                : childSelected;
              if (onNavigate) {
                return (
                  <button
                    key={child.label}
                    type="button"
                    aria-current={childActive ? "page" : undefined}
                    onClick={() => onNavigate(child.section)}
                    className={organizerSidebarItemClass(childActive, mobile)}
                  >
                    <span>{child.label}</span>
                  </button>
                );
              }
              return (
                <Link
                  key={child.label}
                  to={child.to}
                  aria-current={childActive ? "page" : undefined}
                  className={organizerSidebarItemClass(childActive, mobile)}
                >
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <Link
        key={label}
        to={to}
        aria-current={active ? "page" : undefined}
        className={className}
      >
        <Icon size={17} className="shrink-0" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <section className={`rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_8px_30px_rgba(15,23,42,0.04)] ${mobile ? "" : "lg:sticky lg:top-24"}`}>
      <div className="mb-3 flex items-center justify-between gap-3 px-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Organizer menu</p>
        {verified && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#f1f8f7] px-2.5 py-1 text-[11px] font-bold text-[#00796B]">
            <FiCheckCircle size={12} aria-hidden="true" />
            Verified
          </span>
        )}
      </div>
      <nav
        aria-label="Organizer workspace and profile"
        className={mobile
          ? "flex gap-1 overflow-x-auto pb-1"
          : "flex gap-1 overflow-x-auto pb-1 lg:block lg:max-h-[calc(100vh-8rem)] lg:space-y-1 lg:overflow-y-auto lg:pb-0"}
      >
        {profileOverviewItem && renderItem(profileOverviewItem)}
        {verified && (
          <p className={`${mobile ? "self-center" : "shrink-0 lg:shrink"} px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400`}>
            Workspace
          </p>
        )}
        {verified && workspaceItems.map(renderItem)}
        <p className={`${mobile ? "self-center" : "shrink-0 lg:shrink"} px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400`}>
          Profile details
        </p>
        {profileDetailItems.map(renderItem)}
      </nav>
    </section>
  );
}

function MetricCard({ label, value, note, Icon }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-800"><Icon size={19} /></span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{note}</p>
    </article>
  );
}

function DashboardOverview({ stats, trips }) {
  return (
    <section id="dashboard-overview" className="scroll-mt-24 space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Organizer overview</p>
        <h2 className="mt-1 text-xl font-black text-slate-900">Your hosting at a glance</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <MetricCard label="Total trips" value={stats.totalTrips ?? trips.length} note={`${stats.upcomingTrips ?? 0} upcoming · ${stats.completedTrips ?? 0} completed`} Icon={FiMapPin} />
        <MetricCard label="Active trips" value={stats.activeTrips ?? 0} note="Open trips accepting travelers" Icon={FiCalendar} />
        <MetricCard label="Completed trips" value={stats.completedTrips ?? 0} note="Trips completed to date" Icon={FiClipboard} />
        <MetricCard label="Accepted members" value={stats.totalMembers ?? 0} note="Trip Mates across your trips" Icon={FiUsers} />
        <MetricCard label="Pending requests" value={stats.pending ?? 0} note="Review requests and respond to travelers" Icon={FiMessageSquare} />
        <MetricCard label="Payments marked paid" value={formatCurrency(Number(stats.collectedRevenue || 0))} note="Demo amounts are simulated; cash is confirmed by the organizer" Icon={RupeeIcon} />
        <MetricCard label="Estimated revenue" value={formatCurrency(Number(stats.totalRevenue || 0))} note="Based on accepted members and per-person pricing" Icon={RupeeIcon} />
        <MetricCard label="Average rating" value={Number(stats.averageRating || 0).toFixed(1)} note={`${stats.reviewsCount || 0} traveler reviews`} Icon={FiStar} />
      </div>
    </section>
  );
}

function RevenueAnalytics() {
  const [period, setPeriod] = useState("monthly");
  const [analytics, setAnalytics] = useState(null);
  const [loadedPeriod, setLoadedPeriod] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    paymentService.getRevenueAnalytics(period)
      .then((response) => {
        if (active) {
          setAnalytics(response.data || null);
          setError("");
          setLoadedPeriod(period);
        }
      })
      .catch((loadError) => {
        if (active) {
          setAnalytics(null);
          setError(loadError.message || "Unable to load revenue analytics.");
          setLoadedPeriod(period);
        }
      })
    return () => { active = false; };
  }, [period]);

  const loading = loadedPeriod !== period;
  const series = analytics?.series || [];
  const maxRevenue = Math.max(...series.map((point) => point.revenue), 1);
  const points = series.map((point, index) => {
    const x = series.length < 2 ? 360 : 24 + (index * 672) / (series.length - 1);
    const y = 206 - (Number(point.revenue || 0) / maxRevenue) * 176;
    return { ...point, x, y };
  });
  const path = points.map(({ x, y }, index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ");
  const labels = {
    daily: "Last 14 days",
    weekly: "Last 12 weeks",
    monthly: "Last 12 months",
    yearly: "Last 5 years",
  };
  const totals = analytics?.totals || {};
  const growthLabel = totals.growthPercent == null
    ? "No previous-period baseline"
    : `${totals.growthPercent >= 0 ? "+" : ""}${totals.growthPercent.toFixed(1)}% vs previous period`;

  return (
    <section id="dashboard-revenue" className="scroll-mt-24 space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Revenue analytics</p>
        <h2 className="mt-1 text-xl font-black text-slate-900">Collected payment trends</h2>
        <p className="mt-1 text-sm text-slate-600">Based on successful demo and organizer-confirmed cash payments, not trip price estimates.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total collected" value={formatCurrency(Number(totals.totalRevenue || 0))} note="All payments recorded as paid" Icon={RupeeIcon} />
        <MetricCard label="Completed payments" value={totals.completedPayments || 0} note="Successful payment records" Icon={FiClipboard} />
        <MetricCard label="Pending payments" value={`${totals.pendingPayments || 0} · ${formatCurrency(Number(totals.pendingAmount || 0))}`} note="Awaiting demo or cash completion" Icon={FiCalendar} />
        <MetricCard label="Revenue growth" value={growthLabel} note={`${labels[period]} vs the previous equivalent period`} Icon={FiStar} />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Revenue over time</h3>
            <p className="mt-1 text-xs text-slate-500">{labels[period]} · {formatCurrency(Number(totals.currentPeriodRevenue || 0))} in this period</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" aria-label="Revenue chart period">
            {Object.keys(labels).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={period === option}
                onClick={() => setPeriod(option)}
                className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${period === option ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {loading ? (
          <p role="status" className="mt-5 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Loading revenue data…</p>
        ) : (
          <div className="mt-5">
            <svg viewBox="0 0 720 240" role="img" aria-label={`${labels[period]} collected revenue graph`} className="h-56 w-full overflow-visible">
              {[30, 74, 118, 162, 206].map((y) => <line key={y} x1="24" x2="696" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 5" />)}
              {path && <path d={`${path} L 696 206 L 24 206 Z`} fill="rgba(13, 148, 136, 0.10)" />}
              {path && <path d={path} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
              {points.map((point) => (
                <circle key={point.date} cx={point.x} cy={point.y} r="4" fill="#0f766e" stroke="white" strokeWidth="2">
                  <title>{new Date(point.date).toLocaleDateString()} · {formatCurrency(Number(point.revenue || 0))}</title>
                </circle>
              ))}
            </svg>
            {!points.some((point) => point.revenue > 0) && <p className="-mt-8 text-center text-sm text-slate-500">No completed payments in this period yet.</p>}
            <div className="mt-2 flex justify-between text-[11px] text-slate-500">
              <span>{points[0] ? new Date(points[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }) : ""}</span>
              <span>{points[points.length - 1] ? new Date(points[points.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }) : ""}</span>
            </div>
          </div>
        )}
      </div>
      {!!analytics?.revenueByTrip?.length && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="font-bold text-slate-900">Collected revenue by trip</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {analytics.revenueByTrip.map((trip) => (
              <li key={trip.tripId} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 truncate font-semibold text-slate-700">{trip.title}<span className="ml-2 text-xs font-normal text-slate-500">{trip.payments} payments</span></span>
                <strong className="shrink-0 text-slate-900">{formatCurrency(Number(trip.revenue || 0))}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function TripCalendar({ trips }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const todayKey = dateKey(new Date());
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) return null;
    const date = new Date(year, monthIndex, day);
    const key = dateKey(date);
    const events = trips.filter((trip) => {
      const start = dateKey(trip.startDate);
      const end = dateKey(trip.endDate) || start;
      return start && start <= key && end >= key;
    });
    return { day, key, events };
  });
  const upcoming = trips
    .filter((trip) => dateKey(trip.startDate) >= todayKey && !["Completed", "Cancelled"].includes(trip.status))
    .sort((a, b) => dateKey(a.startDate).localeCompare(dateKey(b.startDate)))
    .slice(0, 4);

  return (
    <section id="dashboard-calendar" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Trip calendar</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
        </div>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><FiChevronLeft /></button>
          <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><FiChevronRight /></button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-7 text-center text-[11px] font-bold uppercase text-slate-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => <span key={weekday} className="pb-2">{weekday}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => (
          <div key={cell?.key || `empty-${index}`} className={`min-h-[54px] rounded-lg p-1 text-center sm:min-h-[66px] ${cell?.key === todayKey ? "bg-teal-50 ring-1 ring-teal-200" : ""}`}>
            {cell && (
              <>
                <span className={`text-xs font-semibold ${cell.events.length ? "text-teal-800" : "text-slate-600"}`}>{cell.day}</span>
                {cell.events.slice(0, 2).map((trip) => <span key={trip._id} title={trip.title} className="mt-1 block truncate rounded bg-teal-100 px-1 text-left text-[9px] font-bold text-teal-900">{trip.title}</span>)}
                {cell.events.length > 2 && <span className="block text-[9px] text-slate-500">+{cell.events.length - 2} more</span>}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-800">Upcoming trips</h3>
        {upcoming.length ? <ul className="mt-2 divide-y divide-slate-100">{upcoming.map((trip) => <li key={trip._id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="truncate font-medium text-slate-700">{trip.title}</span><time className="shrink-0 text-xs text-slate-500">{displayDate(trip.startDate, { month: "short", day: "numeric" })}</time></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No upcoming trips scheduled.</p>}
      </div>
    </section>
  );
}

function TripManagement({ trips, onEdit, onDelete, onSetStatus, onNavigate, statusBusyId }) {
  const navigate = useNavigate();
  const todayKey = dateKey(new Date());
  const openTripDetails = (event, trip) => {
    if (event.target.closest("a, button")) return;
    navigate(`/explore/${trip._id}`);
  };
  const handleCardKeyDown = (event, trip) => {
    if (event.target !== event.currentTarget || event.key !== "Enter") return;
    event.preventDefault();
    navigate(`/explore/${trip._id}`);
  };
  return (
    <section id="dashboard-trips" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Trip management</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Your trips</h2>
        </div>
        <button type="button" onClick={() => onNavigate("create-trip")} className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-900">Create trip</button>
      </div>
      {trips.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {trips.map((trip) => {
            const mates = tripMembers(trip);
            const status = trip.approvalStatus === "Pending" ? "Pending approval" : trip.status || trip.approvalStatus || "Planned";
            const tripBudget = trip.totalBudget ?? trip.budget ?? trip.price;
            const maxMembers = Number(trip.maxMembers);
            const budgetPerPerson = tripBudget != null && tripBudget !== "" && Number.isFinite(Number(tripBudget))
              && Number.isInteger(maxMembers) && maxMembers > 0
              ? Number(tripBudget) / maxMembers
              : null;
            return (
              <article
                key={trip._id}
                role="group"
                tabIndex={0}
                aria-label={`Trip details: ${trip.title || "Untitled trip"}`}
                onClick={(event) => openTripDetails(event, trip)}
                onKeyDown={(event) => handleCardKeyDown(event, trip)}
                className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                <div className="relative h-40 bg-gradient-to-br from-teal-50 to-slate-100">
                  {imageUrl(trip.coverImage) && <img src={imageUrl(trip.coverImage)} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-700">{status}</span>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{trip.title}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><FiMapPin size={14} />{locationLabel(trip) || "Destination not set"}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><FiCalendar size={14} />{displayDate(trip.startDate)} – {displayDate(trip.endDate)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-3 border-y border-slate-100 py-3">
                    <div>
                      <p className="text-xs text-slate-500">Trip budget</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">
                        {tripBudget != null && tripBudget !== ""
                          ? formatCurrency(Number(tripBudget))
                          : "Not specified"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Budget per person</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">
                        {budgetPerPerson == null ? "Not available" : formatCurrency(budgetPerPerson)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Join price per person</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">
                        {trip.pricePerPerson == null || trip.pricePerPerson === ""
                          ? "Not set"
                          : formatCurrency(Number(trip.pricePerPerson))}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600"><FiUsers className="mr-1 inline" />{mates.length} / {Math.max(0, Number(trip.maxMembers || 0) - 1)} members</p>
                    <p className="text-right text-sm font-bold text-slate-800">{formatCurrency(tripRevenue(trip))} est. revenue</p>
                    <p className="col-span-2 text-xs text-slate-500">Budget per person uses the trip budget ÷ maximum members ({maxMembers || 0}, including organizer). {Math.max(0, Number(trip.maxMembers || 0) - Number(trip.currentMembers || 0))} remaining seats.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {trip.approvalStatus === "Approved" && <Link to={`/explore/${trip._id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50">View</Link>}
                    {trip.approvalStatus === "Approved" && ["Open", "Full"].includes(trip.status) && dateKey(trip.startDate) && dateKey(trip.startDate) <= todayKey && (
                      <button type="button" disabled={statusBusyId === trip._id} onClick={() => onSetStatus(trip, "Ongoing")} className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-900 hover:bg-teal-100 disabled:opacity-50">{statusBusyId === trip._id ? "Updating…" : "Mark ongoing"}</button>
                    )}
                    {trip.approvalStatus === "Approved" && trip.status === "Ongoing" && dateKey(trip.endDate) && dateKey(trip.endDate) <= todayKey && (
                      <button type="button" disabled={statusBusyId === trip._id} onClick={() => onSetStatus(trip, "Completed")} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50">{statusBusyId === trip._id ? "Updating…" : "Mark completed"}</button>
                    )}
                    <button type="button" onClick={() => onEdit(trip)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Edit</button>
                    <button type="button" onClick={() => onNavigate("dashboard-members")} className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50">Manage members</button>
                    <button type="button" onClick={() => onNavigate("dashboard-requests")} className="rounded-lg bg-teal-50 px-3 py-2 text-center text-xs font-bold text-teal-900 hover:bg-teal-100">Manage requests</button>
                    <button type="button" onClick={() => onDelete(trip)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Delete trip</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="font-bold text-slate-900">No trips yet</h3>
          <p className="mt-2 text-sm text-slate-600">Create a trip to start managing travelers, dates, and revenue estimates.</p>
        </div>
      )}
    </section>
  );
}

function MemberOverview({ trips, bookings, onRemove, onNavigate }) {
  const members = useMemo(() => trips.flatMap((trip) => tripMembers(trip)
    .filter((member) => member.user)
    .map((member) => {
      const travelerId = member.user._id || member.user;
      const booking = bookings.find((entry) => (
        entry.trip?._id?.toString() === trip._id?.toString()
        && entry.traveler?._id?.toString() === travelerId.toString()
      ));
      return { member, trip, booking };
    })), [trips, bookings]);

  return (
    <section id="dashboard-members" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Tripmates</p><h2 className="mt-1 text-xl font-black text-slate-900">Travelers on your trips</h2></div>
        <button type="button" onClick={() => onNavigate("dashboard-requests")} className="text-sm font-bold text-teal-800 hover:underline">View requests</button>
      </div>
      {members.length ? (
        <ul className="mt-4 divide-y divide-slate-100">
          {members.map(({ member, trip, booking }, index) => {
            const user = member.user;
            return <li key={`${trip._id}-${user._id || index}`} className="flex items-center gap-3 py-3">
              {imageUrl(user.profileImage) ? <img src={imageUrl(user.profileImage)} alt="" className="h-10 w-10 rounded-full object-cover" loading="lazy" /> : <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-teal-50 font-bold text-teal-800">{(user.fullName || "T").slice(0, 1).toUpperCase()}</span>}
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{user.fullName || user.username || "Traveler"}</span><span className="block truncate text-xs text-slate-500">{user.email || "Email not provided"}{user.phone ? ` · ${user.phone}` : ""}</span><span className="block truncate text-xs text-slate-500">{trip.title} · joined {displayDate(member.joinedAt, { month: "short", day: "numeric", year: "numeric" })}</span><span className="block truncate text-xs text-slate-500">Booking: {booking?.bookingStatus || "No booking record"} · Payment: {booking?.paymentStatus || "—"}</span></span>
              <div className="flex shrink-0 flex-col gap-1">
                <Link to={`/travelers/${user.username || user._id}`} className="text-xs font-bold text-teal-800 hover:underline">View profile</Link>
                <button type="button" onClick={() => onRemove(trip, user)} className="text-left text-xs font-bold text-red-700 hover:underline">Remove</button>
              </div>
            </li>;
          })}
        </ul>
      ) : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Accepted Trip Mates will appear here.</p>}
    </section>
  );
}

function AllBookings({ bookings, onNavigate, onMarkAttendance, attendanceBusyId, onReportNoShow }) {
  return (
    <section id="dashboard-bookings" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">My bookings</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">All trip bookings</h2>
        </div>
        <button type="button" onClick={() => onNavigate("dashboard-payments")} className="text-sm font-bold text-teal-800 hover:underline">Manage payments</button>
      </header>
      {bookings.length ? (
        <div className="mt-4 divide-y divide-slate-100">
          {bookings.map((booking) => (
            <article key={booking._id} className="flex flex-wrap items-center gap-3 py-4">
              {imageUrl(booking.traveler?.profileImage)
                ? <img src={imageUrl(booking.traveler.profileImage)} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" />
                : <span className="grid h-11 w-11 place-items-center rounded-full bg-teal-50 font-bold text-teal-800">{(booking.traveler?.fullName || "T").slice(0, 1).toUpperCase()}</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{booking.traveler?.fullName || booking.traveler?.username || "Traveler"}</p>
                <p className="truncate text-xs text-slate-600">{booking.trip?.title || "Trip"} · {locationLabel(booking.trip || {}) || "Destination not set"}</p>
                <p className="text-xs text-slate-500">Booked {displayDate(booking.createdAt, { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{booking.bookingStatus}</p>
                <p className="text-xs text-slate-500">Payment: {booking.paymentStatus}</p>
                <p className="text-xs font-semibold text-slate-700">{formatCurrency(Number(booking.amount || 0))} · {booking.paymentMethod}</p>
                <p className="text-xs text-slate-500">Attendance: {booking.attendanceStatus || "Unmarked"}</p>
              </div>
              {booking.traveler?.username && <Link to={`/travelers/${booking.traveler.username}`} className="text-xs font-bold text-teal-800 hover:underline">View profile</Link>}
              <AttendanceControl booking={booking} busy={attendanceBusyId === booking._id} onMark={onMarkAttendance} onReport={onReportNoShow} />
            </article>
          ))}
        </div>
      ) : <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Accepted bookings will appear here.</p>}
    </section>
  );
}

function AttendanceControl({ booking, busy, onMark, onReport }) {
  const [status, setStatus] = useState("Present");
  const tripStarted = booking.trip?.startDate && new Date(booking.trip.startDate) <= new Date();
  const tripEnd = booking.trip?.endDate ? new Date(booking.trip.endDate) : null;
  if (tripEnd) tripEnd.setUTCHours(23, 59, 59, 999);
  const tripEnded = tripEnd && tripEnd < new Date();

  if (
    booking.attendanceStatus === "No-Show"
    && Number(booking.traveler?.noShowCount || 0) >= 2
  ) {
    return <button type="button" onClick={() => onReport(booking)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Report repeated no-shows</button>;
  }
  if (
    !tripStarted
    || booking.attendanceStatus && booking.attendanceStatus !== "Unmarked"
    || !["Accepted", "Confirmed"].includes(booking.bookingStatus)
  ) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`attendance-${booking._id}`}>Attendance for {booking.traveler?.fullName || "Trip Mate"}</label>
      <select id={`attendance-${booking._id}`} value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700">
        <option value="Present">Present</option>
        <option value="Late">Late</option>
        <option value="No-Show" disabled={!tripEnded}>Absent (No-Show)</option>
      </select>
      <button type="button" disabled={busy || (status === "No-Show" && !tripEnded)} onClick={() => onMark(booking, status)} className="rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Mark attendance"}</button>
    </div>
  );
}

function JoinRequestManagement({ trips, onChanged }) {
  const [selectedTripId, setSelectedTripId] = useState(trips[0]?._id || "");
  const [requestResult, setRequestResult] = useState({ tripId: "", detail: null, error: "" });
  const [processingId, setProcessingId] = useState("");

  useEffect(() => {
    if (!selectedTripId) {
      return undefined;
    }
    let active = true;
    organizerService.getTripRequests(selectedTripId)
      .then((response) => {
        if (active) setRequestResult({ tripId: selectedTripId, detail: response.data || null, error: "" });
      })
      .catch((loadError) => {
        if (active) setRequestResult({
          tripId: selectedTripId,
          detail: null,
          error: loadError.message || "Unable to load join requests.",
        });
      });
    return () => { active = false; };
  }, [selectedTripId]);

  const visibleDetail = requestResult.tripId === selectedTripId ? requestResult.detail : null;
  const loading = Boolean(selectedTripId && requestResult.tripId !== selectedTripId);
  const error = requestResult.tripId === selectedTripId ? requestResult.error : "";
  const decideRequest = async (request, decision) => {
    const applicantName = request.applicant?.name || "this traveler";
    const actionLabel = decision === "accept" ? "Accept" : "Reject";
    if (!window.confirm(`${actionLabel} ${applicantName}'s request to join ${visibleDetail?.trip?.title || "this trip"}?`)) return;
    setProcessingId(request.id);
    try {
      if (decision === "accept") await organizerService.acceptRequest(request.id);
      else await organizerService.rejectRequest(request.id);
      onChanged();
    } catch (actionError) {
      setRequestResult((current) => ({
        ...current,
        error: actionError.message || "Unable to update this join request.",
      }));
    } finally {
      setProcessingId("");
    }
  };

  const pendingCount = visibleDetail?.counts?.pending || 0;
  return (
    <section id="dashboard-requests" className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Traveler management</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Join requests</h2>
          <p className="mt-1 text-sm text-slate-600">{pendingCount} pending request{pendingCount === 1 ? "" : "s"} to review</p>
        </div>
        {trips.length > 0 && (
          <label className="w-full text-xs font-bold text-slate-600 sm:w-auto">
            Trip
            <select value={selectedTripId} onChange={(event) => setSelectedTripId(event.target.value)} className="mt-1 block h-10 w-full min-w-52 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 sm:w-auto">
              {trips.map((trip) => <option key={trip._id} value={trip._id}>{trip.title}</option>)}
            </select>
          </label>
        )}
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {loading ? (
        <p role="status" className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Loading join requests…</p>
      ) : !trips.length ? (
        <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-600">Create a trip before managing join requests.</p>
      ) : visibleDetail?.requests?.length ? (
        <div className="divide-y divide-slate-100">
          {visibleDetail.requests.map((request) => (
            <article key={request.id} className="flex flex-wrap items-start gap-3 py-4 first:pt-1 last:pb-1">
              {imageUrl(request.applicant?.profileImage)
                ? <img src={imageUrl(request.applicant.profileImage)} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" />
                : <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-50 font-bold text-teal-800">{(request.applicant?.name || "T").slice(0, 1).toUpperCase()}</span>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">{request.applicant?.name || "Traveler"}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${request.status === "Pending" ? "bg-amber-50 text-amber-800" : request.status === "Accepted" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{request.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{request.applicant?.email || "No email provided"}{request.applicant?.phone ? ` · ${request.applicant.phone}` : ""}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Reliability {request.applicant?.reliability?.reliabilityScore ?? 100}% · Attendance {request.applicant?.reliability?.attendancePercentage ?? 100}% · {request.applicant?.reliability?.noShowCount || 0} no-show(s) · {request.applicant?.reliability?.cancelledTrips || 0} cancellation(s)
                  {request.applicant?.noShowRestrictedUntil && new Date(request.applicant.noShowRestrictedUntil) > new Date() ? ` · restricted until ${displayDate(request.applicant.noShowRestrictedUntil)}` : ""}
                </p>
                {request.message && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-700">{request.message}</p>}
                {request.applicant?.username && <Link to={`/travelers/${request.applicant.username}`} className="mt-2 inline-flex text-xs font-bold text-teal-800 hover:underline">View traveler profile</Link>}
              </div>
              {request.status === "Pending" && (
                <div className="flex shrink-0 gap-2">
                  <button type="button" disabled={Boolean(processingId)} onClick={() => decideRequest(request, "reject")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{processingId === request.id ? "Updating…" : "Reject"}</button>
                  <button type="button" disabled={Boolean(processingId) || visibleDetail.trip.remainingSeats <= 0 || visibleDetail.trip.pricePerPerson == null} onClick={() => decideRequest(request, "accept")} title={visibleDetail.trip.pricePerPerson == null ? "Set a per-person price before accepting requests." : undefined} className="rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white hover:bg-teal-900 disabled:opacity-50">{processingId === request.id ? "Updating…" : "Accept"}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : visibleDetail ? (
        <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-600">No join requests for {visibleDetail.trip.title || "this trip"} yet.</p>
      ) : null}
    </section>
  );
}

function PaymentManagement({ bookings, stats, loading, error, onChanged }) {
  const [processingId, setProcessingId] = useState("");
  const [actionError, setActionError] = useState("");

  const cancelBooking = async (booking) => {
    const traveler = booking.traveler?.fullName || "this traveler";
    const trip = booking.trip?.title || "this trip";
    const prompt = `Cancel ${traveler}'s pending booking for ${trip}?`;
    if (!window.confirm(prompt)) return;
    setProcessingId(booking._id);
    setActionError("");
    try {
      await paymentService.cancel(booking._id);
      onChanged();
    } catch (actionError) {
      setActionError(actionError.message || "Unable to cancel the pending booking.");
    } finally {
      setProcessingId("");
    }
  };

  const confirmCashReceived = async (booking) => {
    const traveler = booking.traveler?.fullName || "this traveler";
    const trip = booking.trip?.title || "this trip";
    const prompt = `Confirm that you received ${formatCurrency(Number(booking.amount || 0))} in cash from ${traveler} for ${trip}?`;
    if (!window.confirm(prompt)) return;
    setProcessingId(booking._id);
    setActionError("");
    try {
      await paymentService.markCashPaid(booking._id);
      onChanged();
    } catch (actionError) {
      setActionError(actionError.message || "Unable to confirm cash received.");
    } finally {
      setProcessingId("");
    }
  };

  const confirmCashRefunded = async (booking) => {
    const traveler = booking.traveler?.fullName || "this traveler";
    if (!window.confirm(`Confirm that you returned ${formatCurrency(Number(booking.amount || 0))} in cash to ${traveler}?`)) return;
    setProcessingId(booking._id);
    setActionError("");
    try {
      await paymentService.markCashRefunded(booking._id);
      onChanged();
    } catch (actionError) {
      setActionError(actionError.message || "Unable to confirm the cash refund.");
    } finally {
      setProcessingId("");
    }
  };

  return (
    <section id="dashboard-payments" className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Booking management</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Bookings and payments</h2>
          <p className="mt-1 text-xs text-slate-500">Demo payments are simulated for development only; confirm cash after receiving it.</p>
        </div>
        <div className="flex gap-4 text-sm">
          <p><span className="block text-xs text-slate-500">Marked paid</span><strong className="text-emerald-800">{formatCurrency(Number(stats.paidRevenue || 0))}</strong></p>
          <p><span className="block text-xs text-slate-500">Awaiting payment</span><strong className="text-amber-800">{stats.pendingPayments || 0}</strong></p>
        </div>
      </div>
      {(error || actionError) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error || actionError}</p>}
      {loading ? (
        <p role="status" className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Loading payment records…</p>
      ) : bookings.length ? (
        <div className="divide-y divide-slate-100">
          {bookings.map((booking) => (
            <article key={booking._id} className="flex flex-wrap items-center gap-3 py-3 first:pt-1 last:pb-1">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-slate-900">{booking.trip?.title || "Deleted trip"}</h3>
                <p className="mt-1 text-xs text-slate-600">{booking.traveler?.fullName || booking.traveler?.username || "Traveler"} · {booking.bookingStatus} · {booking.paymentStatus} · {booking.paymentMethod}</p>
                {!!booking.transactionHistory?.length && (
                  <details className="mt-2 text-xs text-slate-600">
                    <summary className="w-fit cursor-pointer font-semibold text-teal-800">Transaction history ({booking.transactionHistory.length})</summary>
                    <ul className="mt-2 space-y-1">
                      {booking.transactionHistory.map((transaction) => (
                        <li key={transaction._id}>
                          {transaction.status} · {formatCurrency(Number(transaction.amount || 0))} · {displayDate(transaction.createdAt)}
                          {transaction.note ? ` · ${transaction.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              <strong className="text-sm text-slate-900">{formatCurrency(Number(booking.amount || 0))}</strong>
              {booking.bookingStatus === "Accepted" && ["Pending", "Cash Payment Pending"].includes(booking.paymentStatus) && (
                <div className="flex flex-wrap gap-2">
                  {booking.paymentMethod === "Cash" && (
                    <button type="button" disabled={Boolean(processingId)} onClick={() => confirmCashReceived(booking)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{processingId === booking._id ? "Updating…" : "Confirm cash received"}</button>
                  )}
                  <button type="button" disabled={Boolean(processingId)} onClick={() => cancelBooking(booking)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">{processingId === booking._id ? "Cancelling…" : "Cancel booking"}</button>
                </div>
              )}
              {booking.bookingStatus === "Cancelled" && booking.paymentMethod === "Cash" && booking.paymentStatus === "Refund Pending" && (
                <button type="button" disabled={Boolean(processingId)} onClick={() => confirmCashRefunded(booking)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{processingId === booking._id ? "Updating…" : "Confirm cash refund returned"}</button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-600">Payment records appear here when a join request is accepted.</p>
      )}
    </section>
  );
}

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => (
    sectionLabels[location.hash.slice(1)] ? location.hash.slice(1) : "dashboard-overview"
  ));
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [paymentStats, setPaymentStats] = useState({});
  const [stats, setStats] = useState(null);
  const [tripCategories, setTripCategories] = useState(DEFAULT_TRIP_CATEGORIES);
  const [tripCategoriesError, setTripCategoriesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editingTrip, setEditingTrip] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [savingAction, setSavingAction] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState("");
  const [attendanceBusyId, setAttendanceBusyId] = useState("");

  useEffect(() => {
    let active = true;
    platformService.getSettings()
      .then((response) => {
        const categories = response.data?.tripCategories;
        if (!Array.isArray(categories) || !categories.length) throw new Error("The server returned an invalid trip categories list.");
        if (active) {
          setTripCategories(categories);
          setTripCategoriesError("");
        }
      })
      .catch((settingsError) => {
        if (active) setTripCategoriesError(settingsError.message || "Unable to load current trip categories.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      organizerService.getTrips(),
      organizerService.getDashboardStats(),
      paymentService.getOrganizerPayments(),
    ])
      .then(([tripResponse, statsResponse, paymentResponse]) => {
        if (!active) return;
        setTrips(tripResponse.data || []);
        setStats(statsResponse.data || null);
        setBookings(paymentResponse.data || []);
        setPaymentStats(paymentResponse.stats || {});
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load the organizer dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  const dashboardStats = stats || {};
  const startEditingTrip = (trip) => {
    setError("");
    setEditingTrip(trip);
    setEditForm({
      title: trip.title || "",
      description: trip.description || "",
      city: trip.city || trip.destination || "",
      state: trip.state || "",
      country: trip.country || "",
      startDate: dateKey(trip.startDate),
      endDate: dateKey(trip.endDate),
      totalBudget: trip.totalBudget ?? "",
      pricePerPerson: trip.pricePerPerson ?? "",
      maxMembers: trip.maxMembers ?? 1,
      category: trip.category || "Other",
      transportation: trip.transportation || "Other",
    });
  };
  const refreshDashboard = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };
  const markTravelerAttendance = async (booking, attendanceStatus) => {
    setAttendanceBusyId(booking._id);
    setError("");
    try {
      await organizerService.markAttendance(booking._id, attendanceStatus);
      refreshDashboard();
    } catch (attendanceError) {
      setError(attendanceError.message || "Unable to update trip attendance.");
    } finally {
      setAttendanceBusyId("");
    }
  };
  const reportRepeatedNoShows = async (booking) => {
    const travelerId = booking.traveler?._id;
    if (!travelerId) {
      toast.error("This booking has no traveler account to report.");
      return;
    }
    const reason = window.prompt(`Describe the repeated no-show concern for ${booking.traveler?.fullName || "this traveler"}:`);
    if (!reason) return;
    try {
      await reportService.submit("User", travelerId, reason);
      toast.success("No-show concern submitted to administrators.");
    } catch (reportError) {
      toast.error(reportError.message || "Unable to submit the report.");
    }
  };
  const updateTripStatus = async (trip, status) => {
    setStatusBusyId(trip._id);
    setError("");
    try {
      await organizerService.updateTripStatus(trip._id, status);
      refreshDashboard();
    } catch (statusError) {
      setError(statusError.message || "Unable to update this trip status.");
    } finally {
      setStatusBusyId("");
    }
  };
  const saveTrip = async (event) => {
    event.preventDefault();
    if (!editingTrip || !editForm) return;
    const pricePerPerson = editForm.pricePerPerson === "" ? null : Number(editForm.pricePerPerson);
    const totalBudget = Number(editForm.totalBudget);
    const maxMembers = Number(editForm.maxMembers);
    if (!editForm.title.trim() || !editForm.city.trim() || !editForm.state.trim() || !editForm.country.trim()) {
      setError("Enter a trip title and complete destination.");
      return;
    }
    if (!editForm.startDate || !editForm.endDate || editForm.endDate < editForm.startDate) {
      setError("Choose valid trip dates. The end date cannot be before the start date.");
      return;
    }
    if (
      editForm.totalBudget === ""
      || !Number.isFinite(totalBudget)
      || totalBudget < 0
      || (pricePerPerson !== null && (!Number.isFinite(pricePerPerson) || pricePerPerson < 0))
    ) {
      setError("Budget and price per person must be valid non-negative amounts.");
      return;
    }
    if (!Number.isInteger(maxMembers) || maxMembers < Number(editingTrip.currentMembers || 1)) {
      setError(`Maximum members must be a whole number and cannot be lower than the current group size (${editingTrip.currentMembers || 1}).`);
      return;
    }
    setSavingAction(true);
    setError("");
    try {
      await tripService.updateTrip(editingTrip._id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        city: editForm.city.trim(),
        destination: editForm.city.trim(),
        state: editForm.state.trim(),
        country: editForm.country.trim(),
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        totalBudget,
        ...(pricePerPerson === null ? {} : { pricePerPerson }),
        maxMembers,
        category: editForm.category,
        transportation: editForm.transportation,
      });
      setEditingTrip(null);
      setEditForm(null);
      refreshDashboard();
    } catch (saveError) {
      setError(saveError.message || "Unable to update this trip.");
    } finally {
      setSavingAction(false);
    }
  };
  const confirmDashboardAction = async () => {
    if (!pendingAction) return;
    setSavingAction(true);
    setError("");
    try {
      if (pendingAction.kind === "delete-trip") {
        await organizerService.deleteTrip(pendingAction.trip._id);
      } else {
        await organizerService.removeMember(pendingAction.trip._id, pendingAction.member._id);
      }
      setPendingAction(null);
      refreshDashboard();
    } catch (actionError) {
      setError(actionError.message || "Unable to complete this action.");
    } finally {
      setSavingAction(false);
    }
  };
  const needsDashboardData = navItems.some(({ id }) => id === activeTab);

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24">
            <OrganizerSidebar activeSection={activeTab} onNavigate={setActiveTab} />
          </aside>
          <main className="min-w-0 space-y-6">
            <header>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Organizer workspace</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Organizer Dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Welcome{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : " back"}. Manage your hosting activity from one place.</p>
              </div>
            </header>

            {needsDashboardData && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => { setError(""); setLoading(true); setReloadKey((key) => key + 1); }} className="font-bold underline">Try again</button></div>}
            {needsDashboardData && loading && <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">Loading organizer dashboard…</p>}

            {needsDashboardData && !loading && !error && (
              <div id="organizer-dashboard-panel" role="tabpanel" aria-label={sectionLabels[activeTab]} tabIndex={0}>
                {activeTab === "dashboard-overview" && <DashboardOverview stats={dashboardStats} trips={trips} />}
                {activeTab === "dashboard-trips" && <TripManagement trips={trips} onEdit={startEditingTrip} onDelete={(trip) => setPendingAction({ kind: "delete-trip", trip })} onSetStatus={updateTripStatus} onNavigate={setActiveTab} statusBusyId={statusBusyId} />}
                {activeTab === "dashboard-requests" && <JoinRequestManagement trips={trips} onChanged={refreshDashboard} />}
                {activeTab === "dashboard-payments" && <PaymentManagement bookings={bookings} stats={paymentStats} loading={loading} error={error} onChanged={refreshDashboard} />}
                {activeTab === "dashboard-chats" && (
                  <section id="dashboard-chats" className="scroll-mt-24 space-y-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Traveler communication</p>
                      <h2 className="mt-1 text-xl font-black text-slate-900">Trip chats</h2>
                    </div>
                    <ChatPage embedded />
                  </section>
                )}
                {activeTab === "dashboard-bookings" && <AllBookings bookings={bookings} onNavigate={setActiveTab} onMarkAttendance={markTravelerAttendance} attendanceBusyId={attendanceBusyId} onReportNoShow={reportRepeatedNoShows} />}
                {activeTab === "dashboard-members" && <MemberOverview trips={trips} bookings={bookings} onRemove={(trip, member) => setPendingAction({ kind: "remove-member", trip, member })} onNavigate={setActiveTab} />}
                {activeTab === "dashboard-revenue" && <RevenueAnalytics />}
                {activeTab === "dashboard-calendar" && <TripCalendar trips={trips} />}
              </div>
            )}
            {activeTab === "create-trip" && <div role="tabpanel" aria-label={sectionLabels[activeTab]}><CreateTrip embedded onCreated={() => { refreshDashboard(); setActiveTab("dashboard-trips"); }} /></div>}
            {profileSections[activeTab] && (
              <div role="tabpanel" aria-label={sectionLabels[activeTab]}>
                <Suspense fallback={<p role="status" className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Loading profile section…</p>}>
                  <ProfilePage
                    embedded
                    initialRole="organizer"
                    organizerSection={profileSections[activeTab]}
                    onOrganizerSectionChange={(section) => setActiveTab(profileTabs[section] || "profile-overview")}
                  />
                </Suspense>
              </div>
            )}
          </main>
        </div>
      </div>
      {editingTrip && editForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !savingAction && setEditingTrip(null)}>
          <form role="dialog" aria-modal="true" aria-labelledby="edit-dashboard-trip-title" onSubmit={saveTrip} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Trip management</p><h2 id="edit-dashboard-trip-title" className="mt-1 text-xl font-black text-slate-900">Edit {editingTrip.title}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Trip title<input required maxLength={150} value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /></label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Description<textarea rows={3} maxLength={3000} value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /></label>
              <label className="text-sm font-semibold text-slate-700">City<input required value={editForm.city} onChange={(event) => setEditForm((current) => ({ ...current, city: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /></label>
              <label className="text-sm font-semibold text-slate-700">State / region<input required value={editForm.state} onChange={(event) => setEditForm((current) => ({ ...current, state: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /></label>
              <label className="text-sm font-semibold text-slate-700">Country<input required value={editForm.country} onChange={(event) => setEditForm((current) => ({ ...current, country: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /></label>
              <label className="text-sm font-semibold text-slate-700">Trip category<select value={editForm.category} onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-teal-700">{tripCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>{tripCategoriesError && <span role="status" className="mt-1 block text-xs font-normal text-amber-700">{tripCategoriesError}</span>}</label>
              <label className="text-sm font-semibold text-slate-700">Transportation<select value={editForm.transportation} onChange={(event) => setEditForm((current) => ({ ...current, transportation: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-teal-700">{tripTransportations.map((transportation) => <option key={transportation} value={transportation}>{transportation}</option>)}</select></label>
              <label className="text-sm font-semibold text-slate-700">Start date<input type="date" required value={editForm.startDate} onChange={(event) => setEditForm((current) => ({ ...current, startDate: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /></label>
              <label className="text-sm font-semibold text-slate-700">End date<input type="date" required min={editForm.startDate} value={editForm.endDate} onChange={(event) => setEditForm((current) => ({ ...current, endDate: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /></label>
              <label className="text-sm font-semibold text-slate-700">Total trip budget (INR)<input type="number" min="0" step="0.01" required value={editForm.totalBudget} onChange={(event) => setEditForm((current) => ({ ...current, totalBudget: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /></label>
              <label className="text-sm font-semibold text-slate-700">Price per person (INR)<input type="number" min="0" step="0.01" value={editForm.pricePerPerson} onChange={(event) => setEditForm((current) => ({ ...current, pricePerPerson: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /><span className="mt-1 block text-xs font-normal text-slate-500">Leave blank to keep the current price unchanged.</span></label>
              <label className="text-sm font-semibold text-slate-700">Maximum members<input type="number" min={editingTrip.currentMembers || 1} step="1" required value={editForm.maxMembers} onChange={(event) => setEditForm((current) => ({ ...current, maxMembers: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-700" /><span className="mt-1 block text-xs font-normal text-slate-500">Includes the organizer; cannot be lower than current members ({editingTrip.currentMembers}).</span></label>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={savingAction} onClick={() => setEditingTrip(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" disabled={savingAction} className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{savingAction ? "Saving…" : "Save changes"}</button></div>
          </form>
        </div>
      )}
      {pendingAction && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !savingAction && setPendingAction(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="organizer-action-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="organizer-action-title" className="text-xl font-black text-slate-900">{pendingAction.kind === "delete-trip" ? "Delete this trip?" : "Remove this member?"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{pendingAction.kind === "delete-trip" ? `Delete “${pendingAction.trip.title}”? This removes the trip from the organizer dashboard and cannot be undone.` : `Remove ${pendingAction.member.fullName || "this traveler"} from “${pendingAction.trip.title}”? Their membership and revenue estimate will be updated, and they will be notified.`}</p>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={savingAction} onClick={() => setPendingAction(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" disabled={savingAction} onClick={confirmDashboardAction} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{savingAction ? "Working…" : pendingAction.kind === "delete-trip" ? "Delete trip" : "Remove member"}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
