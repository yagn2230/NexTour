import { lazy, Suspense } from 'react'
import './App.css'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar.jsx'
import LoadingSkeleton from './components/Profile/Common/LoadingSkeleton.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage.jsx'))
const Login = lazy(() => import('./pages/auth/Login.jsx'))
const Register = lazy(() => import('./pages/auth/Register.jsx'))
const HowItWorks = lazy(() => import('./pages/HowItWorks.jsx'))
const CreateTrip = lazy(() => import('./pages/CreateTrip.jsx'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'))
const Users = lazy(() => import('./pages/admin/Users.jsx'))
const UserDetails = lazy(() => import('./pages/admin/UserDetails.jsx'))
const Trips = lazy(() => import('./pages/admin/Trips.jsx'))
const TripDetails = lazy(() => import('./pages/admin/TripDetails.jsx'))
const EditTrip = lazy(() => import('./pages/admin/EditTrip.jsx'))
const OrganizerApplication = lazy(() => import('./pages/OrganizerApplication.jsx'))
const OrganizerRequests = lazy(() => import('./pages/admin/OrganizerRequests.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const JoinRequests = lazy(() => import('./pages/admin/JoinRequests.jsx'))
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics.jsx'))
const AdminNotifications = lazy(() => import('./pages/admin/Notifications.jsx'))
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile.jsx'))
const AdminReports = lazy(() => import('./pages/admin/Reports.jsx'))
const NoShowAppeals = lazy(() => import('./pages/admin/NoShowAppeals.jsx'))
const AdminSettings = lazy(() => import('./pages/admin/Settings.jsx'))
const ExploreTrips = lazy(() => import('./pages/ExploreTrips.jsx'))
const ExploreTripDetails = lazy(() => import('./pages/ExploreTripDetails.jsx'))
const OrganizerDashboardPage = lazy(() => import('./pages/OrganizerDashboardPage.jsx'))
const TravelerBookingsPage = lazy(() => import('./pages/TravelerBookingsPage.jsx'))
const TravelerRequestsPage = lazy(() => import('./pages/TravelerRequestsPage.jsx'))
const ChatPage = lazy(() => import('./pages/ChatPage.jsx'))
const PublicTravelerProfile = lazy(() => import('./pages/PublicTravelerProfile.jsx'))
import Home from './pages/Home.jsx'


function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Suspense fallback={<main className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><LoadingSkeleton /></main>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/explore" element={<ExploreTrips />} />
          <Route path="/explore/:tripId" element={<ExploreTripDetails />} />
          <Route path="/travelers/:identifier" element={<PublicTravelerProfile />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<ProfilePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/organizer/apply" element={<OrganizerApplication />} />
            <Route path="/bookings" element={<TravelerBookingsPage />} />
            <Route path="/my-requests" element={<TravelerRequestsPage />} />
            <Route path="/chats" element={<ChatPage />} />
            <Route path="/chats/:conversationId" element={<ChatPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/create-trip" element={<CreateTrip />} />
          </Route>
          <Route element={<ProtectedRoute requireOrganizer allowAdmin />}>
            <Route path="/organizer/dashboard" element={<OrganizerDashboardPage />} />
            <Route path="/organizer/requests" element={<Navigate to="/organizer/dashboard#dashboard-requests" replace />} />
            <Route path="/organizer/payments" element={<Navigate to="/organizer/dashboard#dashboard-payments" replace />} />
          </Route>
          <Route path="/admin" element={<ProtectedRoute requiredRole="Admin"><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="organizers" element={<OrganizerRequests />} />
            <Route path="users/:userId" element={<UserDetails />} />
            <Route path="join-requests" element={<JoinRequests />} />
            <Route path="trips" element={<Trips />} />
            <Route path="trips/:tripId" element={<TripDetails />} />
            <Route path="trips/:tripId/edit" element={<EditTrip />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="no-show-appeals" element={<NoShowAppeals />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      <main className="mx-auto flex max-w-3xl flex-col items-center px-5 py-24 text-center sm:px-8">
        <span className="rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">PAGE NOT FOUND</span>
        <h1 className="mt-6 text-4xl font-black tracking-[-1px] text-gray-900 sm:text-5xl">This trail ends here.</h1>
        <p className="mt-4 text-sm leading-7 text-gray-500">We couldn’t find the page you were looking for. Head back to NexTour and keep exploring.</p>
        <Link to="/" className="mt-7 flex items-center gap-2 rounded-xl bg-[#006f68] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,111,104,0.18)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#005c56] hover:shadow-[0_6px_16px_rgba(0,111,104,0.25)]">Back to home</Link>
      </main>
    </div>
  )
}

export default App
