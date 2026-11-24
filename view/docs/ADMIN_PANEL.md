# NexTour Admin Panel

The admin panel is a single shared shell at `/admin`. The sidebar remains mounted while nested routes replace the main content area. All `/admin/*` pages require an authenticated account with the `Admin` role.

## Sections

- `/admin/dashboard` — platform totals and recent activity.
- `/admin/users` and `/admin/users/:userId` — search, filter, inspect, update, suspend/reactivate, and remove accounts; manage roles and organizer access.
- `/admin/organizers` — review organizer applications and manage approved organizer privileges.
- `/admin/trips` — filter trips by status, review details, approve/reject, edit, feature, restore, or remove trips.
- `/admin/join-requests` — review and accept/reject traveler requests across trips.
- `/admin/reports` — moderate reported users, trips, and reviews.
- `/admin/no-show-appeals` — review private Trip Mate attendance appeals and monitor accounts with repeated no-shows.
- `/admin/analytics` — platform and revenue metrics.
- `/admin/notifications` — broadcast announcements to active users or organizers.
- `/admin/settings` — manage platform policy/contact text, trip categories, and destination records.
- `/admin/profile` — view and update the signed-in administrator's profile.

The sidebar uses these routes directly; no section is rendered as a second nested dashboard layout. The global navbar search links to matching users or trips.

## API integration

Admin calls are centralized in `src/services/adminService.js`; report submission and public platform settings use `src/services/reportService.js` and `src/services/platformService.js`. The backend exposes admin-only endpoints under `/admin`, user report submission at `POST /reports`, and public platform settings at `GET /settings`. See the server README for the endpoint list and deployment configuration.

Platform settings do not expose SMTP credentials, payment keys, or deployment-level feature switches. Configure secrets and infrastructure through the server environment. Destination/category changes validate existing trip usage; categories in use cannot be removed.

## Development checks

From the `view` directory, run `npm run lint` and `npm run build`.
