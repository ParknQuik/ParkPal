# Prisma Studio Guide - ParkPal Database Management

**Tool:** Prisma Studio
**URL:** http://localhost:5555
**Purpose:** Visual database browser and editor

---

## What is Prisma Studio?

Prisma Studio is a visual database browser that lets you:
- View all database tables and records
- Edit data directly in the browser
- Explore relationships between models
- Debug data issues quickly
- Seed/test data management

**No SQL required!** Everything is visual and point-and-click.

---

## How to Open Prisma Studio

### Step 1: Navigate to Backend Directory
```bash
cd /Users/bryanangeloyaneza/Projects/backend
```

### Step 2: Run Prisma Studio
```bash
npx prisma studio
```

### Step 3: Access in Browser
```
✓ Prisma Studio is running on http://localhost:5555
```

Open your browser and go to: **http://localhost:5555**

---

## Interface Overview

### Left Sidebar: Models List
Shows all database tables:
- **User** - Registered users (drivers, hosts, admins)
- **Zone** - Parking zones with geofencing
- **ParkingSlot** - Individual parking spots
- **Booking** - Pre-reservations
- **ParkingSession** - Check-in/out sessions
- **Payment** - Payment records
- **Payout** - Host earnings
- **Review** - User reviews
- **ActivityEvent** - Activity recognition data
- **SensorEvent** - IoT sensor data
- **ZoneMetrics** - Analytics data

### Main Panel: Data Table
- Shows all records for selected model
- Columns match your schema fields
- Sortable and filterable
- Click any row to view/edit

### Right Panel: Record Details
- Shows full record when clicked
- Edit fields inline
- View related records (click relations)
- Save changes with "Save 1 change" button

---

## Common Tasks

### 1. View All Users

**Steps:**
1. Click **"User"** in left sidebar
2. See all registered users
3. View roles: driver, host, admin, operator

**Useful Columns:**
- `id` - User ID (auto-increment)
- `name` - Full name
- `email` - Login email
- `role` - driver/host/admin/operator
- `isActive` - Account status
- `createdAt` - Registration date

**Test Users (from seed):**
- juan@example.com - Driver
- maria@example.com - Driver
- pedro@example.com - Host
- ana@example.com - Host
- carlos@example.com - Host

### 2. View Parking Slots

**Steps:**
1. Click **"ParkingSlot"** in left sidebar
2. Browse all 20 seeded slots
3. View status, price, location

**Key Fields:**
- `id` - Slot ID
- `address` - Full address
- `lat`, `lon` - Coordinates
- `price` - Price per hour (₱)
- `status` - available/occupied/reserved
- `slotType` - roadside_qr/commercial_manual/commercial_iot
- `rating` - Average rating (0-5)
- `qrCode` - QR code data
- `amenities` - JSON array of features
- `ownerId` - Host user ID

**Finding Slots by Host:**
1. Click filter icon next to `ownerId`
2. Enter host user ID (e.g., 3 for Pedro)
3. See only that host's listings

### 3. View Bookings

**Steps:**
1. Click **"Booking"** in left sidebar
2. See all reservations
3. Check booking status

**Important Fields:**
- `id` - Booking ID
- `slotId` - Which parking slot
- `userId` - Who booked it (driver)
- `startTime` - Booking start
- `endTime` - Booking end
- `price` - Total price
- `platformFee` - 5% commission
- `hostEarnings` - 95% to host
- `status` - pending/confirmed/active/completed/cancelled

**View Booking Details:**
1. Click any booking row
2. Right panel shows full details
3. Click `slot` → See related parking slot
4. Click `user` → See driver who booked
5. Click `payments` → See payment records

### 4. View QR Check-in/out Sessions

**Steps:**
1. Click **"ParkingSession"** in left sidebar
2. See all parking sessions
3. Track check-in/out times

**Session Fields:**
- `id` - Session ID
- `userId` - Driver ID
- `slotId` - Parking slot ID
- `bookingId` - Related booking (if pre-booked)
- `sessionType` - roadside_qr/commercial_activity
- `checkInTime` - When driver scanned QR to check-in
- `checkOutTime` - When driver scanned QR to check-out
- `durationMinutes` - Total parking time
- `totalAmount` - Calculated charge
- `status` - active/completed/cancelled

**Finding Active Sessions:**
1. Filter `status` = "active"
2. See currently parked vehicles
3. Check duration so far

### 5. View Reviews

**Steps:**
1. Click **"Review"** in left sidebar
2. Browse ratings and comments

