# Mobile App Testing Guide

**Stack:** React Native (Expo 54), Redux Toolkit, React Navigation 6, Axios, TypeScript  
**Theme:** Stitch green `#10b77f` primary, orange `#f59e0b`, yellow `#facc15`  
**Start command:** `cd frontend/mobile && npm run start`

---

## Prerequisites

Before testing, verify:
- [ ] Backend is running (`localhost:3001` or deployed Cloud Run URL)
- [ ] Metro bundler / Expo dev server is running
- [ ] Device/simulator has network connectivity
- [ ] Auth token in AsyncStorage (login first), or cleared to test auth flow

---

## Automated Tests

```bash
# Run full test suite
cd frontend/mobile && npm test

# Expected: 45/45 passing (100%)
```

---

## Manual Testing Checklist (Every Screen)

| Check | How |
|-------|-----|
| UI renders correctly | Visual — green theme, spacing, safe area |
| Navigation works | Back button, bottom tabs, transitions |
| All buttons functional | Tap every CTA, icon, link |
| Forms work | Input, validation errors, keyboard dismiss |
| Data loads from API | Confirm data populates from backend |
| Pull-to-refresh | Swipe down on scrollable screens |
| Error states | Disconnect network, trigger API error |
| Loading states | Spinner/skeleton on first load |
| Empty states | New user with no bookings/listings |

---

## Screen Test Cases

### Auth — `AuthScreen.tsx`

| Test | Steps | Expected |
|------|-------|----------|
| Login renders | Open app logged out | Email, password, Google button |
| Signup tab | Tap "Sign Up" | Name, email, password, confirm fields |
| Empty login | Tap Sign In blank | Validation errors |
| Wrong credentials | Valid format, wrong password | API error shown |
| Successful login | Valid credentials | Navigates to Home |
| Successful signup | All fields filled | Navigates to Home |
| Forgot password | Tap link | ForgotPassword screen |
| Google sign-in | Tap Google in an Expo development build or standalone build | Native Google account picker returns to app and authenticates with backend |
| Password visibility | Tap eye icon | Password reveals/hides |

### Home Dashboard — `HomeDashboard.tsx`

| Test | Expected |
|------|----------|
| Greeting shows user name | Correct name from Redux state |
| Quick action buttons work | Navigate to correct screens |
| Recent bookings load | Shows from API or empty state |
| Pull to refresh | Reloads data |

### Explore Map — `ExploreMap.tsx`

| Test | Expected |
|------|----------|
| Map renders | Google Maps with markers |
| GPS centering | Map centers on user location |
| Parking markers show | Price markers on available spots |
| Tap marker | Shows spot info card |
| Navigate to detail | Tapping spot opens ParkingDetails |

### Parking Details — `ParkingDetails.tsx`

| Test | Expected |
|------|----------|
| Spot details load | Name, address, price, photos |
| Reserve button works | Navigates to ReserveSpot |
| Map link | Opens Explore with spot coordinates |
| Booking details card | Shows existing booking if user has one |

### Reserve Spot — `ReserveSpot.tsx`

| Test | Expected |
|------|----------|
| Date/time picker | Selects start and end time |
| Vehicle selection | Shows user's registered vehicles |
| Price calculation | Updates based on duration |
| Availability conflict | 409 error → clear message |
| Proceed to payment | Navigates to PaymentScreen |

### Payment — `PaymentScreen.tsx`

| Test | Expected |
|------|----------|
| 5 payment methods shown | Cash, GCash, Card, GrabPay, Maya |
| Method selection | Highlights selected method |
| Cash payment | Completes without PayMongo redirect |
| GCash payment | Creates PayMongo intent |
| Confirm payment | Calls `/payments/confirm` |
| Success | Navigates to BookingConfirmed |
| Failure | Navigates to PaymentFailed |

### My Bookings — `MyBookingsScreen.tsx`

| Test | Expected |
|------|----------|
| Tabs load | Upcoming / Completed / Cancelled |
| Date filtering | Correct bookings per tab |
| Cancel booking | Confirmation alert → cancels before 30min deadline |
| Extend booking | Shows availability check, extension options |
| View Details | Opens ParkingDetails with booking info |

### List Your Spot — `ListYourSpot.tsx`

