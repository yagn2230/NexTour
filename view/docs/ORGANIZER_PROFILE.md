# Organizer Profile

The Organizer view is one role inside `/profile` and `/dashboard`. It uses the same authenticated profile data as the TripMate view, with organizer-specific sections adapted from the backend profile response.

## User flow

1. Open `/profile`.
2. Select **Organizer** in the profile role switcher.
3. Review verification status, hosting metrics, trips, join requests, travelers, earnings, analytics, documents, notifications, reviews, gallery, and settings.
4. Use **Edit profile** to update organizer experience and common profile fields.
5. Use **Manage application** or **Apply for verification** to open `/organizer/apply`.
6. Use the dashboard and join-request links to continue organizer operations.

## Profile sections

| Section | Component | Purpose |
| --- | --- | --- |
| Profile header | `ProfileHeader.jsx` | Profile photo, cover photo, identity, rating, and edit action |
| Verification | `VerificationStatus.jsx` | Displays verified status or links to application |
| Organizer experience | `OrganizerProfile.jsx` | Displays the organizer biography and hosting experience |
| Dashboard | `OrganizerDashboard.jsx` | Links to the workspace and join requests; displays hosting statistics |
| Created trips | `CreatedTrips.jsx` | Lists all trips created by the organizer |
| Active trips | `ActiveTrips.jsx` | Lists trips currently welcoming travelers |
| Pending trips | `PendingTrips.jsx` | Lists trips waiting for administrative approval |
| Completed trips | `CompletedTrips.jsx` | Lists completed hosted trips |
| Join requests | `TripRequests.jsx` | Accepts or declines pending traveler requests |
| Travelers | `TravelersList.jsx` | Lists confirmed travelers and their trips |
| Earnings | `Earnings.jsx` | Shows estimated accepted-member revenue |
| Analytics | `Analytics.jsx` | Summarizes hosted trips, travelers, and rating |
| Documents | `Documents.jsx` | Shows submitted verification documents and application status |
| Notifications | `Notifications.jsx` | Marks notifications read or deletes them |
| Gallery | `Gallery.jsx` | Displays and adds organizer gallery images |
| Reviews | `Reviews.jsx` | Displays traveler reviews |
| Statistics | `ProfileStats.jsx` | Displays role-specific profile statistics |
| Settings | `SettingsCard.jsx` | Edits profile, changes password, and jumps to notifications |

## Sidebar layout

The organizer profile uses a responsive sidebar and main-content layout:

- The profile cover and identity header appear above the organizer menu.
- Desktop screens show a sticky sidebar menu beside the selected section.
- Mobile screens show a horizontal, scrollable menu above the selected section.
- Selecting a menu item replaces the main content instead of displaying all organizer sections on one crowded page.
- The Overview menu item keeps the profile header, organizer experience, dashboard links, metrics, and profile statistics together.
- Trip information is separated into Created, Active, Pending, and Completed menu items.
- Account, verification, community, revenue, analytics, document, notification, gallery, review, and settings features remain available in dedicated menu items.

## Data and state

- `ProfilePage.jsx` loads `/profile/me` through `profileService.getMyProfile()`.
- `profileAdapter.js` converts API fields into the profile objects used by the components.
- Profile images are resolved from absolute URLs or the configured API base URL.
- Trip, request, notification, document, review, wishlist, and gallery collections are normalized to arrays.
- Organizer statistics include trip counts, traveler totals, request counts, average rating, and estimated revenue.
- Estimated revenue uses accepted Trip Mates multiplied by each trip's per-person price. It is not payment reconciliation.

The Organizer profile passes mutations back to `ProfilePage.jsx`:

- Profile updates call `profileService.updateProfile()`.
- Profile/cover uploads call `profileService.updateProfileImage()`.
- Gallery additions call `profileService.updateProfile()`.
- Join-request decisions call `profileService.respondToTripRequest()`.
- Notification actions call `profileService.markNotificationRead()` or `profileService.deleteNotification()`.
- Password changes call `profileService.changePassword()`.

## Verification documents

The organizer application at `/organizer/apply` submits experience, a reason for applying, and supporting documents to `/users/apply-organizer`.

Application limits:

- At most five files.
- Maximum 5 MB total.
- PDF, JPEG, PNG, or WebP files only.
- Experience and reason are required.

The Profile Documents card does not accept direct uploads because document submission belongs to the verification application flow. It opens `/organizer/apply` and opens any submitted document URL that the API returns.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/profile` | Authenticated | TripMate and Organizer profile views |
| `/organizer/apply` | Authenticated | Organizer verification application |
| `/organizer/dashboard` | Verified organizer or admin | Full trip operations dashboard |
| `/organizer/requests` | Verified organizer or admin | Join-request and capacity management |
| `/organizer/payments` | Verified organizer or admin | Payment and booking records |
| `/create-trip` | Verified organizer | Create a trip |
| `/travelers/:identifier` | Public | Public traveler profile |

## Development and validation

Run from the `view` directory:

```powershell
npm run lint
npm run build
npm run dev
```

Set `VITE_API_BASE_URL` when the backend is not available at `http://localhost:5000`.
