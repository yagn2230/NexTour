import { NavLink, useLocation } from "react-router-dom";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiBell,
  FiFileText,
  FiMap,
  FiShield,
  FiSettings,
  FiUsers,
} from "react-icons/fi";

const menuItems = [
  { title: "Dashboard", path: "/admin/dashboard", icon: FiActivity },
  {
    title: "User Management",
    icon: FiUsers,
    children: [
      { title: "All Users", path: "/admin/users" },
      { title: "Organizer Requests", path: "/admin/organizers" },
    ],
  },
  {
    title: "Trip Management",
    icon: FiMap,
    children: [
      { title: "Pending Trips", path: "/admin/trips?status=pending" },
      { title: "Approved Trips", path: "/admin/trips?status=approved" },
      { title: "Rejected Trips", path: "/admin/trips?status=rejected" },
      { title: "All Trips", path: "/admin/trips" },
    ],
  },
  {
    title: "Join Requests",
    icon: FiUsers,
    path: "/admin/join-requests",
  },
  {
    title: "Reports & Moderation",
    icon: FiShield,
    path: "/admin/reports",
  },
  {
    title: "No-Show Appeals",
    icon: FiAlertTriangle,
    path: "/admin/no-show-appeals",
  },
  {
    title: "Analytics",
    icon: FiBarChart2,
    path: "/admin/analytics",
  },
  {
    title: "Notifications",
    icon: FiBell,
    path: "/admin/notifications",
  },
  {
    title: "Platform Settings",
    icon: FiSettings,
    path: "/admin/settings",
  },
  {
    title: "Admin Profile",
    icon: FiFileText,
    path: "/admin/profile",
  },
];

const AdminSidebar = () => {
  const location = useLocation();

  const linkClass = (active) =>
    `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-[1px] ${
      active
        ? "bg-[#f1f8f7] text-[#00796B]"
        : "text-gray-600 hover:bg-[#f1f8f7] hover:text-[#00796B]"
    }`;

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-gray-100 bg-white md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-20 items-center gap-3 border-b border-gray-100 px-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#006f68] text-white shadow-[0_4px_12px_rgba(0,111,104,0.20)]">
          <FiMap size={22} />
        </span>
        <div>
          <h1 className="text-[27px] font-black tracking-[-1.2px] text-gray-900">NexTour</h1>
          <p className="text-xs font-semibold text-gray-500">Admin panel</p>
        </div>
      </div>

      <nav aria-label="Admin navigation" className="flex flex-1 gap-2 overflow-x-auto px-3 py-4 md:block md:space-y-5 md:overflow-visible">
        {menuItems.map((item) => {
          const Icon = item.icon;

          if (item.children) {
            return (
              <div key={item.title} className="min-w-max md:min-w-0">
                <p className="mb-2 flex items-center gap-2 px-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
                  <Icon size={16} />
                  {item.title}
                </p>
                <div className="flex gap-1 md:ml-2 md:block md:space-y-1">
                  {item.children.map((child) => {
                    const isActive = child.path.includes("?")
                      ? location.pathname === "/admin/trips"
                        && location.search === child.path.slice(child.path.indexOf("?"))
                      : location.pathname === child.path
                        || (child.path === "/admin/trips"
                          && location.pathname.startsWith("/admin/trips")
                          && !location.search);

                    return (
                      <NavLink key={child.path} to={child.path} className={linkClass(isActive)}>
                        {child.title}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={() => linkClass(location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))}
            >
              <Icon size={18} />
              {item.title}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