| Test | Expected |
|------|----------|
| Form renders | Title, address, price, availability fields |
| Photo picker | Opens image picker, previews selected photos |
| Photo upload | Photos uploaded to GCS before submit |
| Submit listing | Calls createListing API, shows success |
| Validation | Empty required fields show errors |

### Profile — `ProfileScreen.tsx`

| Test | Expected |
|------|----------|
| User info shows | Name, email from Redux |
| Profile photo | Shows photo or placeholder avatar |
| Upload photo | Opens picker, uploads to GCS, updates avatar |
| My Listings | Navigates to MyListings |
| My Vehicles | Navigates to MyVehicles |
| Notifications | Navigates to Notifications |
| Logout | Clears auth, returns to Auth screen |

### Edit Profile — `EditProfileScreen.tsx`

| Test | Expected |
|------|----------|
| Fields pre-filled | Current user data loaded |
| Photo change | Picker → GCS upload → URL updated |
| Save changes | PATCH to `/users/profile`, Redux updated |

### QR Scanner — `QRScannerScreen.tsx`

| Test | Expected |
|------|----------|
| Camera permission | Requests permission on first use |
| Scan valid QR | Processes check-in/check-out |
| Manual code entry | Fallback input field works |
| Invalid QR | Error message shown |

### QR Generator — `QRGeneratorScreen.tsx`

| Test | Expected |
|------|----------|
| Shows active bookings | List of bookings with QR option |
| QR code renders | Valid QR for selected booking |
| Share/download | Share sheet opens |

### My Vehicles — `MyVehiclesScreen.tsx`

| Test | Expected |
|------|----------|
| Vehicle list loads | Shows all registered vehicles |
| Add vehicle | Form → saves to API |
| Edit vehicle | Updates via API |
| Delete vehicle | Confirmation → removes |
| Set default | Updates default vehicle |

### Notifications — `NotificationsScreen.tsx`

| Test | Expected |
|------|----------|
| Notifications load | List from API |
| Unread badge count | Shows correct count |
| Mark as read | Updates state + API |
| Mark all read | Clears all unread |
| Delete notification | Removes from list |

### Earnings — `EarningsScreen.tsx`

| Test | Expected |
|------|----------|
| Summary loads | Total earnings, payout info |
| Weekly/monthly toggle | Switches analytics view |
| Transaction list | Shows payout history |

### My Listings — `MyListingsScreen.tsx`

| Test | Expected |
|------|----------|
| Listings load | Shows host's parking spots |
| Toggle availability | Updates slot status via API |
| QR code action | Opens QRGenerator |

### Write Review — `WriteReview.tsx`

| Test | Expected |
|------|----------|
| Star rating | 1-5 stars selectable |
| Comment field | Text input works |
| Submit | POST to `/marketplace/reviews` |

---

## End-to-End Flow Tests

### Driver Flow
1. Login → search parking on map → view details → reserve spot → pay (GCash) → receive confirmation → view in My Bookings → QR check-in → QR check-out → write review

### Host Flow
1. Login → list a parking spot → upload photos → set availability → receive booking notification → view earnings

### Cancellation Flow
1. Login → My Bookings → cancel booking within 30 minutes → confirm cancellation shown

### Extension Flow
1. Login → My Bookings → extend active booking → check availability → pay extension fee

---

## Device Testing Matrix

| Device | Priority | Notes |
|--------|----------|-------|
| iPhone 14 (iOS 17) | P0 | Primary iOS target |
| iPhone SE (small screen) | P1 | Test layout on small screen |
| Pixel 7 (Android 13) | P0 | Primary Android target |
| Samsung Galaxy (Android 12) | P1 | Common Philippine device |
| iOS Simulator | Dev | Use for development |
| Android Emulator | Dev | Use for development |

---

## Known Issues

| Issue | Status | Workaround |
|-------|--------|-----------|
| Google sign-in unavailable in Expo Go | Expected | Use an Expo development build or standalone build |
| Push notifications in Expo Go | Expected | Graceful fallback, no crash |
| Apple Sign-In | Not implemented | Button removed from UI |

---

## Running Tests

```bash
# Unit tests
cd frontend/mobile && npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Single file
npm test -- MyBookingsScreen.test.ts
```
