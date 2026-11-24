# NexTour frontend

The NexTour client is a React application built with Vite.

## Project structure

- `src/pages/` contains route-level screens, grouped by feature (`auth`, `admin`, and `Profile`).
- `src/components/` contains reusable interface elements and feature components.
- `src/layouts/` contains shared page shells such as the admin layout.
- `src/context/` and `src/hooks/` contain shared application state and hooks.
- `src/services/` contains API clients grouped by domain.
- `src/utils/` contains shared formatting, API, and domain helpers.
- `src/assets/` and `public/` contain static assets.

Keep route-level screens in `pages` and reusable UI in `components`. Add new API calls to the matching service instead of issuing duplicate endpoint implementations from screens.

## Organizer workspace

- `/organizer/dashboard` is the centralized responsive organizer workspace, with separate sidebar sections for overview, trips, all bookings, tripmates, booking/payment management, and payment-based revenue analytics with daily, weekly, monthly, and yearly graphs; it also includes trip requests, chats, reviews, settings, and a calendar.
- `/organizer/requests` manages join requests, capacity, and per-person pricing.
- `/my-requests` tracks the traveler's join-request history and allows pending requests to be cancelled.
- `/organizer/payments` redirects to the centralized dashboard's Booking & Payments section. It tracks booking status, demo and cash payment totals, and transaction history; organizers can confirm cash received or cancel pending bookings.
- The TripMate profile's **My Bookings** sidebar section shows accepted bookings, payment choices, active trip chat links, and review forms after confirmed trips are completed. It renders inside `/profile` without navigating away; `/bookings` remains available as a direct-entry route. Demo checkout does not charge or transfer real money and is disabled in production.
- My Bookings also supports pre-trip cancellation with a recorded reason, payment refunds, and evidence-backed appeals for organizer-recorded no-shows. Organizers record attendance in their dashboard; three no-shows trigger a 30-day restriction, while an administrator-approved appeal can excuse the record.
- The organizer dashboard exposes date-gated controls to mark approved trips ongoing and completed; organizer payment records show review forms for confirmed completed trips.
- `/chats` and `/chats/:conversationId` provide private organizer–traveler conversations after request acceptance.
- `/travelers/:identifier` displays a public traveler profile linked from request and member records.
- `/profile` includes a TripMate and Organizer role switcher. Each role shows the cover/profile header above a clean responsive sidebar with separate sections for its profile features; the TripMate view includes My Bookings alongside trips, wishlist, destinations, notifications, gallery, reviews, achievements, contact details, and settings.
- `/organizer/apply` is the organizer verification application flow. It accepts experience, a reason for applying, and PDF/JPEG/PNG/WebP supporting documents.
- Organizer profile sections under `src/components/Profile/Organizer/` provide verification, dashboard metrics, trip collections, join requests, traveler lists, earnings, analytics, documents, notifications, and settings.
- Organizer API calls are centralized in `src/services/organizerService.js` and `src/services/paymentService.js`; chat calls use `src/services/chatService.js`. Profile, notification, and password calls use `src/services/profileService.js`. The shared API client uses `fetch` with credentialed requests and the existing bearer token when available.

See [Organizer Profile documentation](docs/ORGANIZER_PROFILE.md) for component structure, profile data adaptation, routes, and actions.

See [Admin Panel documentation](docs/ADMIN_PANEL.md) for the administrator sections, routes, permissions, and frontend API integration.

## Development

Run these commands from the `view` directory:

- `npm run dev` starts the local development server.
- `npm run lint` checks the frontend source.
- `npm run build` creates the production build.

Set `VITE_API_BASE_URL` to override the production API (`https://nextour-1.onrender.com`) or local development default (`http://localhost:5000`). For Vercel, use the `view` directory as the project root, `npm run build` as the build command, and `dist` as the output directory.
