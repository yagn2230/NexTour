import { useEffect, useState } from "react";
import { FiMessageCircle, FiX } from "react-icons/fi";
import RupeeIcon from "../components/RupeeIcon";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import TripReviewForm from "../components/TripReviewForm";
import { useAuth } from "../hooks/useAuth";
import { paymentService } from "../services/paymentService";
import { profileService } from "../services/profileService";
import { formatCurrency } from "../utils/formatters";

const dateLabel = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  : "—";

const statusClass = {
  Pending: "bg-amber-100 text-amber-900",
  "Cash Payment Pending": "bg-amber-100 text-amber-900",
  Paid: "bg-emerald-100 text-emerald-800",
  Failed: "bg-red-100 text-red-800",
  Refunded: "bg-violet-100 text-violet-800",
  "Not Required": "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-slate-100 text-slate-600",
};

export default function OrganizerPaymentsPage() {
  const { isAdmin } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [reviewsByTrip, setReviewsByTrip] = useState({});
  const [reviewError, setReviewError] = useState("");
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const loadPayments = async () => {
      try {
        const response = await paymentService.getOrganizerPayments();
        if (!active) return;
        setBookings(response.data || []);
        setStats(response.stats || {});
        setError("");
        const completedTripIds = [...new Set((response.data || [])
          .filter((booking) => booking.bookingStatus === "Confirmed" && booking.trip?.status === "Completed")
          .map((booking) => booking.trip?._id)
          .filter(Boolean))];
        Promise.all(completedTripIds.map(async (tripId) => {
          const reviewResponse = await profileService.getMyTripReviews(tripId);
          return [tripId.toString(), reviewResponse.data || []];
        }))
          .then((entries) => {
            if (active) {
              setReviewsByTrip(Object.fromEntries(entries));
              setReviewError("");
            }
          })
          .catch((reviewLoadError) => {
            if (active) setReviewError(reviewLoadError.message || "Unable to load your trip reviews.");
          });
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load payment records.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadPayments();
    return () => { active = false; };
  }, [refreshKey]);

  const cancelBooking = async (booking) => {
    const travelerName = booking.traveler?.fullName || "this traveler";
    const tripName = booking.trip?.title || "this trip";
    const prompt = `Cancel ${travelerName}'s pending booking for ${tripName}? This removes them from the trip and releases their seat.`;
    if (!window.confirm(prompt)) return;
    setProcessingId(booking._id);
    setError("");
    try {
      await paymentService.cancel(booking._id);
      setRefreshKey((key) => key + 1);
    } catch (actionError) {
      setError(actionError.message || "Unable to cancel the pending booking.");
    } finally {
      setProcessingId("");
    }
  };

  const confirmCashReceived = async (booking) => {
    const travelerName = booking.traveler?.fullName || "this traveler";
    const tripName = booking.trip?.title || "this trip";
    const prompt = `Confirm that you received ${formatCurrency(booking.amount)} in cash from ${travelerName} for ${tripName}?`;
    if (!window.confirm(prompt)) return;
    setProcessingId(booking._id);
    setError("");
    try {
      await paymentService.markCashPaid(booking._id);
      setRefreshKey((key) => key + 1);
    } catch (actionError) {
      setError(actionError.message || "Unable to confirm cash received.");
    } finally {
      setProcessingId("");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-6 px-5 py-9 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{isAdmin ? "Admin records" : "Organizer tools"}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Bookings and payments</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review bookings, confirm cash received, and cancel pending bookings. Demo payments are simulated for development only; no real money moves.
            </p>
          </div>
          <div className="flex gap-2">
            {!isAdmin && <Link to="/organizer/dashboard" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-700 hover:text-teal-800">Dashboard</Link>}
            <Link to="/chats" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-700 hover:text-teal-800"><FiMessageCircle />Chats</Link>
          </div>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        <section aria-label="Payment summary" className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Payments recorded as paid</p>
            <p className="mt-2 text-2xl font-black text-emerald-800">{formatCurrency(Number(stats.paidRevenue || 0))}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Awaiting payment</p>
            <p className="mt-2 text-2xl font-black text-amber-800">{stats.pendingPayments || 0}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Payment records</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.totalBookings || 0}</p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-black text-slate-900">Booking payment history</h2>
            <span className="text-xs text-slate-500">Showing the latest {bookings.length} records</span>
          </div>
          {loading ? (
            <p role="status" className="p-8 text-center text-sm font-semibold text-slate-500">Loading payment records…</p>
          ) : bookings.length ? (
            <div className="divide-y divide-slate-100">
              {bookings.map((booking) => (
                <article key={booking._id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(150px,0.7fr)_minmax(140px,0.6fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-900">{booking.trip?.title || "Deleted trip"}</h3>
                    <p className="mt-1 text-sm text-slate-600">{booking.traveler?.fullName || booking.traveler?.username || "Traveler"} · {booking.traveler?.email || "No email"}</p>
                    <p className="mt-1 text-xs text-slate-500">Booking created {dateLabel(booking.createdAt)} · {booking.paymentMethod === "Demo" ? "Demo payment" : `${booking.paymentMethod} payment`}</p>
                    {booking.transactionHistory?.length > 0 && (
                      <details className="mt-2 text-xs text-slate-600">
                        <summary className="w-fit cursor-pointer font-semibold text-teal-800">Transaction history ({booking.transactionHistory.length})</summary>
                        <ul className="mt-2 space-y-1">
                          {booking.transactionHistory.map((transaction) => (
                            <li key={transaction._id}>{transaction.status} · {formatCurrency(Number(transaction.amount || 0))} · {dateLabel(transaction.createdAt)}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking</p>
                    <p className="mt-1 font-bold text-slate-800">{booking.bookingStatus}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formatCurrency(Number(booking.amount || 0))}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[booking.paymentStatus] || "bg-slate-100 text-slate-700"}`}>{booking.paymentStatus}</span>
                  </div>
                  {!isAdmin && booking.bookingStatus === "Confirmed" && booking.trip?.status === "Completed" && (
                    <div className="lg:col-span-full">
                      {reviewError && <p role="alert" className="mb-3 text-sm text-red-700">{reviewError}</p>}
                      <TripReviewForm
                        tripId={booking.trip._id}
                        targetUserId={booking.traveler?._id}
                        targetName={booking.traveler?.fullName || booking.traveler?.username || "the traveler"}
                        existingReviews={reviewsByTrip[booking.trip._id?.toString()] || []}
                      />
                    </div>
                  )}
                  {!isAdmin && ["Pending", "Cash Payment Pending"].includes(booking.paymentStatus) && booking.bookingStatus === "Accepted" && (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {booking.paymentMethod === "Cash" && (
                        <button type="button" disabled={processingId === booking._id} onClick={() => confirmCashReceived(booking)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                          {processingId === booking._id ? "Updating…" : "Confirm cash received"}
                        </button>
                      )}
                      <button type="button" disabled={processingId === booking._id} onClick={() => cancelBooking(booking)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"><FiX />Cancel booking</button>
                    </div>
                  )}
                  {!isAdmin && !["Pending", "Cash Payment Pending"].includes(booking.paymentStatus) && (
                    <Link to="/chats" className="inline-flex items-center gap-2 text-sm font-bold text-teal-800 hover:underline"><FiMessageCircle />Open chats</Link>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <RupeeIcon className="mx-auto text-3xl text-slate-300" />
              <p className="mt-3 font-bold text-slate-800">No payment records yet</p>
              <p className="mt-1 text-sm text-slate-500">A booking record appears here whenever a trip request is accepted.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
