# Auto-Checkout Manual Testing Guide

## Prerequisites

1. Backend server running with database connection
2. Access to database (Prisma Studio or SQL client)
3. Valid test user account
4. Valid parking slot in database

## Test Scenarios

### Scenario 1: Create and Verify Expired Session

#### Step 1: Create Test Session
Using your API client (Postman, curl, etc.) or directly in database:

```sql
-- Find a test user ID
SELECT id, email FROM "users" LIMIT 1;

-- Find an available parking slot
SELECT id, "slot_number", price, status FROM "parking_slots" WHERE status = 'available' LIMIT 1;

-- Create a session from 13 hours ago (1 hour overstay)
INSERT INTO "parking_sessions" (
  "user_id",
  "slot_id",
  "session_type",
  "check_in_time",
  "status",
  "created_at",
  "updated_at"
) VALUES (
  1, -- Replace with your user ID
  1, -- Replace with your slot ID
  'commercial_manual',
  NOW() - INTERVAL '13 hours',
  'active',
  NOW(),
  NOW()
);

-- Update slot status to occupied
UPDATE "parking_slots" SET status = 'occupied' WHERE id = 1;
```

#### Step 2: Trigger Auto-Checkout Manually

In Node.js console or create a test script:

```javascript
// backend/test-auto-checkout.js
const { autoCheckoutExpiredSessions } = require('./services/autoCheckout');

async function test() {
  try {
    const result = await autoCheckoutExpiredSessions();
    console.log('Auto-checkout result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
```

Run it:
```bash
node test-auto-checkout.js
```

#### Step 3: Verify Results

Check the following in database:

**1. Session should be completed:**
```sql
SELECT id, "user_id", "check_in_time", "check_out_time", 
       "duration_minutes", "total_amount", status
FROM "parking_sessions"
WHERE id = <session_id>;
```

Expected:
- `status` = 'completed'
- `check_out_time` is set
- `duration_minutes` ≈ 780 (13 hours)
- `total_amount` = (12 × hourly_rate) + (1 × hourly_rate × 1.5)

**2. Slot should be available:**
```sql
SELECT id, status FROM "parking_slots" WHERE id = <slot_id>;
```

Expected:
- `status` = 'available'

**3. Payment should be created:**
```sql
SELECT id, "user_id", "session_id", amount, "payment_method", status
FROM "payments"
WHERE "session_id" = <session_id>;
```

Expected:
- `payment_method` = 'auto_charge'
- `status` = 'pending'
- `amount` matches session total_amount

**4. Notification should be sent:**
```sql
SELECT id, "user_id", title, body, type, data
FROM "notifications"
WHERE "user_id" = <user_id> AND type = 'auto_checkout'
ORDER BY "created_at" DESC LIMIT 1;
```

Expected:
- `title` = 'Auto Checkout - Session Expired'
- `body` contains duration and total amount
- `type` = 'auto_checkout'
- `data` JSON contains session details

### Scenario 2: Test Overstay Penalty Calculation

Create sessions with different durations and verify pricing:

| Duration | Hourly Rate | Expected Calculation | Expected Total |
|----------|-------------|---------------------|----------------|
| 5 hours  | ₱50        | 5 × 50              | ₱250          |
| 12 hours | ₱50        | 12 × 50             | ₱600          |
| 13 hours | ₱50        | (12 × 50) + (1 × 75) | ₱675          |
| 15 hours | ₱50        | (12 × 50) + (3 × 75) | ₱825          |
| 24 hours | ₱50        | (12 × 50) + (12 × 75) | ₱1,500        |

```javascript
// backend/test-pricing.js
async function testPricing() {
  const testCases = [
    { hours: 5, rate: 50, expected: 250 },
    { hours: 12, rate: 50, expected: 600 },
    { hours: 13, rate: 50, expected: 675 },
    { hours: 15, rate: 50, expected: 825 },
    { hours: 24, rate: 50, expected: 1500 },
  ];

  for (const test of testCases) {
    const regularHours = Math.min(test.hours, 12);
    const overstayHours = Math.max(0, test.hours - 12);
    const total = (regularHours * test.rate) + (overstayHours * test.rate * 1.5);
    
    console.log(`${test.hours}hrs @ ₱${test.rate}/hr:`);
    console.log(`  Regular: ${regularHours}hrs × ₱${test.rate} = ₱${regularHours * test.rate}`);
    if (overstayHours > 0) {
      console.log(`  Overstay: ${overstayHours}hrs × ₱${test.rate * 1.5} = ₱${overstayHours * test.rate * 1.5}`);
    }
    console.log(`  Total: ₱${total} ${total === test.expected ? '✅' : '❌ Expected: ₱' + test.expected}\n`);
  }
}

testPricing();
```

