# NexTour server

## Configuration

Set `MONGODB_URI` and a strong `SESSION_SECRET` in the server environment. MongoDB must run as a replica set (including local development) because booking acceptance, payment completion, cancellations, and chat writes use transactions. Set `JWT_SECRET` when enabling bearer-token login responses. Set `PORT` to override the default port 5000. The frontend uses `http://localhost:5000` in development. For production, set `VITE_API_BASE_URL` to the API origin or reverse-proxy API paths through the frontend origin; configure `CORS_ORIGINS` as comma-separated exact frontend origins when using a separate API origin.

Development checkout can be simulated with `NODE_ENV=development` and `PAYMENT_MODE=demo`; demo payments never move real money and are unavailable in production. To enable Razorpay, configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` with keys from the Razorpay Dashboard. Use test-mode keys for development and live-mode keys only after completing Razorpay's merchant onboarding. Configure a Razorpay webhook for `payment.captured` at `/payments/razorpay/webhook`, and set its signing secret as `RAZORPAY_WEBHOOK_SECRET`. Do not commit any of these secrets. Online payments are collected into the configured Razorpay merchant account; organizer payouts are not implemented by this integration.

Production sessions set the `Secure` cookie attribute and do not allow development localhost origins. Serve the API over HTTPS and configure exact production frontend origins.

The existing login response issues a JWT when `JWT_SECRET` is configured. Protected APIs validate bearer JWTs and retain validated session-cookie support for existing clients. The frontend stores a returned token and sends it as a bearer token while continuing to send credentialed cookies.

## Destinations and trips

The API allows credentialed requests from `http://localhost:5173` and `http://127.0.0.1:5173` by default. Public destination endpoints:

- `GET /destinations/countries`
- `GET /destinations/states/:country`
- `GET /destinations/cities/:state?country=:country`
- `GET /destinations/places?country=:country&state=:state&city=:city`

Country, state, and city lists use `country-state-city`; curated place records are seeded into MongoDB from `data/destinationSeed.js`. Trip documents store `country`, `state`, `city`, and selected place names in `famousPlaces`. The existing `destination` field remains set to the selected city for compatibility.

Registered users can join approved trips as Trip Mates. Creating trips requires admin-approved organizer access; new trips remain pending until approved. Existing join and leave routes stay supported:

- `GET /trips/explore` supports `search`, `country`, `region`, `indiaRegion`, `category`, `transportation`, `organizerLanguage`, `departureMonth` (`YYYY-MM`), `minBudget`, `maxBudget`, `minDurationDays`, and `maxDurationDays`. Budget filters use the trip's total budget, and duration filters use inclusive calendar days.
- Explore sorting (recently added, starting soon, budget, or available spots) is applied by the frontend to the returned public trips.
- `GET /trips/my`
- `POST /trips/:id/join` and `POST /trips/:id/leave`
- `POST /trips/:tripId/requests` with optional `{ "message": "..." }`
- `POST /trips/:tripId/requests/:requestId/accept` and `/decline` (trip owner only)
- `GET /trips/requests/mine` lists the signed-in traveler's join-request history.
- `PATCH /trips/:tripId/requests/:requestId/cancel` cancels only that traveler's pending request.
- `POST /trips/:id/join` remains available for compatibility and now creates a join request rather than directly adding a member.

### Organizer join-request management

- `GET /organizer/trips` lists the signed-in organizer's trips with request counts, accepted members, remaining seats, and estimated revenue. Admins receive all trips.
- `GET /organizer/trips/:tripId/requests` returns the trip, all request statuses and applicant contact details, accepted members, remaining seats, and estimated revenue. Access is limited to the trip's organizer or an Admin.
- `PATCH /organizer/requests/:requestId/accept` accepts a pending request, atomically adds the member and increments the seat count, adds the trip to the member's joined trips, and notifies the traveler. If the trip becomes full, remaining pending requests are declined and their applicants are notified.
- `PATCH /organizer/requests/:requestId/reject` declines a pending request and notifies the applicant.
- `GET /organizer/dashboard/stats` returns trip, accepted-member, pending/accepted/rejected request, upcoming/completed trip, and revenue totals. Admins receive global totals.
- `PATCH /organizer/trips/:tripId/price` updates `{ "pricePerPerson": 125 }` for a trip owned by the organizer; Admins can update any trip.
- `PUT /trips/:id` updates trip fields for its organizer; Admins may update any trip. The existing trip validation middleware validates partial updates.
- `DELETE /organizer/trips/:tripId` deletes an owned trip and removes its references from user wishlists and trip lists. Admins can delete any trip.
- `DELETE /organizer/trips/:tripId/members/:memberId` removes an accepted Trip Mate, adjusts the trip seat count and revenue estimate, reopens a previously full trip, and notifies the traveler.
- `PATCH /organizer/trips/:tripId/status` accepts `{ "status": "Ongoing" }` on or after the trip start date, or `{ "status": "Completed" }` for an ongoing trip on or after its end date. Successful transitions notify the organizer and trip members.
- The dashboard stats response also includes active trips, average rating, and review count. Per-trip revenue remains accepted Trip Mates multiplied by `pricePerPerson`.
- Dashboard statistics separately report `collectedRevenue` and `pendingPayments`; demo payments are simulations, not money collected.
- Accepted/rejected requests, new join requests, member removal, trip updates/deletions, and received reviews create user notifications. Users may mark notifications read or delete their own notification.

