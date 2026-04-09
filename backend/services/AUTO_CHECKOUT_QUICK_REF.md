# Auto-Checkout Quick Reference

## Key Information

| Property | Value |
|----------|-------|
| **Max Duration** | 12 hours |
| **Cron Schedule** | Every 30 minutes (`*/30 * * * *`) |
| **Overstay Penalty** | 1.5x regular rate |
| **Status Change** | `active` → `completed` |
| **Payment Method** | `auto_charge` |
| **Notification Type** | `auto_checkout` |

## Pricing Formula

```javascript
// Regular (≤12 hours)
total = hours × hourly_rate

// With Overstay (>12 hours)
regular_amount = 12 × hourly_rate
overstay_amount = (hours - 12) × (hourly_rate × 1.5)
total = regular_amount + overstay_amount
```

## Quick Examples

| Duration | Rate | Regular | Overstay | Total |
|----------|------|---------|----------|-------|
| 5 hrs    | ₱50  | ₱250    | ₱0       | **₱250** |
| 10 hrs   | ₱50  | ₱500    | ₱0       | **₱500** |
| 12 hrs   | ₱50  | ₱600    | ₱0       | **₱600** |
| 13 hrs   | ₱50  | ₱600    | ₱75      | **₱675** |
| 15 hrs   | ₱50  | ₱600    | ₱225     | **₱825** |
| 24 hrs   | ₱50  | ₱600    | ₱900     | **₱1,500** |

## Database Updates Per Session

```
1. ParkingSession → status: completed ✓
2. ParkingSlot    → status: available ✓
3. Booking        → status: completed ✓ (if linked)
4. Payment        → Create new record ✓
5. Notification   → Send to user ✓
```

## Files

```
📁 backend/
  📁 services/
    📄 autoCheckout.js                  ← Core service
    📄 AUTO_CHECKOUT_README.md          ← Full documentation
    📄 AUTO_CHECKOUT_MANUAL_TEST.md     ← Testing guide
    📄 AUTO_CHECKOUT_QUICK_REF.md       ← This file
  📄 index.js                            ← Cron job setup (lines 193-207)
  📁 tests/
    📄 autoCheckout.test.js             ← Test suite
  📄 AUTO_CHECKOUT_SUMMARY.md           ← Implementation summary
```

## Manual Trigger

```javascript
const { autoCheckoutExpiredSessions } = require('./services/autoCheckout');
const result = await autoCheckoutExpiredSessions();
// { processed: 5, failed: 0, totalRevenue: 2450 }
```

## Key Logs

```
✓ [Auto-Checkout] Running expired sessions check...
✓ [Auto-Checkout] Found X expired sessions
✓ [Auto-Checkout] Processing session X for user Y
✓ [Auto-Checkout] Completed session X: Xhrs, ₱XXX.XX
✓ [Auto-Checkout] Completed: X processed, Y failed, ₱ZZZ.ZZ revenue
✗ [Cron] Auto-checkout failed: ...
```

## SQL Queries

**Find active expired sessions:**
```sql
SELECT id, "user_id", "check_in_time", 
       EXTRACT(EPOCH FROM (NOW() - "check_in_time"))/3600 as hours
FROM "parking_sessions"
WHERE status = 'active'
  AND "check_in_time" <= NOW() - INTERVAL '12 hours';
```

**Check recent auto-checkouts:**
```sql
SELECT ps.id, ps."user_id", ps."check_in_time", ps."check_out_time",
       ps."duration_minutes", ps."total_amount"
FROM "parking_sessions" ps
WHERE ps.status = 'completed'
  AND ps."check_out_time" >= NOW() - INTERVAL '1 day'
  AND EXISTS (
    SELECT 1 FROM "payments" p 
    WHERE p."session_id" = ps.id 
    AND p."payment_method" = 'auto_charge'
  )
ORDER BY ps."check_out_time" DESC;
```

**Today's auto-checkout revenue:**
```sql
SELECT COUNT(*) as sessions,
       SUM(amount) as total_revenue
FROM "payments"
WHERE "payment_method" = 'auto_charge'
  AND "created_at" >= CURRENT_DATE;
```

## Configuration Changes

**Change max duration:**
```javascript
// In services/autoCheckout.js
const MAX_DURATION_MS = 12 * 60 * 60 * 1000; // Change 12 to desired hours
```

**Change overstay penalty:**
```javascript
// In services/autoCheckout.js, performAutoCheckout()
const overstayRate = regularRate * 1.5; // Change 1.5 to desired multiplier
```

**Change cron schedule:**
```javascript
// In index.js
cron.schedule('*/30 * * * *', ...); // Change pattern
// Examples:
// Every 15 min: '*/15 * * * *'
// Every hour:   '0 * * * *'
// Every 6 hrs:  '0 */6 * * *'
```

## Testing

```bash
# Run test suite
npm test tests/autoCheckout.test.js

# Syntax check
node -c services/autoCheckout.js

# Manual test
node -e "require('./services/autoCheckout').autoCheckoutExpiredSessions().then(r => console.log(r)).catch(e => console.error(e))"
```

## Monitoring Queries

**Sessions stuck in active > 12 hrs:**
```sql
SELECT COUNT(*) FROM "parking_sessions"
WHERE status = 'active'
  AND "check_in_time" <= NOW() - INTERVAL '12 hours';
```

**Failed auto-checkouts (no payment):**
```sql
SELECT ps.* FROM "parking_sessions" ps
WHERE ps.status = 'completed'
  AND ps."check_out_time" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "payments" p WHERE p."session_id" = ps.id
  );
```

## Support Contacts

- Documentation: `/backend/services/AUTO_CHECKOUT_README.md`
- Testing Guide: `/backend/services/AUTO_CHECKOUT_MANUAL_TEST.md`
- Implementation Summary: `/backend/AUTO_CHECKOUT_SUMMARY.md`
