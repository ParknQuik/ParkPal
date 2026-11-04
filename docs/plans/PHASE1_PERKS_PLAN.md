# Phase 1 Implementation Plan: Loyalty Points and Referral System

## Overview

This document outlines the implementation plan for Phase 1 of the ParkPal perks system, focusing on loyalty points and referral mechanisms. The goal is to increase user engagement, retention, and organic growth through incentivized behaviors.

### Loyalty Points System
Users earn points for various platform activities:
- Completing a parking booking
- Referring new users who complete their first booking
- Leaving reviews for parking spots
- Participating in promotional events
- Sharing on social media (optional)

Points can be redeemed for:
- Discounts on future bookings
- Premium features access
- Partner offers (future phase)

### Referral System
Existing users receive rewards when they invite new users who:
1. Sign up using their referral code/link
2. Complete their first parking booking
Both referrer and referee receive bonus points upon successful referral completion.

## Technical Architecture

### Core Components
1. **Points Service** - Handles points accrual, redemption, and balance management
2. **Referral Service** - Manages referral codes, tracking, and reward distribution
3. **Notification Service** - Sends alerts for points earned/redeemed and referral status
4. **Analytics Integration** - Tracks user actions that earn points
5. **API Layer** - RESTful endpoints for frontend consumption

### Data Flow
1. User action triggers points accrual event (via analytics or direct API)
2. Points Service validates and updates user balance
3. Referral Service processes referral events when new users complete first booking
4. Notifications sent to users via in-app, email, or push
5. Frontend displays points balance and redemption options

### Integration Points
- **User Service**: Fetch user profiles for points/referral association
- **Booking Service**: Hook into booking completion events
- **Review Service**: Award points for review submissions
- **Auth Service**: Validate referral codes during signup
- **Payment Service**: Verify completed bookings for points eligibility

## Implementation Timeline

### Week 1: Foundation
- Day 1-2: Database schema design and migration scripts
- Day 3-4: Points Service core logic (accrual, redemption, balance queries)
- Day 5: Referral Service core (code generation, validation, tracking)

### Week 2: Integration & API
- Day 1-2: API endpoints implementation
- Day 3-4: Integration with booking and review services
- Day 5: Notification service setup and webhook configurations

### Week 3: UI Preparation & Testing
- Day 1-2: Frontend API consumption preparation
- Day 3-4: Unit and integration testing
- Day 5: Edge case handling and performance optimization

### Week 4: Beta Release & Feedback
- Day 1-2: Internal QA and bug fixing
- Day 3: Limited beta release to internal users
- Day 4: Feedback collection and iteration
- Day 5: Preparation for public release

## API Endpoints to Create

### Points Management
```
GET    /api/v1/points/balance          # Get current user's points balance
POST   /api/v1/points/accrue           # Manually add points (admin/internal use)
POST   /api/v1/points/redeem           # Redeem points for rewards
GET    /api/v1/points/history          # Get points transaction history
GET    /api/v1/points/tiers            # Get available loyalty tiers and benefits
```

### Referral System
```
POST   /api/v1/referrals/generate-code # Generate referral code for user
POST   /api/v1/referrals/validate      # Validate a referral code
GET    /api/v1/referrals/stats         # Get user's referral statistics
POST   /api/v1/referrals/process       # Process referral reward (triggered by booking completion)
```

### Webhook Endpoints (Internal)
```
POST   /api/v1/webhooks/booking-completed  # Trigger points for completed booking
POST   /api/v1/webhooks/review-submitted   # Trigger points for review submission
```

## Database Schema Summary

### Tables

#### `user_points`
- `id` (PK, UUID)
- `user_id` (FK to users, UUID)
- `balance` (INTEGER, default 0)
- `total_earned` (INTEGER, default 0)
- `total_redeemed` (INTEGER, default 0)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `points_transactions`
- `id` (PK, UUID)
- `user_id` (FK to users, UUID)
- `amount` (INTEGER) # positive for earn, negative for redeem
- `type` (ENUM: booking, referral, review, promo, redemption, adjustment)
- `description` (TEXT)
- `related_id` (UUID, nullable) # e.g., booking_id, referral_id
- `created_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP, nullable) # for points with expiration

#### `referral_codes`
- `id` (PK, UUID)
- `referrer_id` (FK to users, UUID)
- `code` (VARCHAR, unique, indexed)
- `is_active` (BOOLEAN, default true)
- `created_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP, nullable)
- `usage_count` (INTEGER, default 0)
- `max_uses` (INTEGER, nullable) # for limited-time promotions

#### `referral_rewards`
- `id` (PK, UUID)
- `referral_code_id` (FK to referral_codes, UUID)
- `referee_id` (FK to users, UUID)
- `reward_points` (INTEGER)
- `status` (ENUM: pending, completed, expired, fraudulent)
- `booking_id` (FK to bookings, UUID, nullable) # the qualifying booking
- `created_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP, nullable)

## Testing Strategy

### Unit Testing
- Points Service: accrual logic, redemption validation, balance calculations
- Referral Service: code generation, validation, reward distribution
- Edge cases: negative balances, duplicate referrals, expired codes
- Mock external dependencies (notifications, analytics)

### Integration Testing
- API endpoint validation with various auth scenarios
- Database transaction integrity (points consistency)
- Webhook trigger points from booking/review completions
- Referral flow: signup → first booking → reward distribution

### End-to-End Testing
- Complete user journey: earn points → redeem reward
- Referral journey: share code → friend signs up → completes booking → both rewarded
- Cross-service consistency checks
- Performance testing under load (simulate peak usage)

### Security Testing
- Authorization validation (users can only access their own points/referrals)
- Input sanitization and validation
- Rate limiting on referral code generation
- Protection against referral fraud (self-referrals, fake accounts)

### Monitoring & Alerts
- Track points economy metrics (total points in circulation, redemption rates)
- Monitor referral conversion rates
- Alert on anomalous activity (sudden point spikes, excessive redemptions)
- Regular audit of points transactions for consistency

## Success Metrics
- User activation rate (percentage of users earning points within first week)
- Referral conversion rate (percentage of referral codes that result in new bookings)
- Points redemption rate (percentage of earned points that are redeemed)
- User retention improvement (comparison of retention rates between users with/without points)
- Average booking value increase for users participating in perks program

## Risks & Mitigations
1. **Points Inflation**: Implement expiration policies and regular economic balancing
2. **Referral Fraud**: Device/IP tracking, minimum booking value requirements, manual review thresholds
3. **User Confusion**: Clear UI/UX with tooltips and educational content
4. **Technical Debt**: Modular design with clear service boundaries for future expansion
5. **Performance Impact**: Efficient database indexing and caching strategies for frequent balance queries

---
*Document created: 2026-05-03*
*Phase 1: Loyalty Points and Referral System Implementation Plan*