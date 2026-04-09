# ParkPal Frontend Testing Roadmap

## Overview

This document provides a systematic approach to testing the ParkPal Expo mobile app. It covers manual testing per screen, end-to-end user flow testing, device-specific testing, and known issues.

**App stack:** React Native (Expo 54), Redux Toolkit, React Navigation 6, Axios, TypeScript  
**Theme:** Stitch green primary (`#10b77f`), orange accent (`#f59e0b`), yellow accent (`#facc15`), light background (`#f6f8f7`), dark background (`#10221c`)  
**Backend:** Express.js on Cloud Run — must be running for API-connected tests  
**Start command:** `cd frontend/mobile && npm run start`

---

## 1. Prerequisites

Before testing, verify:

- [ ] Backend is running (local `localhost:3001` or deployed Cloud Run URL)
- [ ] Metro bundler / Expo dev server is running
- [ ] Auth token exists in AsyncStorage (login first) or clear it to test auth flow
- [ ] Device/simulator has network connectivity

---

## 2. Manual Testing Checklist (Apply to Every Screen)

For each screen, verify:

| Check                       | Method                                          |
| --------------------------- | ----------------------------------------------- |
| UI renders correctly        | Visual inspection — Stitch green theme, spacing, typography, safe area |
| Navigation works            | Tap back, bottom tabs, screen transitions       |
| Buttons are functional      | Tap every CTA, link, icon button                |
| Forms work                  | Input text, validation errors, keyboard dismiss |
| Data loads from API         | Confirm data populates (or mock data fallback)  |
| Pull-to-refresh works       | Swipe down on scrollable screens                |
| Error states display        | Disconnect network, trigger API error           |
| Loading states show         | Observe spinner / skeleton loader on first load |
| Empty states display        | Test with no data (new user, no bookings, etc.) |

---

## 3. Screen-by-Screen Testing Plan

### 3.1 Auth — `AuthScreenNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Login tab renders | Open app when logged out | Login form with email, password, "Remember me", "Forgot Password?" link, Google sign-in button |
| Signup tab renders | Tap "Sign Up" tab | Name, email, password, confirm password fields |
| Login — empty fields | Tap "Sign In" with blank inputs | Validation error messages |
| Login — invalid email | Enter `not-an-email`, tap Sign In | "Invalid email" validation |
| Login — wrong credentials | Enter valid format, wrong password | API error message displayed |
| Login — success | Enter valid credentials, tap Sign In | Loading spinner → navigates to Home Dashboard |
| Signup — success | Fill all fields, tap Sign Up | Loading spinner → navigates to Home Dashboard |
| Forgot Password | Tap "Forgot Password?" | Navigates to `ForgotPasswordNew` screen |
| Google Sign-In | Tap Google button | OAuth flow initiates |
| Password visibility toggle | Tap eye icon | Password reveals/hides |
| Keyboard avoidance | Focus input field | Keyboard doesn't cover inputs (KeyboardAvoidingView) |

**Files:** `src/screens/AuthScreenNew.tsx`, `src/navigation/AuthStack.tsx`

---

### 3.2 Home Dashboard — `HomeDashboardNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Greeting displays | After login | "Good morning, {name}" or similar |
| Recent bookings | User with bookings | Horizontal scroll of recent/upcoming bookings |
| Nearby spots | Default location set | Grid/list of nearby parking spots |
| Search bar | Tap search, type query | Navigates to search or filters results inline |
| Pull-to-refresh | Swipe down | RefreshControl triggers, data reloads |
| Tap a parking spot | Tap spot card | Navigates to `ParkingDetailsNew` |
| Empty state | New user, no bookings | Empty state component shown |
| Loading state | First load | Skeleton loaders or activity indicator |
| Bottom nav visible | Always | 4 tabs: Home, Map, Bookings, Profile (emoji icons, green active) |
| Tab navigation | Tap each tab | Navigates correctly, active tab highlighted green |

**Files:** `src/screens/HomeDashboardNew.tsx`, `src/components/BottomNav.tsx`, `src/navigation/TabSwitcher.tsx`

---