**Review Fields:**
- `rating` - 1-5 stars
- `comment` - Review text
- `slotId` - Which parking slot
- `bookingId` - Which booking
- `authorId` - Who wrote review

**Filter Reviews:**
- By rating: Filter `rating` >= 4 (good reviews)
- By slot: Filter `slotId` = specific slot ID
- Recent: Sort by `createdAt` descending

### 6. View Zones

**Steps:**
1. Click **"Zone"** in left sidebar
2. See all 5 seeded zones

**Seeded Zones:**
1. SM Mall of Asia Complex (Pasay)
2. Ayala Center Makati
3. UP Diliman Campus (Quezon City)
4. BGC High Street (Taguig)
5. Manila Ocean Park Area (Manila)

**Zone Fields:**
- `name` - Zone name
- `type` - commercial/roadside/residential
- `city` - City location
- `centerLat`, `centerLon` - Center coordinates
- `geofencePolygon` - GeoJSON polygon (as string)
- `totalCapacity` - Max parking slots
- `pricePerHour` - Base price

### 7. View Payments

**Steps:**
1. Click **"Payment"** in left sidebar
2. See all payment records

**Payment Fields:**
- `amount` - Payment amount (₱)
- `paymentMethod` - card/cash/gcash/paymaya/paymongo
- `status` - pending/completed/failed/refunded
- `transactionId` - External transaction ID
- `userId` - Payer
- `sessionId` - Related parking session
- `bookingId` - Related booking

---

## Editing Records

### Create New Record

**Example: Add a Test User**
1. Click **"User"** in sidebar
2. Click **"Add record"** button (top right)
3. Fill in fields:
   - name: "Test Driver"
   - email: "test@example.com"
   - password: "$2b$10$..." (use bcrypt hash)
   - role: "driver"
4. Click **"Save 1 change"**

### Edit Existing Record

**Example: Approve a Listing**
1. Click **"ParkingSlot"**
2. Find listing to approve
3. Click on the row
4. In right panel, change `isActive` to `true`
5. Click **"Save 1 change"**

### Delete Record

**Example: Remove a Booking**
1. Click **"Booking"**
2. Find booking to delete
3. Click row to select
4. Click trash icon (🗑️) at bottom of right panel
5. Confirm deletion

**⚠️ Warning:** Deleting records with relations may cause errors. Check relationships first.

---

## Exploring Relationships

### Follow Relations Between Tables

**Example: Trace a Booking**
1. Click **"Booking"** → Select a booking
2. In right panel, see relation links:
   - `slot` → Click to see ParkingSlot details
   - `user` → Click to see User who booked
   - `payments` → Click to see Payment records
   - `sessions` → Click to see ParkingSession
   - `review` → Click to see Review (if exists)

**Back Navigation:**
- Use browser back button
- Or click model name in left sidebar

### View All Related Records

**Example: See All Bookings for a Slot**
1. Click **"ParkingSlot"** → Select a slot
2. Scroll down in right panel
3. Click **"bookings"** relation
4. See all bookings for that slot

---

## Common Scenarios

### Scenario 1: Test Booking Flow

**Goal:** Verify booking appears correctly

1. Open Prisma Studio
2. Click **"Booking"**
3. Find your test booking (most recent `createdAt`)
4. Check:
   - ✓ `price` calculated correctly
   - ✓ `platformFee` = 5% of price
   - ✓ `hostEarnings` = 95% of price
   - ✓ `status` = "confirmed"
5. Click `slot` → Verify slot status = "reserved"
6. Click `user` → Verify correct driver

### Scenario 2: Debug QR Check-in

**Goal:** Why didn't check-in work?

1. Click **"ParkingSession"**
2. Filter by recent `createdAt`
3. Find session with `status` = "active"
4. Check:
   - `checkInTime` populated?
   - `slotId` matches QR code?
   - `userId` matches logged-in user?
5. Click `slot` → Check QR code format
6. Compare QR data with session

### Scenario 3: Calculate Host Earnings

**Goal:** See how much a host earned

1. Click **"Booking"**
2. Filter `status` = "completed"
3. For each booking, note `hostEarnings`
4. Sum up manually OR
5. Click **"User"** → Find host
6. Click `ownedSlots` → Click `bookings`
7. Review all earnings

(In production, use API endpoint `/api/marketplace/host/earnings`)

### Scenario 4: View QR Codes

**Goal:** Get QR code for a slot