All management routes require authentication and verified-organizer access, except Admins are authorized to view and manage any trip. Regular users are denied. Applicant email, phone, and location fields are returned only to an authorized organizer or Admin. User profiles support optional `city` and `country`; existing free-form `location` remains available when those fields are unset.

New trips require `pricePerPerson`, entered separately from the total estimated trip budget. Estimated revenue is calculated as accepted Trip Mate members multiplied by the per-person price; it is an estimate, not payment processing or collected earnings. Existing trips have no reliable per-person price and are not migrated from `totalBudget`; organizers can set it in the request management page.

### Bookings, payments, and private trip chat

- Accepting a paid join request atomically creates an `Accepted` booking with a pending `Demo` payment in development, or a pending `Cash` payment when demo mode is unavailable, plus a private conversation for the organizer and traveler. From My Bookings, the traveler can choose cash or start Razorpay checkout; free trips are confirmed with `Not Required` payment status.
- Organizers can mark an active booking `Present`, `Late`, or `No-Show` with `PATCH /organizer/payments/:bookingId/attendance`. Attendance opens on or after the trip start; a no-show can only be recorded after the trip end. Each booking is marked once; an approved appeal changes the no-show to `Excused`.
- A Trip Mate can cancel an active, unmarked booking before the trip start with `PATCH /payments/:bookingId/cancel` and a 3–500 character `reason`. Cancellation time and reason are retained, the seat and active chat are released, and the organizer is notified. Captured Razorpay payments are refunded through the configured provider; a pending refund remains visible and can be retried. Cash refunds require the organizer to return the cash and confirm it with `PATCH /organizer/payments/:bookingId/mark-cash-refunded`. Demo payments never move real money.
- A traveler can submit one no-show appeal with `POST /appeals/no-show` as multipart form data (`bookingId`, `reason`, and `evidence`). Evidence is validated PDF/JPEG/PNG/WebP (max 10 MB), stored privately, and downloadable only by administrators. Admin review uses `GET /admin/no-show-appeals`, `GET /admin/no-show-appeals/:appealId/evidence`, and `PATCH /admin/no-show-appeals/:appealId/decision` with `decision: Approved|Rejected` and an explanation when rejecting.
- A recorded no-show increments the traveler's count. At two no-shows they receive a warning; at three they are restricted from requesting or being accepted into new trips for 30 days and appear in `GET /admin/no-show-offenders`. Admins can approve appeals to excuse a no-show, decrement the count, and clear the restriction when the count falls below three. Organizers may report repeat offenders through `POST /reports`.
- Accepted Trip Mates can submit one report covering both their trip and its organizer from trip details or My Bookings. The server verifies the reporter's accepted join request and stores the organizer with the trip report; admins can review the combined report and moderate the trip or organizer.
- `GET /profile/me` includes the TripMate's trip, cancellation, no-show, reliability, and attendance statistics. Organizer join-request details include an applicant's attendance history and any active request restriction.
- `GET /organizer/payments` lists the signed-in organizer's bookings and payment totals; Admins can view all records. `GET /organizer/payments/:bookingId` reads an organizer-owned record (or any record for an Admin).
- `GET /organizer/payments/analytics?period=daily|weekly|monthly|yearly` returns paid and pending totals, revenue growth against the previous equivalent period, actual payment time buckets, and collected revenue by trip. Admins receive global data.
- `POST /payments/:bookingId/demo/complete` lets only the authenticated traveler who owns a pending Demo booking simulate a successful payment. It also converts legacy unpaid cash-pending bookings to Demo when completed. It confirms the booking and notifies both parties. The endpoint rejects all requests in production, even if `PAYMENT_MODE=demo`.
- `POST /payments/:bookingId/razorpay/order` creates or reuses a server-side INR order for the authenticated traveler's pending booking. The amount is taken from the saved booking, never from client input.
- `POST /payments/:bookingId/razorpay/verify` verifies the Checkout signature, checks the payment against the Razorpay order and amount, captures authorized payments, and only then confirms the booking. Captured-payment webhooks are independently signature-verified and can reconcile a completed checkout if the browser callback is interrupted.
- `POST /payments/razorpay/webhook` accepts only Razorpay-signed `payment.captured` events. If a pending booking was cancelled before payment capture, the captured payment is refunded through Razorpay.
- `PATCH /payments/:bookingId/payment-method` lets a traveler switch their own pending booking to Cash. The organizer is notified and must confirm receipt before the booking is confirmed.
- `PATCH /organizer/payments/:bookingId/mark-cash-paid` lets only the trip organizer confirm a pending cash payment. It records the confirmation and notifies the traveler; Admins cannot confirm cash on an organizer's behalf.
- `PATCH /organizer/payments/:bookingId/cancel` cancels an accepted booking with a pending payment. It cancels the booking/payment record, removes the traveler from the trip and joined-trip list, releases the seat (reopening a full trip), disables chat, and notifies the traveler. Confirmed bookings cannot be cancelled without a refund workflow; member removal is also blocked for confirmed bookings.
- Removing a member or leaving a trip also keeps booking state consistent: pending bookings are cancelled and chats are disabled; a traveler with an active accepted/confirmed booking must resolve it with the organizer first. Trip cancellation and deletion are blocked while active bookings exist. Legacy cash-pending records remain readable, can be completed in demo mode, and can be cancelled.
- `GET /payments/mine` and `GET /payments/:bookingId` let travelers view their own payment and booking history. Admins can read any booking by ID.
- `GET /chat/conversations` lists a user's active conversations; Admins can view all conversation records. `GET /chat/conversations/:conversationId/messages` reads a conversation, `POST` to the same path sends a message (up to 2,000 characters), and `PATCH /chat/conversations/:conversationId/read` marks received messages read.
- Only the organizer and traveler with an active accepted/confirmed booking can send or read chat messages. Admin chat access is read-only. Cancelled or otherwise inactive bookings lose chat access. Message writes update the conversation preview and notify the recipient.
- The frontend exposes `/organizer/payments`, `/bookings`, `/chats`, and `/chats/:conversationId`. Chat updates are polled; no socket service is required.
- `GET /reviews/trips/:tripId/mine` lists reviews authored by the signed-in participant for a trip. Participants may review other participants after completion; the unique reviewer/target/trip constraint prevents duplicates. The traveler bookings and organizer payment pages expose review forms for confirmed completed-trip bookings.
- Booking/payment and chat collections and indexes are created by Mongoose. No data migration is needed for these collections; previously accepted members do not receive retroactive payment records or conversations.

