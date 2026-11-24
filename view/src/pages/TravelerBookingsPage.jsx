import { useEffect, useState } from "react";
import { FiCalendar, FiFlag, FiMessageCircle } from "react-icons/fi";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import ReportModal from "../components/ReportModal";
import TripReviewForm from "../components/TripReviewForm";
import { chatService } from "../services/chatService";
import { paymentService } from "../services/paymentService";
import { attendanceService } from "../services/attendanceService";
import { profileService } from "../services/profileService";
import { formatCurrency } from "../utils/formatters";

const statusClass = {
  Pending: "bg-amber-100 text-amber-900",
  "Cash Payment Pending": "bg-amber-100 text-amber-900",
  Paid: "bg-emerald-100 text-emerald-800",
  "Refund Pending": "bg-amber-100 text-amber-900",
  Failed: "bg-red-100 text-red-800",
  Refunded: "bg-violet-100 text-violet-800",
  "Not Required": "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-slate-100 text-slate-600",
};

const dateLabel = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  : "Date not set";

let razorpayScriptPromise;
const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayScriptPromise = null;
        reject(new Error("Unable to load Razorpay checkout. Check your connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
};

export default function TravelerBookingsPage({ embedded = false }) {
  const [bookings, setBookings] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [reviewsByTrip, setReviewsByTrip] = useState({});
  const [reviewError, setReviewError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processingCash, setProcessingCash] = useState(false);
  const [processingRazorpayId, setProcessingRazorpayId] = useState("");
  const [processingTrustId, setProcessingTrustId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([paymentService.getMine(), chatService.getConversations()])
      .then(([paymentResponse, chatResponse]) => {
        if (!active) return;
        const loadedBookings = paymentResponse.data || [];
        setBookings(loadedBookings);
        setConversations(chatResponse.data || []);
        const completedTripIds = [...new Set(loadedBookings
          .filter((booking) => booking.bookingStatus === "Confirmed" && booking.trip?.status === "Completed")
          .map((booking) => booking.trip?._id)
          .filter(Boolean))];
        return Promise.all(completedTripIds.map(async (tripId) => {
          const response = await profileService.getMyTripReviews(tripId);
          return [tripId.toString(), response.data || []];
        })).then((entries) => {
          if (active) setReviewsByTrip(Object.fromEntries(entries));
        }).catch((reviewLoadError) => {
          if (active) setReviewError(reviewLoadError.message || "Unable to load your trip reviews.");
        });
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load your bookings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [refreshKey]);

  const completeDemoPayment = async () => {
    if (!selectedBooking || processingPayment) return;
    setProcessingPayment(true);
    setError("");
    setPaymentNotice("");
    try {
      await paymentService.completeDemoPayment(selectedBooking._id);
      setSelectedBooking(null);
      setPaymentNotice("Demo payment completed. No real money was charged or transferred.");
      setRefreshKey((key) => key + 1);
    } catch (paymentError) {
      setError(paymentError.message || "Unable to complete the demo payment.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const chooseCashPayment = async (booking) => {
    setProcessingCash(true);
    setError("");
    setPaymentNotice("");
    try {
      await paymentService.chooseCash(booking._id);
      setPaymentNotice("Cash selected. Pay the organizer directly; they must confirm receipt.");
      setRefreshKey((key) => key + 1);
    } catch (paymentError) {
      setError(paymentError.message || "Unable to select cash payment.");
    } finally {
      setProcessingCash(false);
    }
  };

  const payWithRazorpay = async (booking) => {
    if (processingRazorpayId) return;
    setProcessingRazorpayId(booking._id);
    setError("");
    setPaymentNotice("");
    try {
      await loadRazorpayCheckout();
      const orderResponse = await paymentService.createRazorpayOrder(booking._id);
      const order = orderResponse.data;
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "NexTour",
        description: booking.trip?.title || "Trip booking",
        order_id: order.orderId,
        prefill: {
          name: booking.traveler?.fullName || "",
          email: booking.traveler?.email || "",
          contact: booking.traveler?.phone || "",
        },
        theme: { color: "#00796B" },
        handler: async (payment) => {
          try {
            const result = await paymentService.verifyRazorpayPayment(booking._id, payment);
            setPaymentNotice(result.message || "Razorpay payment confirmed.");
            setRefreshKey((key) => key + 1);
          } catch (verificationError) {
            setError(verificationError.message || "Payment was submitted but could not be verified yet. Refresh your bookings or contact support.");
          } finally {
            setProcessingRazorpayId("");
          }
        },
        modal: {
          ondismiss: () => setProcessingRazorpayId(""),
        },
      });
      checkout.on("payment.failed", (payment) => {
        setError(payment.error?.description || "Razorpay could not complete the payment. You can try again or choose cash.");
        setProcessingRazorpayId("");
      });
      checkout.open();
    } catch (paymentError) {
      setError(paymentError.message || "Unable to start Razorpay checkout.");
      setProcessingRazorpayId("");
    }
  };

  const cancelBooking = async (booking, reason) => {
    if (!window.confirm(`Cancel your booking for ${booking.trip?.title || "this trip"}? Any online payment will be refunded; cash refunds are confirmed by the organizer.`)) return;
    setProcessingTrustId(booking._id);
    setError("");
    setPaymentNotice("");
    try {
      const response = await attendanceService.cancelBooking(booking._id, reason);
      setPaymentNotice(response.message || "Booking cancelled.");
      setRefreshKey((key) => key + 1);
    } catch (cancelError) {
      setError(cancelError.message || "Unable to cancel this booking.");
    } finally {
      setProcessingTrustId("");
    }
  };

  const submitAppeal = async (booking, reason, evidence) => {
    setProcessingTrustId(booking._id);
    setError("");
    setPaymentNotice("");
    try {
      const response = await attendanceService.submitAppeal(booking._id, reason, evidence);
      setPaymentNotice(response.message || "Appeal submitted for administrator review.");
      setRefreshKey((key) => key + 1);
    } catch (appealError) {
      setError(appealError.message || "Unable to submit your appeal.");
    } finally {
      setProcessingTrustId("");
    }
  };

  const ContentElement = embedded ? "section" : "main";

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-[#f8faf9]"}>
      {!embedded && <Navbar />}
      <ContentElement className={embedded ? "space-y-6" : "mx-auto max-w-5xl space-y-6 px-5 py-9 sm:px-8"}>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Traveler workspace</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">My bookings</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">View your trip bookings, payment status, and organizer conversations.</p>
          </div>
          <Link to="/chats" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-700 hover:text-teal-800"><FiMessageCircle />My chats</Link>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {paymentNotice && <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{paymentNotice}</p>}
        {import.meta.env.DEV && (
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
            Demo checkout is for development only. It simulates payment; no real money is charged or transferred.
          </p>
        )}
        {loading ? (
          <p role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Loading bookings…</p>
        ) : bookings.length ? (
          <section aria-label="My trip bookings" className="space-y-4">
            {bookings.map((booking) => {
              const conversation = conversations.find((item) => item.trip?._id?.toString() === booking.trip?._id?.toString());
              const tripId = booking.trip?._id || booking.trip?.id;
              return (
                <article key={booking._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Trip booking</p>
                      <h2 className="mt-1 text-xl font-black text-slate-900">{booking.trip?.title || "Trip no longer available"}</h2>
                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><FiCalendar />{dateLabel(booking.trip?.startDate)}{booking.trip?.endDate ? ` – ${dateLabel(booking.trip.endDate)}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Per-person amount</p>
                      <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(Number(booking.amount || 0))}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800">Booking: {booking.bookingStatus}</span>
                    <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClass[booking.paymentStatus] || "bg-slate-100 text-slate-700"}`}>Payment: {booking.paymentStatus}</span>
                    {booking.attendanceStatus && booking.attendanceStatus !== "Unmarked" && <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${booking.attendanceStatus === "No-Show" ? "bg-red-100 text-red-800" : booking.attendanceStatus === "Excused" ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"}`}>Attendance: {booking.attendanceStatus}</span>}
                    {["Demo", "Razorpay", "Cash"].includes(booking.paymentMethod) && ["Pending", "Cash Payment Pending"].includes(booking.paymentStatus) && booking.bookingStatus === "Accepted" && (
                      <>
                        {booking.paymentMethod === "Cash" ? (
                          <p className="basis-full text-sm text-amber-900">Pay the organizer directly in cash. They must confirm receipt before your booking is confirmed.</p>
                        ) : booking.paymentMethod === "Razorpay" ? (
                          <p className="basis-full text-sm text-amber-900">Complete the secure Razorpay checkout to confirm your booking.</p>
                        ) : (
                          <p className="basis-full text-sm text-amber-900">Your place is reserved. Choose Razorpay online checkout or pay the organizer in cash.</p>
                        )}
                        {booking.paymentMethod !== "Cash" && (
                          <button
                            type="button"
                            disabled={processingCash}
                            onClick={() => chooseCashPayment(booking)}
                            className="rounded-xl border border-teal-800 px-4 py-2.5 text-sm font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
                          >
                            {processingCash ? "Updating…" : "Pay in cash"}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={Boolean(processingRazorpayId)}
                          onClick={() => payWithRazorpay(booking)}
                          className="rounded-xl bg-[#00796B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#005c56] disabled:cursor-wait disabled:opacity-50"
                        >
                          {processingRazorpayId === booking._id ? "Starting checkout…" : "Pay online (Razorpay)"}
                        </button>
                        {import.meta.env.DEV && booking.paymentMethod === "Demo" && (
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(booking)}
                            className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-900"
                          >
                            Pay now (demo)
                          </button>
                        )}
                      </>
                    )}
                    {booking.paymentStatus === "Not Required" && <p className="basis-full text-sm text-emerald-800">This trip is free. Your booking is confirmed; no payment is required.</p>}
                    {booking.paidAt && <p className="basis-full text-xs text-slate-500">Payment confirmed {dateLabel(booking.paidAt)}.</p>}
                    {booking.paymentStatus === "Cancelled" && <p className="basis-full text-sm text-slate-600">This booking was cancelled and its trip seat was released.</p>}
                    {booking.cancelledAt && <p className="basis-full text-sm text-slate-600">Cancelled {dateLabel(booking.cancelledAt)}{booking.cancellationReason ? ` · Reason: ${booking.cancellationReason}` : ""}</p>}
                    {booking.paymentStatus === "Refund Pending" && <p className="basis-full text-sm text-amber-900">The organizer needs to return your cash payment and confirm the refund.</p>}
                    {booking.paymentStatus === "Refunded" && <p className="basis-full text-sm text-emerald-800">Your payment refund has been confirmed.</p>}
                    <TravelerBookingActions
                      booking={booking}
                      busy={processingTrustId === booking._id}
                      onCancel={cancelBooking}
                      onAppeal={submitAppeal}
                    />
                    {["Accepted", "Confirmed"].includes(booking.bookingStatus) && tripId && (
                      <div className="basis-full flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => setReportTarget({ type: "Trip", id: tripId, contextTripId: tripId, label: "trip and organizer" })}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-3.5 text-sm font-bold text-red-700 transition hover:bg-red-50"
                        >
                          <FiFlag />Report trip and organizer
                        </button>
                      </div>
                    )}
                    {booking.bookingStatus === "Confirmed" && booking.trip?.status === "Completed" && (
                      <div className="basis-full border-t border-slate-100 pt-4">
                        {reviewError && <p role="alert" className="mb-3 text-sm text-red-700">{reviewError}</p>}
                        <TripReviewForm
                          tripId={booking.trip._id}
                          targetUserId={booking.organizer?._id}
                          targetName={booking.organizer?.fullName || booking.organizer?.username || "the organizer"}
                          existingReviews={reviewsByTrip[booking.trip._id?.toString()] || []}
                        />
                      </div>
                    )}
                    {conversation && booking.bookingStatus !== "Cancelled" && (
                      <Link to={`/chats/${conversation._id}`} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-900"><FiMessageCircle />Message organizer</Link>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="font-bold text-slate-900">No bookings yet</h2>
            <p className="mt-2 text-sm text-slate-600">When an organizer accepts your join request, your booking and payment status will appear here.</p>
            <Link to="/explore" className="mt-5 inline-flex rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-900">Explore trips</Link>
          </section>
        )}
      </ContentElement>
      {selectedBooking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-payment-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Development checkout</p>
            <h2 id="demo-payment-title" className="mt-2 text-xl font-black text-slate-900">Simulate payment</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This demo marks the booking as paid for testing only. No real money is charged, transferred, or sent to the organizer.
            </p>
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">
              {selectedBooking.trip?.title || "Trip"} · {formatCurrency(Number(selectedBooking.amount || 0))}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={processingPayment}
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={processingPayment}
                onClick={completeDemoPayment}
                className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-50"
              >
                {processingPayment ? "Completing…" : "Simulate successful payment"}
              </button>
            </div>
          </section>
        </div>
      )}
      {reportTarget && (
        <ReportModal
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetLabel={reportTarget.label}
          contextTripId={reportTarget.contextTripId}
          onClose={() => setReportTarget(null)}
          onSubmitted={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}

function TravelerBookingActions({ booking, busy, onCancel, onAppeal }) {
  const [cancellationReason, setCancellationReason] = useState("");
  const [appealReason, setAppealReason] = useState("");
  const [evidence, setEvidence] = useState(null);
  const canCancel = ["Accepted", "Confirmed"].includes(booking.bookingStatus)
    && (!booking.attendanceStatus || booking.attendanceStatus === "Unmarked")
    && booking.trip?.startDate
    && new Date(booking.trip.startDate) > new Date();

  return (
    <>
      {canCancel && (
        <details className="basis-full rounded-xl border border-slate-200 p-4">
          <summary className="w-fit cursor-pointer text-sm font-bold text-red-700">Cancel this booking</summary>
          <form onSubmit={(event) => { event.preventDefault(); onCancel(booking, cancellationReason); }} className="mt-3 space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Cancellation reason
              <textarea required minLength={3} maxLength={500} value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal" placeholder="Tell the organizer why you need to cancel." />
            </label>
            <button type="submit" disabled={busy} className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Cancelling…" : "Confirm cancellation"}</button>
          </form>
        </details>
      )}
      {booking.attendanceStatus === "No-Show" && (
        <div className="basis-full rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-bold text-amber-950">Appeal this no-show</h3>
          {booking.noShowAppealStatus ? (
            <p className="mt-1 text-sm text-amber-900">
              Appeal {booking.noShowAppealStatus.toLowerCase()}.
              {booking.noShowAppealDecisionReason ? ` ${booking.noShowAppealDecisionReason}` : ""}
            </p>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); if (evidence) onAppeal(booking, appealReason, evidence); }} className="mt-3 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Explain what happened
                <textarea required minLength={3} maxLength={1000} value={appealReason} onChange={(event) => setAppealReason(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-normal" placeholder="Describe the emergency or circumstances." />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Supporting evidence (PDF, JPEG, PNG, or WebP; up to 10 MB)
                <input required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setEvidence(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-normal" />
              </label>
              <button type="submit" disabled={busy || !evidence} className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit appeal"}</button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
