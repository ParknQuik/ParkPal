# ParkPal Web Guide

## Driver discovery and booking

- `/` and `/search` are public search pages. Popular locations work without a Google Maps key; address suggestions use Google Places when configured.
- `/map` is public and restores location coordinates and optional check-in/check-out values from its query string. Date intervals are sent as ISO instants to marketplace search.
- `/listing/:id` is public. Owners see their edit action; other visitors can reserve an active listing.
- `/reserve` requires sign-in. Its `listingId`, `checkIn`, and `checkOut` query parameters survive the login redirect, so a refresh or sign-in does not lose the selected listing or interval.
- `/payment?bookingId=:id` reloads the booking from the API when route state is absent. The browser creates a PayMongo PaymentMethod using the public key, attaches it with the client key, and follows PayMongo redirect actions. The backend verifies the PaymentIntent before a booking detail page reports success.
- `/bookings` and `/bookings/:id` show reloadable booking status. Only confirmed, active, or completed statuses are presented as successful.

## Host operations

`/host-dashboard` and `/list-slot` are available to hosts and admins. The dashboard loads the signed-in host's records from `GET /marketplace/host/listings` and earnings from `GET /marketplace/host/earnings`. Hosts can open details, edit their listings, pause/resume them using `PATCH /marketplace/listings/:id/toggle`, or delete them using `DELETE /marketplace/listings/:id`.

## Admin candidate review

`/admin-dashboard` is restricted to admins in the web app. Candidate scan, list, live details, preview approval, geofence verification, commercial verification, and rejection use the `/admin/parking-candidates` endpoints. The backend also applies the admin role guard to every candidate route.

## API and payment notes

- The web Axios client defaults to `/api`; use API paths without another `/api` prefix.
- Marketplace search accepts `availableFrom` and `availableTo`. The backend excludes pending, confirmed, and active booking overlaps before pagination and supports adjacent bookings.
- Booking and listing prices use PHP. PayMongo PaymentIntent amounts are derived from the saved booking; the browser does not submit a payable amount. The PayMongo service converts PHP to centavos once.
- Set `VITE_API_BASE_URL` and `VITE_GOOGLE_MAPS_API_KEY` as appropriate for the environment. Sandbox checkout also requires backend PayMongo test keys; its public key is returned with the intent.

## Routes

| Path | Access | Purpose |
| --- | --- | --- |
| `/`, `/search` | Public | Search parking |
| `/map` | Public | Browse map and availability |
| `/listing/:id` | Public | Listing details |
| `/login` | Public | Sign in or register |
| `/reserve` | Signed in | Create booking |
| `/payment` | Signed in | Pay and confirm booking |
| `/bookings`, `/bookings/:id` | Signed in | Booking history and details |
| `/host-dashboard`, `/list-slot` | Host or admin | Host listing operations |
| `/admin-dashboard` | Admin | Candidate operations |
| `/profile` | Signed in | Profile |

## Local validation

From `frontend/web`, run `npm run type-check`, `npm test -- --run`, and `npm run build`. Backend focused marketplace, payments, and candidate route tests run from `backend` using `npm test -- --runInBand --watchman=false --testPathPattern='marketplace|payments|parkingCandidates.routes'`.