### 3.3 Explore / Map — `ExploreMapNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Map renders | Navigate to Explore tab | MapView with markers |
| Markers display | API returns spots | Markers at spot locations |
| Marker tap | Tap a marker | Callout or navigates to spot detail |
| Map panning/zoom | Drag / pinch | Smooth interaction |
| Search on map | Use search bar | Filters map to location |
| Current location | Tap "locate me" button | Map centers on user location |
| Filter | Tap filter button | Opens filter bottom sheet/modal |
| List view toggle | Tap list icon | Switches map → list of spots |
| Empty results | Search with no matches | "No parking spots found" message |

**Files:** `src/screens/ExploreMapNew.tsx`, `src/components/SearchBar.tsx`, `src/components/BottomSheet.tsx`

---

### 3.4 My Bookings — `MyBookingsNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Bookings list | User with bookings | List/cards of bookings with status, date, spot info |
| Tab filtering | Tap "Upcoming" / "Active" / "Completed" / "Cancelled" | Filters list by status |
| Pull-to-refresh | Swipe down | Reloads bookings from API |
| Tap booking | Tap a booking card | Navigates to booking detail or parking detail |
| Cancel booking | Tap cancel on an active booking | Confirmation dialog → booking cancelled |
| Empty state | No bookings | "No bookings yet" empty state with CTA |
| Loading state | First load | Skeleton or spinner |

**Files:** `src/screens/MyBookingsNew.tsx`, `src/store/slices/marketplaceSlice.ts`

---

### 3.5 My Listings — `MyListingsNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Listings list | Host with listings | Cards showing spot info, price, status |
| Toggle availability | Tap toggle switch | Listing goes active/inactive |
| Add new listing | Tap "+" or "List Your Spot" | Navigates to `ListYourSpotNew` |
| Empty state | No listings | "No listings yet" with CTA to add |
| Pull-to-refresh | Swipe down | Reloads listings |

**Files:** `src/screens/MyListingsNew.tsx`, `src/screens/ListYourSpotNew.tsx`

---

### 3.6 Profile — `ProfileNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| User info displays | Navigate to Profile | Name, email, avatar |
| Edit Profile | Tap "Edit Profile" | Navigates to `EditProfileScreen` |
| My Vehicles | Tap "My Vehicles" | Navigates to `MyVehiclesScreen` |
| Payment Methods | Tap "Payment Methods" | Navigates to `PaymentMethodsScreen` |
| My Listings (host) | Tap "My Listings" | Navigates to `MyListingsNew` |
| Earnings (host) | Tap "Earnings" | Navigates to `EarningsNew` |
| Notifications | Tap bell icon | Navigates to `NotificationsNew` |
| Logout | Tap "Log Out" | Confirmation → clears token → returns to Auth screen |
| Version info | Scroll to bottom | App version displayed |

**Files:** `src/screens/ProfileNew.tsx`, `src/screens/EditProfileScreen.tsx`, `src/screens/MyVehiclesScreen.tsx`

---

### 3.7 Parking Details — `ParkingDetailsNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Spot info loads | Navigate from Home/Explore | Name, address, price, description, photos |
| Amenities display | Spot with amenities | Icons/chips for each amenity |
| Map preview | Small map at top | Shows pin at spot location |
| Reviews section | Spot with reviews | Star ratings, review text, reviewer name |
| Reserve button | Tap "Reserve Spot" | Navigates to `ReserveSpotNew` |
| Share button | Tap share | Share sheet opens |
| Loading state | First load | Skeleton or spinner |
| Error state | Invalid spot ID | Error message |

**Files:** `src/screens/ParkingDetailsNew.tsx`

---

### 3.8 Reserve Spot — `ReserveSpotNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Date/time picker | Tap start/end time | DateTimePicker opens |
| Price calculation | Select date range | Total price updates dynamically |
| Validation — past date | Select a past date | Error message |
| Validation — end before start | End time before start | Error message |
| Vehicle selection | Tap vehicle selector | Shows user's vehicles, select one |
| Proceed to payment | Tap "Proceed to Payment" | Navigates to `PaymentNew` |
| Cancel | Tap back / cancel | Returns to Parking Details |

**Files:** `src/screens/ReserveSpotNew.tsx`, `src/store/slices/bookingSlice.ts`

---

