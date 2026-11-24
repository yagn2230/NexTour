import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isVerifiedOrganizer } from "../utils/organizerAccess";

export default function ProtectedRoute({
  children,
  requiredRole,
  requireOrganizer = false,
  allowAdmin = false,
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" role="status">
        Checking your access...
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/profile" replace />;
  }

  if (requireOrganizer && !(isVerifiedOrganizer(user) || (allowAdmin && user.role === "Admin"))) {
    return <Navigate to={user.role === "Admin" ? "/admin" : "/organizer/apply"} replace />;
  }

  return children || <Outlet />;
}
