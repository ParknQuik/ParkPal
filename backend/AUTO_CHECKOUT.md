# Auto-Checkout Service

The service checks out parking sessions that exceed the 12-hour maximum duration. A cron job runs it every 30 minutes.

---

## Quick Reference

| Property | Value |
|----------|-------|
| Max duration | 12 hours |
| Cron schedule | Every 30 minutes (`*/30 * * * *`) |
| Overstay penalty | 1.5x regular rate |
| Session status change | `active` → `completed` |
| Payment method | `auto_charge` |
| Notification type | `auto_checkout` |

---

## Pricing Logic

**Regular (≤12 hours):**
```
Total = Hours × Hourly Rate
Example: 10hrs × ₱50 = ₱500
```

**Overstay (>12 hours):**
```
Regular Amount  = 12 × Hourly Rate
Overstay Amount = (Hours - 12) × (Hourly Rate × 1.5)
Total = Regular Amount + Overstay Amount
Example: 15hrs × ₱50 = (12 × ₱50) + (3 × ₱75) = ₱600 + ₱225 = ₱825
```

**Pricing table:**

| Duration | Rate | Regular | Overstay | Total |
|----------|------|---------|----------|-------|
| 5 hrs | ₱50 | ₱250 | ₱0 | **₱250** |
| 10 hrs | ₱50 | ₱500 | ₱0 | **₱500** |
| 12 hrs | ₱50 | ₱600 | ₱0 | **₱600** |
| 13 hrs | ₱50 | ₱600 | ₱75 | **₱675** |
| 15 hrs | ₱50 | ₱600 | ₱225 | **₱825** |
| 24 hrs | ₱50 | ₱600 | ₱900 | **₱1,500** |

---

## Database Updates Per Session

Each auto-checkout performs the following in a single transaction:

1. **ParkingSession** — set `checkOutTime`, `durationMinutes`, `totalAmount`; status `active` → `completed`
2. **ParkingSlot** — status `occupied` → `available`
3. **Booking** (if linked) — status → `completed`, `endTime` set
4. **Payment** (created) — `payment_method: auto_charge`, `status: pending`, `transactionId: auto_checkout_{sessionId}_{timestamp}`
5. **Notification** (created) — title: "Auto Checkout - Session Expired", includes duration, total, overstay info

---

## Configuration

**Change max duration** (`backend/services/autoCheckout.js`):
```javascript
const MAX_DURATION_MS = 12 * 60 * 60 * 1000; // Change 12 to desired hours
```

**Change overstay penalty** (`backend/services/autoCheckout.js`):
```javascript
const overstayRate = regularRate * 1.5; // Change 1.5 to desired multiplier
```

**Change cron schedule** (`backend/index.js`):
```javascript
cron.schedule('*/30 * * * *', ...);
// Every 15 min: '*/15 * * * *'
// Every hour:   '0 * * * *'
// Every 6 hrs:  '0 */6 * * *'
```

---

## Cron Integration (index.js)

```javascript
if (process.env.NODE_ENV !== 'test') {
  const { autoCheckoutExpiredSessions } = require('./services/autoCheckout');

  cron.schedule('*/30 * * * *', async () => {
    try {
      await autoCheckoutExpiredSessions();
    } catch (error) {
      logger.error('[Cron] Auto-checkout failed:', error);
    }
  });

  logger.info('Auto-checkout cron job scheduled (every 30 minutes)');
}
```

Cron is **disabled in test mode** to prevent interference with tests.

---

## Manual Trigger

```javascript
const { autoCheckoutExpiredSessions } = require('./services/autoCheckout');
const result = await autoCheckoutExpiredSessions();
// { processed: 5, failed: 0, totalRevenue: 2450 }
```

Or from the command line:
```bash
node -e "require('./services/autoCheckout').autoCheckoutExpiredSessions().then(r => console.log(r)).catch(e => console.error(e))"
```

---

## Testing

```bash
# Run test suite
npm test tests/autoCheckout.test.js

# Syntax check
node -c services/autoCheckout.js
```

Expected output:
```
PASS tests/autoCheckout.test.js
  Auto-Checkout Service
    ✓ should checkout a session and calculate correct amount without overstay
    ✓ should calculate correct amount with overstay penalty
    ✓ should find and checkout expired sessions
    ✓ should not checkout sessions under 12 hours
```

### Manual Test Scenarios

**Scenario 1 — Create an expired session and trigger checkout:**

