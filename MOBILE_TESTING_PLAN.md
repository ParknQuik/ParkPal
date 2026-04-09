# ParkPal Mobile App Testing Plan

## Document Information
- **Project**: ParkPal Mobile App (React Native/Expo)
- **Theme**: Stitch Green (#10b77f)
- **Version**: 1.0.0
- **Last Updated**: April 2026

---

## 1. Testing Categories

### 1.1 UI/UX Testing

#### Screen Inventory (20+ Screens)

| Screen | Category | Expected Theme Color |
|--------|----------|---------------------|
| HomeDashboard | Tab | #10b77f |
| ExploreMap | Tab | #10b77f |
| MyBookingsScreen | Tab | #10b77f |
| ProfileScreen | Tab | #10b77f |
| AuthScreen | Auth | #10b77f |
| ForgotPasswordScreen | Auth | #10b77f |
| ResetPasswordScreen | Auth | #10b77f |
| ParkingDetails | Detail | #10b77f |
| ReserveSpot | Booking | #10b77f |
| ListYourSpot | Host | #10b77f |
| QRScannerScreen | QR | #10b77f |
| QRGeneratorScreen | QR | #10b77f |
| WriteReview | Review | #10b77f |
| EditProfileScreen | Profile | #10b77f |
| PaymentScreen | Payment | #10b77f |
| BookingConfirmed | Payment | #10b77f |
| PaymentFailedScreen | Payment | #10b77f |
| PaymentMethodsScreen | Payment | #10b77f |
| EarningsScreen | Host | #10b77f |
| MyListingsScreen | Host | #10b77f |
| NotificationsScreen | Profile | #10b77f |
| MyVehiclesScreen | Profile | #10b77f |
| SearchFilters | Search | #10b77f |

#### Test Cases

| Test Case ID | Test Description | Expected Result | Failure Action |
|--------------|-------------------|-----------------|----------------|
| UI-001 | Verify all screens use #10b77f primary color | All buttons, icons, highlights use green theme | Screenshot, note which screens deviate |
| UI-002 | Check tab navigation (Home, Explore, Bookings, Profile) | All 4 tabs visible, active state shows #10b77f | Note if tabs missing or duplicate |
| UI-003 | Verify consistent typography across screens | Same font sizes, weights for headers/body | Document inconsistencies |
| UI-004 | Check spacing consistency (margins, padding) | Consistent 8px/16px/24px grid | Document spacing violations |
| UI-005 | Verify no duplicate tabs in bottom navigation | Single set of 4 tabs | Note any duplicates |
| UI-006 | Check all components render correctly | No broken layouts, missing elements | Screenshot broken components |
| UI-007 | Verify header styles consistent | Same back button, title styling | Document deviations |
| UI-008 | Check button styles (primary, secondary, outline) | All buttons follow design system | Screenshot inconsistencies |
| UI-009 | Verify input field styling | Same border, focus states | Document variations |
| UI-010 | Check card component styling | Consistent shadows, borders | Note differences |

### 1.2 Authentication Testing

| Test Case ID | Test Description | Expected Result | Failure Action |
|--------------|-------------------|-----------------|----------------|
| AUTH-001 | Test email/password login with valid credentials | User logged in, navigates to Home | Capture error message |
| AUTH-002 | Test email/password login with invalid credentials | Show error message, stay on login | Screenshot error |
| AUTH-003 | Test email/password signup with valid data | Account created, navigates to Home | Capture any issues |
| AUTH-004 | Test signup with existing email | Show "email exists" error | Screenshot error |
| AUTH-005 | Test Google OAuth flow | Redirect to Google, return with token | Note any OAuth errors |
| AUTH-006 | Test logout functionality | User returns to Auth screen | Verify session cleared |
| AUTH-007 | Test session persistence after app restart | Auto-login if token valid | Check token storage |
| AUTH-008 | Test forgot password flow | Send reset email, show success | Capture email if sent |
| AUTH-009 | Test reset password with valid token | Password updated, show success | Document issues |
| AUTH-010 | Test reset password with expired token | Show "token expired" error | Screenshot error |
| AUTH-011 | Test input validation (email format, password length) | Show validation errors inline | Verify error messages |

### 1.3 Core User Flow Testing

| Test Case ID | Test Description | Expected Result | Failure Action |
|--------------|-------------------|-----------------|----------------|
| FLOW-001 | Search for parking spots by location | Show list of available spots | Capture API errors |
| FLOW-002 | Apply filters (price, distance, rating) | Results update accordingly | Note filter issues |
| FLOW-003 | View parking spot details | Show all details, photos, pricing | Screenshot missing info |
| FLOW-004 | Select date and time for booking | Date/time picker works, shows selection | Document picker issues |
| FLOW-005 | Select vehicle for booking | Vehicle list displays, selection works | Note vehicle selection issues |
| FLOW-006 | Review booking summary | Show all details, total price | Verify pricing accuracy |
| FLOW-007 | Create booking (submit reservation) | Booking created, proceed to payment | Capture errors |
| FLOW-008 | Complete payment flow | Payment processed, booking confirmed | Note payment issues |
| FLOW-009 | View booking in My Bookings | Booking appears in list | Check booking display |
| FLOW-010 | Cancel booking (if allowed) | Booking cancelled, refund initiated | Document cancellation issues |

### 1.4 QR Code System Testing

| Test Case ID | Test Description | Expected Result | Failure Action |
|--------------|-------------------|-----------------|----------------|
| QR-001 | Test QR scanner camera permissions | Prompt for camera, permission dialog appears | Note permission handling |
| QR-002 | Test QR scanner functionality | Scan QR code, extract booking data | Document scan failures |
| QR-003 | Test QR generator display | Generate QR for active booking | Verify QR generation |
| QR-004 | Test QR code contains correct data | QR encodes booking ID, spot info | Decode and verify |
| QR-005 | Test check-in flow (scan to start rental) | Scan host QR, start parking session | Note check-in issues |
| QR-006 | Test check-out flow (scan to end rental) | Scan QR, end session, calculate fee | Document check-out |
| QR-007 | Test invalid QR handling | Show error for invalid/expired QR | Verify error message |
| QR-008 | Test QR scanner in low light | Camera adjusts, still scans | Note limitations |
| QR-009 | Test QR expiration handling | Show message if QR expired | Document expiration flow |

### 1.5 Payment Testing

| Test Case ID | Test Description | Expected Result | Failure Action |
|--------------|-------------------|-----------------|----------------|
| PAY-001 | Test card payment via PayMongo | Process payment, show success | Capture errors |
| PAY-002 | Test GCash payment via PayMongo | Redirect to GCash, complete payment | Note redirect issues |
| PAY-003 | Test cash payment option (if exists) | Show cash payment instructions | Document cash flow |
| PAY-004 | Test payment confirmation screen | Show booking details, confirmation | Verify details correct |
| PAY-005 | Test payment failure handling | Show error, retry option | Capture failure screen |
| PAY-006 | Test saved payment methods | Display saved cards/GCash | Verify saved methods |
| PAY-007 | Test add new payment method | Add card/GCash successfully | Note any validation issues |
| PAY-008 | Test payment receipt generation | Generate receipt after payment | Verify receipt details |
| PAY-009 | Test refund flow (for cancellations) | Process refund, show confirmation | Document refund timing |
| PAY-010 | Test partial refund calculation | Calculate correct refund amount | Verify refund amount |

---

## 2. Test Execution Instructions

### Pre-requisites
1. Install app on iOS/Android device or emulator
2. Configure backend URL in app settings
3. Ensure test user accounts are available
4. Have test payment cards configured in PayMongo test mode
5. Clear app cache before starting test cycle

### Execution Steps

1. **UI/UX Testing**
   - Open app and navigate through all screens
   - Take screenshots of each screen
   - Compare colors against #10b77f reference
   - Check tab navigation works correctly
   - Verify all interactive elements respond

2. **Authentication Testing**
   - Create new account with email/password
   - Login with created credentials
   - Test Google OAuth (if configured)
   - Logout and verify return to login
   - Restart app to verify session persistence
   - Test forgot password email flow

3. **Core User Flow Testing**
   - Search for parking in test location
   - Select a parking spot
   - Choose date/time
   - Select vehicle
   - Proceed to payment
   - Complete booking

4. **QR Code Testing**
   - Create a test booking
   - Open QR generator for booking
   - Test scanner with generated QR
   - Simulate check-in flow
   - Simulate check-out flow

5. **Payment Testing**
   - Use test payment methods
   - Complete successful payment
   - Test failed payment scenarios
   - Verify payment confirmation

### Failure Documentation
- Screenshot the exact error/state
- Note device/emulator model
- Record app version
- Document steps to reproduce
- Note network conditions

---

## 3. Issues Found Section

### Issue Tracking Table

| Test Category | Test Case ID | Expected Result | Actual Result | Status | Notes |
|---------------|--------------|------------------|---------------|--------|-------|
| UI/UX | UI-001 | All screens use #10b77f | TBD | Pending | To be tested |
| UI/UX | UI-002 | 4 tabs visible | TBD | Pending | To be tested |
| UI/UX | UI-003 | Consistent typography | TBD | Pending | To be tested |
| UI/UX | UI-004 | Consistent spacing | TBD | Pending | To be tested |
| UI/UX | UI-005 | No duplicate tabs | TBD | Pending | To be tested |
| UI/UX | UI-006 | No broken layouts | TBD | Pending | To be tested |
| UI/UX | UI-007 | Consistent headers | TBD | Pending | To be tested |
| UI/UX | UI-008 | Consistent buttons | TBD | Pending | To be tested |
| UI/UX | UI-009 | Consistent inputs | TBD | Pending | To be tested |
| UI/UX | UI-010 | Consistent cards | TBD | Pending | To be tested |
| Auth | AUTH-001 | Login success | TBD | Pending | To be tested |
| Auth | AUTH-002 | Login fails with bad credentials | TBD | Pending | To be tested |
| Auth | AUTH-003 | Signup success | TBD | Pending | To be tested |
| Auth | AUTH-004 | Signup fails with existing email | TBD | Pending | To be tested |
| Auth | AUTH-005 | Google OAuth works | TBD | Pending | To be tested |
| Auth | AUTH-006 | Logout works | TBD | Pending | To be tested |
| Auth | AUTH-007 | Session persists | TBD | Pending | To be tested |
| Auth | AUTH-008 | Forgot password works | TBD | Pending | To be tested |
| Auth | AUTH-009 | Reset password works | TBD | Pending | To be tested |
| Auth | AUTH-010 | Expired token handled | TBD | Pending | To be tested |
| Auth | AUTH-011 | Validation errors shown | TBD | Pending | To be tested |
| Flow | FLOW-001 | Search returns results | TBD | Pending | To be tested |
| Flow | FLOW-002 | Filters work | TBD | Pending | To be tested |
| Flow | FLOW-003 | Details display | TBD | Pending | To be tested |
| Flow | FLOW-004 | Date/time works | TBD | Pending | To be tested |
| Flow | FLOW-005 | Vehicle selection works | TBD | Pending | To be tested |
| Flow | FLOW-006 | Summary correct | TBD | Pending | To be tested |
| Flow | FLOW-007 | Booking created | TBD | Pending | To be tested |
| Flow | FLOW-008 | Payment completes | TBD | Pending | To be tested |
| Flow | FLOW-009 | Booking appears in list | TBD | Pending | To be tested |
| Flow | FLOW-010 | Cancel works | TBD | Pending | To be tested |
| QR | QR-001 | Camera permission prompt | TBD | Pending | To be tested |
| QR | QR-002 | Scanner works | TBD | Pending | To be tested |
| QR | QR-003 | QR generator works | TBD | Pending | To be tested |
| QR | QR-004 | QR data correct | TBD | Pending | To be tested |
| QR | QR-005 | Check-in works | TBD | Pending | To be tested |
| QR | QR-006 | Check-out works | TBD | Pending | To be tested |
| QR | QR-007 | Invalid QR handled | TBD | Pending | To be tested |
| QR | QR-008 | Low light scanning | TBD | Pending | To be tested |
| QR | QR-009 | Expiration handled | TBD | Pending | To be tested |
| Payment | PAY-001 | Card payment works | TBD | Pending | To be tested |
| Payment | PAY-002 | GCash works | TBD | Pending | To be tested |
| Payment | PAY-003 | Cash option works | TBD | Pending | To be tested |
| Payment | PAY-004 | Confirmation shows | TBD | Pending | To be tested |
| Payment | PAY-005 | Failure handled | TBD | Pending | To be tested |
| Payment | PAY-006 | Saved methods show | TBD | Pending | To be tested |
| Payment | PAY-007 | Add method works | TBD | Pending | To be tested |
| Payment | PAY-008 | Receipt generates | TBD | Pending | To be tested |
| Payment | PAY-009 | Refund works | TBD | Pending | To be tested |
| Payment | PAY-010 | Partial refund correct | TBD | Pending | To be tested |

---

## 4. Timeline Estimation

### Issue Count Summary (To be filled after testing)

| Category | Pass Count | Fail Count | Blocker Count | Total Tests |
|----------|-------------|------------|----------------|--------------|
| UI/UX | 0 | 0 | 0 | 10 |
| Auth | 0 | 0 | 0 | 11 |
| Flow | 0 | 0 | 0 | 10 |
| QR | 0 | 0 | 0 | 9 |
| Payment | 0 | 0 | 0 | 10 |
| **Total** | **0** | **0** | **0** | **50** |

### Timeline Estimates (Based on typical issue distribution)

**Assumed Issue Distribution (based on typical React Native apps):**
- UI/UX Issues: 3-5 issues expected
- Auth Issues: 1-3 issues expected
- Booking Flow Issues: 2-4 issues expected
- Payment Issues: 1-3 issues expected
- QR System Issues: 2-4 issues expected

### Estimated Fix Timelines

| Category | Issues Expected | Fix Days | Notes |
|----------|-----------------|-----------|-------|
| UI/UX | 3-5 | 2-3 days | Theme consistency fixes |
| Auth | 1-3 | 1-2 days | OAuth, validation fixes |
| Booking Flow | 2-4 | 2-3 days | API integration, state fixes |
| Payment | 1-3 | 1-2 days | PayMongo integration fixes |
| QR System | 2-4 | 2-3 days | Scanner, generator fixes |

### Total Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Testing Execution | 2-3 days | Run all 50 test cases |
| Issue Review | 0.5 day | Review and categorize issues |
| UI/UX Fixes | 2-3 days | Fix visual inconsistencies |
| Auth Fixes | 1-2 days | Fix authentication issues |
| Booking Flow Fixes | 2-3 days | Fix user flow issues |
| Payment Fixes | 1-2 days | Fix payment integration |
| QR System Fixes | 2-3 days | Fix QR functionality |
| Regression Testing | 1 day | Verify all fixes |
| **Total** | **11-17 days** | Full testing and fix cycle |

### Recommendations

1. **Priority 1 (Day 1-3)**: Run UI/UX and Auth tests first - these are foundational
2. **Priority 2 (Day 3-6)**: Run Core Flow and Payment tests
3. **Priority 3 (Day 6-9)**: Run QR System tests
4. **Priority 4 (Day 9-14)**: Fix issues based on severity
5. **Priority 5 (Day 15-17)**: Regression testing

### Severity Definitions
- **Blocker**: App crashes, cannot proceed to next step
- **Fail**: Feature doesn't work as expected
- **Pass**: Feature works correctly

---

## Appendix: Test Environment

### Device Requirements
- iOS: iPhone 12+ (iOS 15+)
- Android: Pixel 5+ (Android 12+)
- Expo Go app for development

### Backend Requirements
- Staging API accessible
- PayMongo test environment configured
- Test user accounts available
- Test parking spots available

### Test Accounts
- Email: test@example.com / Password: Test123!
- Google: Test Google account configured

### Color Reference
- Primary Green: #10b77f
- Secondary Orange: #f59e0b
- Background: #f6f8f7
- Text Primary: #1e293b
- Text Secondary: #64748b