### 3.9 Payment — `PaymentNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Payment methods | Navigate to Payment | Shows GCash, Card, GrabPay, Maya options |
| Select method | Tap a payment method | Highlights selected, shows relevant fields |
| Amount displays | Always | Correct amount from reservation |
| Pay button | Tap "Pay Now" | Loading → calls PayMongo API |
| Payment success | Successful payment | Navigates to `BookingConfirmedNew` |
| Payment failure | Failed payment | Navigates to `PaymentFailedNew` |
| Cancel | Tap back | Returns to reservation |

**Files:** `src/screens/PaymentNew.tsx`, `src/screens/BookingConfirmedNew.tsx`, `src/screens/PaymentFailedNew.tsx`, `src/screens/PaymentMethodsScreen.tsx`

---

### 3.10 QR Scanner — `QRScannerNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Camera permission | First open | Requests camera permission |
| Camera renders | Permission granted | Camera viewfinder visible |
| Scan QR code | Point at QR code | Detects code, sends to check-in API |
| Check-in success | Valid QR | Success message, session created |
| Check-in failure | Invalid QR | Error message |
| Manual entry | Tap "Enter Code Manually" | Text input for manual code entry |
| Cancel | Tap close | Returns to previous screen |

**Files:** `src/screens/QRScannerNew.tsx`, `src/screens/QRScannerScreen.tsx`, `src/screens/QRGeneratorScreen.tsx`

---

### 3.11 Earnings — `EarningsNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Summary cards | Navigate to Earnings | Total earnings, this month, pending |
| Transaction list | Scroll down | List of transactions with amounts, dates |
| Period filter | Tap "Weekly" / "Monthly" | Updates analytics/chart |
| Pull-to-refresh | Swipe down | Reloads earnings data |
| Empty state | No earnings | "No earnings yet" message |

**Files:** `src/screens/EarningsNew.tsx`

---

### 3.12 Notifications — `NotificationsNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Notifications list | Navigate | List of notifications with title, body, timestamp |
| Unread indicator | Unread notifications | Visual badge/dot |
| Mark as read | Tap notification | Notification marked as read |
| Mark all read | Tap "Mark All Read" | All notifications marked read |
| Delete | Swipe to delete / tap delete | Notification removed |
| Empty state | No notifications | "No notifications" message |
| Pull-to-refresh | Swipe down | Reloads notifications |

**Files:** `src/screens/NotificationsNew.tsx`, `src/screens/NotificationsScreen.tsx`

---

### 3.13 Write Review — `WriteReviewNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Star rating | Tap stars | Selects 1–5 stars |
| Comment input | Type review | Text input works |
| Submit — success | Fill form, submit | Review created, returns to detail |
| Submit — empty rating | No stars selected | Validation error |
| Cancel | Tap cancel | Returns without submitting |

**Files:** `src/screens/WriteReviewNew.tsx`, `src/screens/ReviewScreen.tsx`

---

### 3.14 List Your Spot — `ListYourSpotNew.tsx`

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Form renders | Navigate from My Listings | Address, price, type, description fields |
| Photo upload | Tap add photo | Image picker opens |
| Location picker | Tap set location | Map picker or address autocomplete |
| Slot type selection | Tap type dropdown | roadside_qr, commercial_manual, commercial_iot |
| Validation — empty required fields | Submit without filling | Validation errors shown |
| Submit — success | Fill all fields, submit | Listing created, navigates back |
| Amenities | Toggle amenity chips | Selected/deselected correctly |

**Files:** `src/screens/ListYourSpotNew.tsx`, `src/components/PhotoUploader.tsx`

---

### 3.15 Additional Screens

| Screen | File | Key Tests |
|--------|------|-----------|
| Forgot Password | `ForgotPasswordNew.tsx` | Email input, submit, success message |
| Reset Password | `ResetPasswordScreen.tsx` | Token + new password, submit |
| Edit Profile | `EditProfileScreen.tsx` | Update name/phone, save |
| My Vehicles | `MyVehiclesScreen.tsx` | List, add, edit, delete, set default |
| Booking Confirmed | `BookingConfirmedNew.tsx` | Shows booking details, QR code, "Done" button |
| Payment Failed | `PaymentFailedNew.tsx` | Error message, "Try Again" button |
| Payment Methods | `PaymentMethodsScreen.tsx` | List, add, delete payment methods |
| Search Filters | `SearchFiltersNew.tsx` | Price range, distance, slot type, apply/reset |

