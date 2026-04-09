# Auto-Checkout Service

Automatically checks out parking sessions that exceed the maximum duration of 12 hours.

## Overview

The auto-checkout service runs as a cron job every 30 minutes to detect and process expired parking sessions. When a session exceeds 12 hours, it is automatically checked out with an overstay penalty applied.

## Features

- **Automatic Session Detection**: Finds all active sessions that started more than 12 hours ago
- **Overstay Penalty**: Applies 1.5x rate for hours beyond the 12-hour limit
- **Transaction Safety**: Uses database transactions to ensure data consistency
- **Notifications**: Sends push notifications to users when their session is auto-checked out
- **Payment Processing**: Creates pending payment records for auto-checkout charges
- **Slot Management**: Updates parking slot status to available after checkout

## Pricing Logic

### Regular Checkout (≤12 hours)
```
Total = Hours × Hourly Rate
Example: 10 hours × ₱50/hr = ₱500
```

### Overstay Checkout (>12 hours)
```
Regular Hours = min(Hours, 12)
Overstay Hours = max(0, Hours - 12)
Total = (Regular Hours × Rate) + (Overstay Hours × Rate × 1.5)

Example: 15 hours × ₱50/hr
  = (12 × ₱50) + (3 × ₱50 × 1.5)
  = ₱600 + ₱225
  = ₱825
```

## Cron Schedule

- **Frequency**: Every 30 minutes
- **Cron Expression**: `*/30 * * * *`
- **Environment**: Disabled in test mode to prevent interference with tests

## Configuration

### Maximum Duration
Default: 12 hours (configurable in `/backend/services/autoCheckout.js`)

```javascript
const MAX_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
```

### Overstay Multiplier
Default: 1.5x (configurable in `performAutoCheckout` function)

```javascript
const overstayRate = regularRate * 1.5;
```

## Database Updates

When a session is auto-checked out, the following database updates occur:

### 1. ParkingSession
- `checkOutTime`: Set to current timestamp
- `durationMinutes`: Calculated from check-in to checkout
- `totalAmount`: Calculated with overstay penalty if applicable
- `status`: Changed from `active` to `completed`

### 2. ParkingSlot
- `status`: Changed from `occupied` to `available`

### 3. Booking (if linked)
- `status`: Changed to `completed`
- `endTime`: Set to checkout timestamp

### 4. Payment (created)
- `amount`: Total calculated amount
- `paymentMethod`: Set to `auto_charge`
- `status`: Set to `pending` (to be charged later)
- `transactionId`: Format: `auto_checkout_{sessionId}_{timestamp}`

### 5. Notification (created)
- `title`: "Auto Checkout - Session Expired"
- `body`: Includes duration, total amount, and overstay info
- `type`: `auto_checkout`
- `data`: JSON with session details

## Usage

### Manual Execution
You can manually trigger the auto-checkout process:

```javascript
const { autoCheckoutExpiredSessions } = require('./services/autoCheckout');

// Execute auto-checkout
const result = await autoCheckoutExpiredSessions();
console.log(result);
// { processed: 5, failed: 0, totalRevenue: 2450 }
```

### Testing
Run the test suite:

```bash
npm test tests/autoCheckout.test.js
```

## Logs

The service logs all activities using Winston logger:

- `[Auto-Checkout] Running expired sessions check...`
- `[Auto-Checkout] Found {n} expired sessions`
- `[Auto-Checkout] Processing session {id} for user {userId}`
- `[Auto-Checkout] Completed session {id}: {hours}hrs, ₱{amount}`
- `[Auto-Checkout] Completed: {processed} processed, {failed} failed, ₱{revenue} revenue`

## Error Handling

- Individual session checkout failures don't stop the entire process
- Failed sessions are logged and counted in the `failed` result
- Transaction rollback ensures partial updates don't corrupt data
- Errors are logged to Winston for monitoring

## Notification Format

Users receive a notification with:

**Title**: "Auto Checkout - Session Expired"

**Body Examples**:
- Without overstay: "Your parking session was automatically checked out after 10 hours. Total: ₱500.00"
- With overstay: "Your parking session was automatically checked out after 15 hours. Total: ₱825.00 (includes 3hr overstay penalty)"

**Data JSON**:
```json
{
  "sessionId": 123,
  "duration": 900,
  "totalAmount": 825,
  "overstayHours": 3,
  "regularHours": 12,
  "regularRate": 50,
  "overstayRate": 75
}
```

## Integration Points

### Server Startup (index.js)
The cron job is initialized when the server starts:

```javascript
// Auto-checkout cron job setup
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

## Future Enhancements

- [ ] Configurable max duration per slot/zone
- [ ] Tiered overstay penalties (e.g., 1.5x for 12-24hr, 2x for >24hr)
- [ ] Email notifications in addition to push notifications
- [ ] Dashboard metrics for auto-checkout revenue
- [ ] Grace period before applying penalties
- [ ] User warnings at 11 hours before auto-checkout
