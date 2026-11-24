import { useEffect, useState } from "react";
import { FiArrowLeft, FiMap } from "react-icons/fi";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import TripForm from "../components/trip/TripForm";
import { authService } from "../services/authService";
import { isVerifiedOrganizer } from "../utils/organizerAccess";

export default function CreateTrip({ embedded = false, onCreated }) {
  const [organizerAccess, setOrganizerAccess] = useState("checking");
  const Content = embedded ? "div" : "main";

  useEffect(() => {
    let active = true;
    authService.getProfile()
      .then(({ user }) => {
        const approved = isVerifiedOrganizer(user);
        if (active) setOrganizerAccess(approved ? "approved" : user?.organizer?.status || "Not Applied");
      })
      .catch(() => {
        if (active) setOrganizerAccess("denied");
      });
    return () => { active = false; };
  }, []);

  return (
    <div className={embedded ? "space-y-5" : "min-h-screen bg-[#f8faf9]"}>
      {!embedded && <Navbar />}
      <Content className={embedded ? "" : "relative isolate overflow-hidden px-5 py-12 sm:px-8 sm:py-16"}>
        {!embedded && (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-[#006f68]/5 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-96 -z-10 h-80 w-80 rounded-full bg-[#006f68]/5 blur-3xl" />
          </>
        )}
        <div className={embedded ? "" : "mx-auto max-w-4xl"}>
          {!embedded && (
            <>
              <Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-all duration-200 hover:-translate-y-[1px] hover:text-[#00796B]">
                <FiArrowLeft size={17} />
                Back to NexTour
              </Link>
              <header className="mb-10 text-center">
                <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-[13px] bg-[#f1f8f7] text-[#00796B]">
                  <FiMap size={23} />
                </span>
                <span className="inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">
                  PLAN YOUR JOURNEY
                </span>
                <h1 className="mt-4 text-4xl font-black tracking-[-1px] text-gray-900 sm:text-5xl">
                  Create a trip
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-gray-500">
                  Share your plans, set your preferences, and invite fellow travelers to join.
                </p>
              </header>
            </>
          )}
          {organizerAccess === "checking" && <p role="status" className="text-center text-gray-600">Checking organizer verification...</p>}
          {organizerAccess === "approved" && <TripForm onCreated={embedded ? onCreated : undefined} />}
          {organizerAccess !== "checking" && organizerAccess !== "approved" && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                {organizerAccess === "Pending" ? "Organizer verification pending" : "Verified organizers can create trips"}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {organizerAccess === "Pending"
                  ? "You can create trips after an admin approves your organizer request."
                  : organizerAccess === "denied"
                    ? "Sign in and apply for verified organizer access to plan a trip."
                    : "All registered users can join approved trips. Creating trips requires organizer verification."}
              </p>
              <Link to={organizerAccess === "denied" ? "/login" : "/organizer/apply"} className="mt-5 inline-flex rounded-xl bg-[#00796B] px-5 py-3 text-sm font-bold text-white hover:bg-[#006f68]">
                {organizerAccess === "denied" ? "Sign in" : "Become Trip Organizer"}
              </Link>
            </div>
          )}
        </div>
      </Content>
    </div>
  );
}
