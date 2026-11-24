import { useState } from "react";
import {
  FiArrowRight,
  FiCheckCircle,
  FiChevronDown,
  FiCompass,
  FiMapPin,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

/* ------------------------------------------------------------------
   DATA (unchanged from original)
------------------------------------------------------------------ */
const travelerSteps = [
  {
    title: "Explore available trips",
    description:
      "Browse approved public trips and compare destinations, dates, budgets, and itineraries.",
    Icon: FiCompass,
  },
  {
    title: "Choose a trip that fits",
    description:
      "Open a trip to review its plans and organizer details before requesting a place.",
    Icon: FiMapPin,
  },
  {
    title: "Send a join request",
    description:
      "Ask the organizer to join. You can follow your request and trip details from your profile.",
    Icon: FiArrowRight,
  },
  {
    title: "Travel with your group",
    description:
      "When your request is accepted, the trip appears with your joined journeys in your profile.",
    Icon: FiUsers,
  },
];

const organizerSteps = [
  {
    title: "Apply for verification",
    description:
      "Submit the required identity and address documents for organizer review.",
  },
  {
    title: "Create your trip",
    description:
      "Once approved as an organizer, add the destination, dates, budget, capacity, and itinerary.",
  },
  {
    title: "Wait for trip review",
    description:
      "New trips are reviewed by an administrator before they appear in public Explore results.",
  },
  {
    title: "Manage join requests",
    description:
      "Review traveler requests and manage your trip from the Organizer profile.",
  },
];

const faqs = [
  {
    question: "How do I join a trip?",
    answer:
      "Browse approved trips, open the trip you are interested in, and send a join request. The organizer can accept or decline it.",
  },
  {
    question: "Can I create a trip?",
    answer:
      "Yes. Apply to become an organizer and submit the required verification documents. Verified organizers can create trips, which are reviewed before publication.",
  },
  {
    question: "Does NexTour collect trip payments?",
    answer:
      "Payment processing is not currently available. Trip budgets are informational and should not be treated as a payment or booking charge.",
  },
  {
    question: "Where can I find my trips and requests?",
    answer:
      "Sign in and open your Profile to see your upcoming, joined, and created trips, along with organizer tools when available.",
  },
];

/* ------------------------------------------------------------------
   ANIMATION KEYFRAMES (injected once, no external CSS file needed)
------------------------------------------------------------------ */
const animationStyles = `
  @keyframes softFloat {
    0%   { transform: translateY(0px); }
    50%  { transform: translateY(-6px); }
    100% { transform: translateY(0px); }
  }
  @keyframes fadeSlideUp {
    0%   { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmerBorder {
    0%   { border-color: rgba(0,121,107,0.15); }
    50%  { border-color: rgba(0,121,107,0.45); }
    100% { border-color: rgba(0,121,107,0.15); }
  }
  @keyframes gentlePulse {
    0%   { box-shadow: 0 4px 12px rgba(0,111,104,0.18); }
    50%  { box-shadow: 0 8px 22px rgba(0,111,104,0.30); }
    100% { box-shadow: 0 4px 12px rgba(0,111,104,0.18); }
  }
  @keyframes fadeInScale {
    0%   { opacity: 0; transform: scale(0.96); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes slideDown {
    0%   { opacity: 0; transform: translateY(-6px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-slide-up {
    animation: fadeSlideUp 0.7s ease-out both;
  }
  .animate-fade-in-scale {
    animation: fadeInScale 0.6s ease-out both;
  }
  .animate-slide-down {
    animation: slideDown 0.25s ease-out both;
  }
  .animate-soft-float {
    animation: softFloat 3.5s ease-in-out infinite;
  }
  .journey-card {
    transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .journey-card:hover {
    animation: shimmerBorder 2s ease-in-out infinite;
    transform: translateY(-6px);
    box-shadow: 0 18px 35px -8px rgba(0,111,104,0.16);
  }
  .journey-card:hover .step-number {
    background-color: #006f68;
    color: #ffffff;
    transform: scale(1.05);
  }
  .journey-card:hover .card-icon {
    transform: rotate(-6deg) scale(1.08);
  }
  .card-icon {
    transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .step-number {
    transition: all 0.25s ease;
  }
  .cta-button {
    transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .cta-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 22px -6px rgba(0,111,104,0.35);
  }
  .hero-badge {
    animation: softFloat 3s ease-in-out infinite;
  }
  .pulse-cta {
    animation: gentlePulse 2.5s ease-in-out infinite;
  }
  .faq-item {
    transition: all 0.25s ease;
  }
  .faq-item:hover {
    border-color: rgba(0,121,107,0.25);
    box-shadow: 0 8px 20px -8px rgba(0,0,0,0.08);
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
`;

/* ------------------------------------------------------------------
   JOURNEY CARD
------------------------------------------------------------------ */
function JourneyCard({
  title,
  description,
  steps,
  action,
  actionLabel,
  Icon,
  delay = 0,
}) {
  return (
    <article
      className="journey-card animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:p-8"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="card-icon flex h-12 w-12 items-center justify-center rounded-[13px] bg-[#f1f8f7] text-[#00796B]">
        <Icon size={22} />
      </span>
      <h3 className="mt-5 text-xl font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-gray-500">{description}</p>
      <ol className="mt-7 space-y-5">
        {steps.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3">
            <span className="step-number flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#006f68]/10 text-xs font-bold text-[#00796B]">
              {index + 1}
            </span>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                {step.title}
              </h4>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <Link
        to={action}
        className="cta-button mt-7 inline-flex items-center gap-2 rounded-xl bg-[#006f68] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,111,104,0.18)] hover:bg-[#005c56]"
      >
        {actionLabel}
        <FiArrowRight size={17} />
      </Link>
    </article>
  );
}

/* ------------------------------------------------------------------
   MAIN PAGE
------------------------------------------------------------------ */
export default function HowItWorks() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      {/* Inject animation styles once */}
      <style>{animationStyles}</style>

      <Navbar />

      <main>
        {/* ---------------- HERO ---------------- */}
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-white via-[#f1f8f7] to-[#e6f2f0] px-5 py-16 sm:px-8 lg:py-24">
          <div className="pointer-events-none absolute -left-28 top-6 h-72 w-72 rounded-full bg-[#006f68]/5 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#006f68]/5 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <span className="hero-badge inline-flex rounded-full bg-[#006f68]/10 px-4 py-2 text-xs font-bold tracking-[0.15em] text-[#00796B]">
              HOW NEXTOUR WORKS
            </span>

            <h1 className="animate-fade-slide-up mt-6 text-5xl font-black tracking-[-1.5px] text-gray-900 sm:text-6xl">
              Plan together. Travel further.
            </h1>

            <p
              className="animate-fade-slide-up mx-auto mt-5 max-w-2xl text-sm leading-7 text-gray-500"
              style={{ animationDelay: "120ms" }}
            >
              Discover trips created by organizers or get verified to create
              journeys of your own.
            </p>

            <div
              className="animate-fade-slide-up mt-8 flex flex-wrap justify-center gap-3"
              style={{ animationDelay: "220ms" }}
            >
              <Link
                to="/explore"
                className="cta-button pulse-cta flex items-center gap-2 rounded-xl bg-[#006f68] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,111,104,0.18)] hover:bg-[#005c56]"
              >
                Explore trips
                <FiArrowRight size={17} />
              </Link>
              <Link
                to="/organizer/apply"
                className="cta-button flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 hover:border-[#00796B] hover:text-[#00796B]"
              >
                Become an organizer
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------- TWO PATHS ---------------- */}
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-4 text-xs font-bold tracking-[0.15em] text-[#00796B]">
              TWO WAYS TO JOURNEY
            </p>
            <h2 className="text-4xl font-black tracking-[-1px] text-gray-900 sm:text-5xl">
              Choose your travel path
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-500">
              The steps below reflect the current NexTour trip and organizer
              workflows.
            </p>
          </div>

          <div className="grid gap-7 lg:grid-cols-2">
            <JourneyCard
              title="Travel as a TripMate"
              description="Find an approved trip and request to join its group."
              steps={travelerSteps}
              action="/explore"
              actionLabel="Find a trip"
              Icon={FiCompass}
              delay={0}
            />
            <JourneyCard
              title="Organize a trip"
              description="Get verified, publish a trip after review, and coordinate with travelers."
              steps={organizerSteps}
              action="/organizer/apply"
              actionLabel="Apply to organize"
              Icon={FiShield}
              delay={120}
            />
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section
          id="faq"
          className="bg-[#f1f8f7] px-5 py-16 sm:px-8 lg:py-24"
        >
          <div className="mx-auto max-w-3xl">
            <header className="mb-10 text-center">
              <p className="mb-4 text-xs font-bold tracking-[0.15em] text-[#00796B]">
                NEED A HAND?
              </p>
              <h2 className="text-4xl font-black tracking-[-1px] text-gray-900 sm:text-5xl">
                Frequently asked questions
              </h2>
            </header>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                const answerId = `faq-answer-${index}`;

                return (
                  <article
                    key={faq.question}
                    className="faq-item animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 text-left text-sm font-semibold text-gray-900 transition-colors hover:text-[#00796B]"
                    >
                      {faq.question}
                      <FiChevronDown
                        className={`shrink-0 text-[#00796B] transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <p
                        id={answerId}
                        className="animate-slide-down mt-4 border-t border-gray-100 pt-4 text-sm leading-7 text-gray-500"
                      >
                        {faq.answer}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- FINAL CTA ---------------- */}
        <section className="bg-gradient-to-br from-[#006f68] via-[#005c56] to-[#1a2e2b] px-5 py-16 text-white sm:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <FiCheckCircle className="animate-soft-float mx-auto text-3xl text-[#7dd3c8]" />
            <h2 className="animate-fade-slide-up mt-5 text-4xl font-black tracking-[-1px] sm:text-5xl">
              Ready to start exploring?
            </h2>
            <p
              className="animate-fade-slide-up mt-4 text-sm leading-7 text-white/75"
              style={{ animationDelay: "100ms" }}
            >
              Find a trip that fits your plans or create an account to keep your
              journey organized.
            </p>
            <Link
              to="/explore"
              className="cta-button animate-fade-slide-up mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[#006f68] hover:bg-[#f1f8f7]"
              style={{ animationDelay: "180ms" }}
            >
              Browse trips
              <FiArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}