### Scenario 3: Test Cron Job Integration

#### Step 1: Start Server
```bash
npm start
```

Look for log message:
```
Auto-checkout cron job scheduled (every 30 minutes)
```

#### Step 2: Create Expired Session
Create a session from 13+ hours ago (as in Scenario 1)

#### Step 3: Wait or Force Trigger
Either:
- Wait 30 minutes for automatic execution
- OR modify cron schedule temporarily to run every minute:

```javascript
// In index.js, change:
cron.schedule('*/30 * * * *', async () => {
// To:
cron.schedule('* * * * *', async () => {
```

#### Step 4: Check Logs
Watch server logs for:
```
[Auto-Checkout] Running expired sessions check...
[Auto-Checkout] Found X expired sessions
[Auto-Checkout] Processing session Y for user Z
[Auto-Checkout] Completed session Y: Xhrs, ₱XXX.XX
[Auto-Checkout] Completed: X processed, Y failed, ₱ZZZ.ZZ revenue
```

### Scenario 4: Test Non-Expired Sessions

Create a session from only 5 hours ago:

```sql
INSERT INTO "parking_sessions" (
  "user_id", "slot_id", "session_type", "check_in_time", "status",
  "created_at", "updated_at"
) VALUES (
  1, 2, 'commercial_manual', NOW() - INTERVAL '5 hours', 'active',
  NOW(), NOW()
);
```

Run auto-checkout:
```bash
node test-auto-checkout.js
```

Verify:
- Session remains `active`
- No payment created
- No notification sent
- Slot remains `occupied`

### Scenario 5: Test Transaction Rollback

Simulate a failure scenario by temporarily modifying the code to throw an error:

```javascript
// In services/autoCheckout.js, add after line 100:
throw new Error('Simulated failure for testing');
```

Run auto-checkout and verify:
- Session remains `active` (transaction rolled back)
- No partial updates
- Error logged
- Process continues with other sessions

### Scenario 6: Test Multiple Sessions

Create 5 expired sessions with different durations and verify:
- All are processed in single run
- Result shows correct count: `{ processed: 5, failed: 0, totalRevenue: XXX }`
- All have correct pricing
- All notifications sent

### Scenario 7: Test Edge Cases

**Test 1: Session exactly at 12 hours**
```sql
-- Session from exactly 12 hours ago
INSERT INTO "parking_sessions" (...) VALUES (
  ..., NOW() - INTERVAL '12 hours', ...
);
```
Expected: Should NOT auto-checkout (cutoff is strictly > 12 hours)

**Test 2: Session at 12 hours 1 minute**
```sql
-- Session from 12 hours 1 minute ago
INSERT INTO "parking_sessions" (...) VALUES (
  ..., NOW() - INTERVAL '12 hours 1 minute', ...
);
```
Expected: Should auto-checkout

**Test 3: Session with no slot**
```sql
INSERT INTO "parking_sessions" (
  "user_id", "slot_id", "session_type", "check_in_time", "status"
) VALUES (
  1, NULL, 'roadside_qr', NOW() - INTERVAL '13 hours', 'active'
);
```
Expected: Should process normally, skip slot update

**Test 4: Session with linked booking**
Create session with `booking_id` set and verify booking is updated to completed

## Automated Test Suite

Run the full test suite:

```bash
npm test tests/autoCheckout.test.js
```

Expected output:
```
PASS tests/autoCheckout.test.js
  Auto-Checkout Service
    performAutoCheckout
      ✓ should checkout a session and calculate correct amount without overstay
      ✓ should calculate correct amount with overstay penalty
    autoCheckoutExpiredSessions
      ✓ should find and checkout expired sessions
      ✓ should not checkout sessions under 12 hours

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

## Monitoring Checklist

After deployment, monitor:

- [ ] Cron job runs every 30 minutes
- [ ] Logs show successful execution
- [ ] No error spikes in logs
- [ ] Users receive notifications
- [ ] Payments are created correctly
- [ ] Revenue tracking is accurate
- [ ] No zombie sessions (stuck in active state)

## Troubleshooting

### Cron job not running
- Check server logs for "Auto-checkout cron job scheduled"
- Verify NODE_ENV is not 'test'
- Check cron syntax: `*/30 * * * *`

### Sessions not being checked out
- Verify sessions are actually > 12 hours old
- Check `status` is 'active'
- Check database connection
- Review error logs

### Incorrect pricing
- Verify slot `price` field is set
- Check overstay calculation logic
- Test with known values using test script

### Notifications not sent
- Check Notification table for created records
- Verify push notification service is configured
- Check user device tokens

### Payments not created
- Check Payment table
- Verify transaction didn't fail/rollback
- Review error logs for transaction errors