---

## 4. User Flow Testing

### 4.1 Driver Flow (End-to-End)

```
Login → Home Dashboard → Search/Explore → Parking Details → Reserve Spot
  → Payment → Booking Confirmed → QR Check-In → QR Check-Out → Write Review
```

| Step | Action | Verify |
|------|--------|--------|
| 1 | Open app, enter credentials, tap Sign In | Lands on Home Dashboard with greeting |
| 2 | Tap search bar, type area name | Results update / map pans |
| 3 | Tap a parking spot card | Parking Details screen loads with full info |
| 4 | Tap "Reserve Spot" | Reserve screen with date pickers |
| 5 | Select start/end time, vehicle, tap "Proceed to Payment" | Payment screen with amount |
| 6 | Select GCash (or other), tap "Pay Now" | Loading spinner → Booking Confirmed |
| 7 | On Booking Confirmed, note QR code / booking ID | QR code renders correctly |
| 8 | Navigate to QR Scanner from Booking Confirmed or Home | Camera opens |
| 9 | Scan QR code or enter code manually | Check-in success message |
| 10 | After session, scan QR again for check-out | Check-out success message |
| 11 | Navigate to booking, tap "Write Review" | Review screen opens |
| 12 | Select stars, write comment, submit | Review submitted, returns to detail |

### 4.2 Host Flow (End-to-End)

```
Login → Profile → List Your Spot → My Listings (verify) → View Bookings
  → View Earnings
```

| Step | Action | Verify |
|------|--------|--------|
| 1 | Open app, login with host account | Lands on Home Dashboard |
| 2 | Navigate to Profile → "List Your Spot" | List Your Spot form |
| 3 | Fill in address, price, type, photos, submit | Success, listing created |
| 4 | Navigate to Profile → "My Listings" | New listing appears in list |
| 5 | Toggle listing availability | Status changes |
| 6 | Navigate to "My Bookings" | See incoming bookings for host spots |
| 7 | Navigate to Profile → "Earnings" | Earnings summary, transactions |

### 4.3 Auth Edge Cases

| Scenario | Steps | Expected |
|----------|-------|----------|
| Token expiry | Wait for token to expire (or manually clear from AsyncStorage) | API returns 401 → token cleared → redirect to Auth |
| Deep link reset password | Open reset password deep link | App opens ResetPassword screen with token |
| Kill and reopen app | Force close, reopen | `checkAuth` restores session from AsyncStorage |
| Logout | Tap logout in Profile | Token cleared, navigated to Auth, back button disabled |

---

## 5. Device Testing

### 5.1 iOS Simulator

```bash
cd frontend/mobile
npm run ios
```

- [ ] Runs on latest iOS simulator (iPhone 15/16)
- [ ] Bottom tabs render correctly
- [ ] Maps work (Apple Maps via react-native-maps)
- [ ] Keyboard avoidance works
- [ ] Safe area insets correct (notch/home indicator)

### 5.2 Android Emulator

```bash
cd frontend/mobile
npm run android
```

- [ ] Runs on Android emulator (Pixel 7/8, API 34+)
- [ ] Bottom tabs render correctly
- [ ] Maps work (Google Maps via react-native-maps)
- [ ] API connects to `10.0.2.2:3001` (auto-configured in `api.config.ts`)
- [ ] Back button behavior correct (Android hardware back)
- [ ] Keyboard avoidance works

### 5.3 Physical Device

```bash
cd frontend/mobile
# Set your machine's IP in .env.local
echo "EXPO_PUBLIC_BACKEND_IP=192.168.x.x" > .env.local
npm run start
# Scan QR code in Expo Go
```

- [ ] App loads via Expo Go
- [ ] API connects to local backend via LAN IP
- [ ] Camera works for QR scanner
- [ ] Location services work
- [ ] Push notifications (if implemented)
- [ ] Haptic feedback works

### 5.4 Screen Size Matrix

| Device | Size | Test |
|--------|------|------|
| iPhone SE | 4.7" | Smallest — no overflow, no clipping |
| iPhone 15 | 6.1" | Standard |
| iPhone 15 Pro Max | 6.7" | Largest iPhone — no awkward stretches |
| Pixel 7 | 6.3" | Standard Android |
| iPad (if supported) | 12.9" | Layout not broken on large screen |