The previous join-accept handler added the member but did not increment `currentMembers`. Before deploying, run `npm run migrate:trip-members` once with `MONGODB_URI` configured to reconcile each trip's member count and open/full status from its member array. Review a database backup before running migrations. Do not infer existing per-person prices from total budgets.

### Admin panel APIs

All `/admin` routes require authentication and Admin privileges.

- `GET /admin/stats` — dashboard aggregates and analytics.
- `GET /admin/no-show-appeals?status=Pending|Approved|Rejected`; `GET /admin/no-show-offenders`; `GET /admin/no-show-appeals/:appealId/evidence`; `PATCH /admin/no-show-appeals/:appealId/decision` — private evidence review, frequent no-show monitoring, and appeal decisions.
- `GET /admin/users`, `/admin/users/:id`, `/admin/users/:id/trips`; `PUT /admin/users/:id`; `PATCH /admin/users/:id/role|status`; `DELETE /admin/users/:id` — account search, detail, editing, role/status management, and removal.
- `GET /admin/organizer-requests`; `PUT /admin/users/:id/approve-organizer|reject-organizer`; `PATCH /admin/users/:id/revoke-organizer` — organizer application and privilege management.
- `GET /admin/trips/pending|approved|rejected`; `GET|PUT|DELETE /admin/trips/:id`; `PATCH /admin/trips/:id/approve|reject|restore` — trip moderation and management.
- `GET /admin/join-requests`; `PATCH /admin/join-requests/:requestId/accept|reject` — cross-trip join request moderation using the existing booking workflow.
- `POST /admin/notifications` — send an announcement to active users or organizers.
- `GET /admin/reports`; `PATCH /admin/reports/:reportId`; `POST /admin/reports/:reportId/moderate` — review reports and moderate reported users, trips, or reviews. Authenticated users submit reports with `POST /reports`.
- `GET|PUT /admin/settings`; `GET|POST /admin/destinations`; `PUT|DELETE /admin/destinations/:destinationId` — platform policy/contact settings, trip categories, and destination records. Public clients read the non-sensitive settings through `GET /settings`.
- `GET /admin/verification/pending`; `GET /admin/verification/:id/documents/:field`; `PUT /admin/verification/:id/approve|reject` — organizer verification review.