1. Click **"ParkingSlot"**
2. Find slot
3. Click row → See `qrCode` field
4. Copy QR data (e.g., `PARKPAL:123:1234567890:abc123`)
5. Use in mobile app scanner OR
6. Use in API test: `POST /api/marketplace/qr/checkin`

---

## Data Validation Tips

### Check for Data Integrity

**Missing Relations:**
```
1. Click any model with relations
2. Right panel shows "N/A" for missing data
3. Example: Booking without payment = "N/A" in payments
```

**Orphaned Records:**
```
1. Filter by foreign key = null
2. Example: ParkingSlot with ownerId = null
3. Should not happen with proper constraints
```

**Invalid Status:**
```
1. Filter status fields
2. Check for unexpected values
3. Example: Booking with status = "invalid"
```

### Performance Checks

**Large Tables:**
- Use filters to narrow down results
- Prisma Studio may be slow with 1000+ records
- Consider SQL queries for bulk operations

---

## Tips & Tricks

### 1. Keyboard Shortcuts
- **Ctrl/Cmd + K** - Search models
- **Escape** - Close right panel
- **Enter** - Save changes

### 2. Filter Syntax
- **Equals:** `= value`
- **Contains:** `contains "text"`
- **Greater than:** `> 100`
- **Less than:** `< 50`
- **Not equal:** `!= value`

### 3. Sorting
- Click column header to sort
- Click again to reverse
- Useful for finding latest/oldest records

### 4. JSON Fields
- Click JSON field to expand
- View `amenities`, `photos`, `geofencePolygon`
- Edit JSON directly in text area

### 5. Copy Data
- Select value in right panel
- Copy with Ctrl/Cmd + C
- Useful for IDs, emails, QR codes

---

## Troubleshooting

### Prisma Studio Won't Start

**Error:** "Port 5555 already in use"
```bash
# Kill existing process
lsof -ti:5555 | xargs kill -9

# Restart
npx prisma studio
```

**Error:** "Schema not found"
```bash
# Regenerate Prisma Client
npx prisma generate

# Then try again
npx prisma studio
```

### Changes Not Saving

**Issue:** "Save 1 change" button doesn't work
- Check for validation errors (red highlights)
- Required fields must be filled
- Foreign keys must reference existing IDs
- Reload page and try again

### Can't See Recent Records

**Issue:** Just created record via API, not in Studio
- Click refresh icon (🔄) in top right
- Or close and reopen Prisma Studio
- Changes via API are immediate, UI needs refresh

---

## Security Notes

### ⚠️ Development Only

Prisma Studio is for **development and testing only**.

**Do NOT:**
- Expose Prisma Studio in production
- Share studio URL publicly
- Edit production data carelessly

**Best Practices:**
- Use only on localhost
- Run on development database
- Test changes in staging first
- Backup before bulk edits

### Password Handling

**Never Store Plain Passwords!**
- Use bcrypt hashed passwords only
- Example hash: `$2b$10$abcd1234...`
- Generate with: `bcrypt.hash('password123', 10)`

---

## Integration with Testing

### Use Prisma Studio During Testing

**Workflow:**
1. Run `npm run seed` (seed database)
2. Run `node test-marketplace.js` (API tests)
3. Open `npx prisma studio` (verify results)
4. Check test data created correctly
5. Clean up test data if needed

**Example: Verify Test Booking**
```bash
# Terminal 1
npm start

# Terminal 2
node test-marketplace.js

# Terminal 3
npx prisma studio

# Browser
# → Go to http://localhost:5555
# → Click "Booking"
# → See booking created by test
```

---

## Quick Reference

### Useful Model Filters

**Find User by Email:**
```
Model: User
Filter: email = "pedro@example.com"
```

**Find Available Slots:**
```
Model: ParkingSlot
Filter: status = "available"
```

**Find Today's Bookings:**
```
Model: Booking
Sort: createdAt descending
Filter: createdAt > [today's date]
```

**Find Active Sessions:**
```
Model: ParkingSession
Filter: status = "active"
```

**Find Pending Payments:**
```
Model: Payment
Filter: status = "pending"
```

---

## Summary

**Prisma Studio is your visual database tool:**
- ✅ Browse all tables and records
- ✅ Edit data directly (no SQL)
- ✅ Follow relationships visually
- ✅ Debug data issues quickly
- ✅ Verify test results
- ✅ Seed/manage test data

**Access:** http://localhost:5555
**Command:** `npx prisma studio`
**Use:** Development and testing only

---

**Happy data exploring! 🎉**