---

## 6. Known Issues to Watch For

### 6.1 API Connection

| Issue | Symptom | Fix |
|-------|---------|-----|
| Backend not running | Network error, "AxiosError" | Start backend: `cd backend && npm run dev` |
| Android emulator can't reach localhost | Connection refused | API config uses `10.0.2.2:3001` automatically (`api.config.ts:22`) |
| Physical device can't reach backend | Timeout | Set `EXPO_PUBLIC_BACKEND_IP` in `.env.local` to your machine's LAN IP |
| CORS errors | 403 / blocked | Backend CORS must allow the app's origin |

### 6.2 Authentication Token

| Issue | Symptom | Fix |
|-------|---------|-----|
| Stale token | 401 on every request | Clear AsyncStorage: `AsyncStorage.clear()` or logout and re-login |
| Token not attached | 401 Unauthorized | Check `api.ts` request interceptor reads token from AsyncStorage |
| `checkAuth` fails on launch | App stuck on loading spinner | Token/user in AsyncStorage may be corrupted — clear storage |

### 6.3 Navigation Duplicates

| Issue | Symptom | Fix |
|-------|---------|-----|
| Double-tap opens screen twice | Duplicate screens on stack | Use `navigation.navigate()` (not `push`), or add debounce to buttons |
| Bottom tab double-press | Reloads same tab | `BottomNav.tsx:40` — early return if `currentTab === tab.name` |
| Back button after logout | Returns to main screen | `AppNavigator.tsx:23` — unmounts `MainStack` when `isAuthenticated` is false |
| Modal dismiss loops | Modal reopens | Check `gestureEnabled: false` on critical modals (`PaymentSuccess`, `PaymentFailed`) |

### 6.4 Other Known Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Google Maps API key missing | Map shows blank / watermark | Fetch secrets: `npm run fetch:secrets` |
| Expo secrets not fetched | Missing env vars | Run `npm run fetch:secrets` before `start` |
| `react-native-maps` crash on Android | App crashes on map screen | Ensure Google Maps API key is in `app.config.js` |
| Images not loading | Broken image placeholders | Check `expo-image` cache, verify image URLs from API |
| Redux state not persisting | Data lost on reload | State is in-memory only — rehydrates from API on mount |
| QR scanner permission denied | Blank screen | Check `expo-camera` permission flow, prompt user to enable in Settings |

---

## 7. Running Automated Tests

```bash
cd frontend/mobile

# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

**Existing test files:**
- `src/store/slices/__tests__/authSlice.test.ts`
- `src/store/slices/__tests__/bookingSlice.test.ts`
- `src/store/slices/__tests__/parkingSlice.test.ts`
- `src/__tests__/integration/booking-flow.test.tsx`
- `src/__tests__/integration/search-filter-flow.test.tsx`

---

## 8. Testing Progress Tracker

Use this table to track testing completion per screen:

| Screen | UI | Navigation | Forms | API | Refresh | Error | Empty | Loading | Status |
|--------|:--:|:----------:|:-----:|:---:|:-------:|:-----:|:-----:|:-------:|--------|
| Auth | | | | | N/A | | N/A | | |
| Forgot Password | | | | | N/A | | N/A | | |
| Home Dashboard | | | N/A | | | | | | |
| Explore / Map | | | | | | | | | |
| My Bookings | | | N/A | | | | | | |
| My Listings | | | N/A | | | | | | |
| Profile | | | N/A | | N/A | | N/A | | |
| Parking Details | | | N/A | | | | | | |
| Reserve Spot | | | | | N/A | | N/A | | |
| Payment | | | | | N/A | | N/A | | |
| Booking Confirmed | | | N/A | | N/A | | N/A | | |
| Payment Failed | | | N/A | | N/A | | N/A | | |
| QR Scanner | | | | | N/A | | N/A | | |
| Earnings | | | N/A | | | | | | |
| Notifications | | | N/A | | | | | | |
| Write Review | | | | | N/A | | N/A | | |
| List Your Spot | | | | | N/A | | N/A | | |
| Edit Profile | | | | | N/A | | N/A | | |
| My Vehicles | | | | | | | | | |
| Payment Methods | | | | | | | | | |
| Search Filters | | | | | N/A | | N/A | | |