The frontend admin shell is mounted at `/admin`; its nested pages preserve the sidebar while replacing the main content. See `view/docs/ADMIN_PANEL.md` for the user-facing section map. SMTP credentials, payment keys, and deployment switches remain server environment configuration and are never editable in the admin UI.

## Profile APIs

`GET /profile/me` is the authenticated profile-page aggregate endpoint. Its `data` includes the user's public-to-self profile fields, computed statistics, upcoming/joined/completed/created trips, wishlist, completed destination counts, reviews, organizer verification status, organizer dashboard metrics, pending join requests, travelers, notifications, analytics, and organizer documents. Private data is selected by the authenticated user's ID only; password hashes and verification document contents are not returned.

- `GET /profile/me`; public profile lookup remains `GET /profile/:username-or-id`.
- `PUT /profile/update` for editable profile fields including `gallery`.
- `PATCH|DELETE /profile/profile-image` and `PATCH|DELETE /profile/cover-image`.
- `GET /profile/upcoming-trips`, `/completed-trips`, `/joined-trips`, `/wishlist`, `/favorite-destinations`, and `/travel-history`.
- `POST /profile/wishlist` with `{ "tripId": "<trip id>" }`; `DELETE /profile/wishlist/:tripId`.
- `PATCH /profile/notifications/:notificationId/read`.
- `DELETE /profile/notifications/:notificationId` deletes a notification belonging to the signed-in user.
- `PATCH /profile/change-password` accepts `currentPassword` and `newPassword`, validates the current password, and saves a bcrypt hash.
- `PUT /profile/update` accepts `organizerExperience` only for verified organizers or Admins; it updates the existing organizer profile field.
- `GET /organizer/dashboard`, `/trips`, `/trips/pending`, `/trips/completed`, `/travelers`, `/reviews`, `/analytics`, and `/notifications`.
- `POST /verification/apply`, `GET /verification/status`.
- `POST /reviews` with `userId`, `tripId`, `rating`, and optional `comment`; read routes include `GET /reviews/user/:userId` and `GET /reviews/organizer/:userId`.
- Admin-only verification routes include `GET /admin/verification/pending`, `GET /admin/verification/:id/documents/:field`, and `PUT /admin/verification/:id/approve|reject`.

The frontend clients are `view/src/services/profileService.js` and `view/src/services/organizerService.js`; `view/src/pages/Profile/profileAdapter.js` maps the aggregate profile response into existing profile components. The responsive organizer workspace is served by `view/src/pages/OrganizerDashboardPage.jsx` at `/organizer/dashboard`; traveler public profiles are at `/travelers/:identifier`. Review creation is limited to participants in a completed trip, with one review per reviewer, target, and trip. Trip join requests and user notifications are stored on the existing Trip and User documents.

Profile image uploads accept multipart fields `image`, `profileImage`, or `coverImage`, allow JPEG/PNG/WebP up to 5 MB, and are stored under `uploads/profiles`. Verification uploads use multipart fields `governmentId`, `selfie`, and `addressProof` (optional `passport` and `drivingLicense`), allow supported images or PDF up to 10 MB per file, and are not publicly served. Keep uploads on persistent storage in deployments.

## Local integration test

Run `npm test` from the server directory for automated Explore filter, organizer request/member management and lifecycle, traveler request history/cancellation, payment state transition, chat authorization, notification, and password-change tests. The tests mock database queries and do not require MongoDB.

1. Set the required server environment values and start the MongoDB instance.
2. Start the server using the repository's configured entry point, then run `npm run dev` from `view`.
3. Sign in and open `/profile`; with no trip data, the sections should show their empty states.
4. Edit profile details, upload profile/cover images, and add/remove a saved trip.
5. For join requests, approve a public trip as Admin, set its per-person price, submit requests from two other users, accept one as the organizer, and verify member counts, revenue estimates, full-trip closure, and notifications. Then confirm an Admin can review/manage another organizer's requests, while a regular non-organizer is denied these management endpoints.

The server uses the Razorpay Node SDK for order creation, payment capture, and refunds. Install dependencies with `npm install` after checking out the server repository.