```sql
-- Find test user and slot
SELECT id, email FROM "users" LIMIT 1;
SELECT id, slot_number, price, status FROM "parking_slots" WHERE status = 'available' LIMIT 1;

-- Create a session 13 hours ago (1hr overstay)
INSERT INTO "parking_sessions" (user_id, slot_id, session_type, check_in_time, status, created_at, updated_at)
VALUES (1, 1, 'commercial_manual', NOW() - INTERVAL '13 hours', 'active', NOW(), NOW());

UPDATE "parking_slots" SET status = 'occupied' WHERE id = 1;
```

Then run:
```javascript
const { autoCheckoutExpiredSessions } = require('./services/autoCheckout');
const result = await autoCheckoutExpiredSessions();
console.log(result);
```

Verify:
- Session `status` = `completed`, `check_out_time` set, `duration_minutes` ≈ 780
- Slot `status` = `available`
- Payment created with `payment_method = 'auto_charge'`, `status = 'pending'`
- Notification created with `type = 'auto_checkout'`

**Scenario 2 — Non-expired session should not be touched:**

```sql
INSERT INTO "parking_sessions" (user_id, slot_id, session_type, check_in_time, status, created_at, updated_at)
VALUES (1, 2, 'commercial_manual', NOW() - INTERVAL '5 hours', 'active', NOW(), NOW());
```

Run checkout — session must remain `active`, no payment, no notification.

**Scenario 3 — Edge case: exactly 12 hours**

Session at `NOW() - INTERVAL '12 hours'` should NOT be checked out (cutoff is strictly > 12 hours). Session at `NOW() - INTERVAL '12 hours 1 minute'` should be checked out.

**Scenario 4 — Transaction rollback test**

Temporarily add `throw new Error('Simulated failure')` inside the checkout logic. Verify the session remains `active` with no partial updates.

---

## SQL Monitoring Queries

**Find active expired sessions:**
```sql
SELECT id, user_id, check_in_time,
       EXTRACT(EPOCH FROM (NOW() - check_in_time))/3600 AS hours
FROM parking_sessions
WHERE status = 'active'
  AND check_in_time <= NOW() - INTERVAL '12 hours';
```

**Recent auto-checkouts:**
```sql
SELECT ps.id, ps.user_id, ps.check_in_time, ps.check_out_time,
       ps.duration_minutes, ps.total_amount
FROM parking_sessions ps
WHERE ps.status = 'completed'
  AND ps.check_out_time >= NOW() - INTERVAL '1 day'
  AND EXISTS (
    SELECT 1 FROM payments p
    WHERE p.session_id = ps.id AND p.payment_method = 'auto_charge'
  )
ORDER BY ps.check_out_time DESC;
```

**Today's auto-checkout revenue:**
```sql
SELECT COUNT(*) AS sessions, SUM(amount) AS total_revenue
FROM payments
WHERE payment_method = 'auto_charge'
  AND created_at >= CURRENT_DATE;
```

**Sessions stuck in active > 12 hrs (should be 0):**
```sql
SELECT COUNT(*) FROM parking_sessions
WHERE status = 'active'
  AND check_in_time <= NOW() - INTERVAL '12 hours';
```

---

## Logs

```
[Auto-Checkout] Running expired sessions check...
[Auto-Checkout] Found {n} expired sessions
[Auto-Checkout] Processing session {id} for user {userId}
[Auto-Checkout] Completed session {id}: {hours}hrs, ₱{amount}
[Auto-Checkout] Completed: {processed} processed, {failed} failed, ₱{revenue} revenue
[Cron] Auto-checkout failed: ...  ← error case
```

---

## Error Handling

- Individual session failures do not stop the entire batch
- Failed sessions are logged and counted in the `failed` result
- Transaction rollback ensures no partial database corruption
- Failed sessions remain `active` and will be retried on the next cron run

---

## Troubleshooting

**Cron job not running:** Check server logs for "Auto-checkout cron job scheduled". Verify `NODE_ENV !== 'test'`.

**Sessions not being checked out:** Verify sessions are strictly > 12 hours old and `status = 'active'`. Check database connection.

**Incorrect pricing:** Verify the slot `price` field is set. Test with known values.

**Notifications not sent:** Check the Notification table for created records. Verify push notification service is configured.

**Payments not created:** Check Payment table. Verify transaction did not fail/rollback. Review error logs.

---

## Future Enhancements

- [ ] Configurable max duration per slot/zone
- [ ] Tiered overstay penalties (e.g., 1.5x for 12-24hr, 2x for >24hr)
- [ ] Email notifications in addition to push notifications
- [ ] Dashboard metrics for auto-checkout revenue
- [ ] Grace period before applying penalties
- [ ] User warnings at 11 hours (1 hour before auto-checkout)
