# ParkPal Web Dashboard Guide

**Version:** 1.0.0
**Date:** October 2025

---

## Overview

The ParkPal Web Dashboard is a comprehensive management interface for hosts and administrators. It provides tools for listing management, earnings tracking, and platform administration.

---

## Features

### 🏠 Host Dashboard (`/host-dashboard`)

A complete management interface for parking spot hosts.

#### Earnings Summary Cards
- **Total Earnings**: All-time revenue from bookings
- **Pending Payout**: Amount awaiting transfer
- **Total Bookings**: Completed reservations count

#### Listings Management Table
- View all your parking spot listings
- Quick status overview (Available, Occupied, Reserved)
- Ratings display with star icons
- Action buttons:
  - **View**: See full listing details
  - **Edit**: Modify listing information
  - **Delete**: Remove listing (with confirmation)

#### Features
- Responsive Material-UI design
- Real-time data fetching
- Error handling with user-friendly alerts
- Empty state guidance for new hosts

---

### 👤 Admin Dashboard (`/admin-dashboard`)

Platform administration interface for managing the marketplace.

#### Statistics Overview
- **Total Users**: Registered accounts
- **Total Listings**: Active parking spots
- **Platform Revenue**: Total commission earned
- **Pending Approvals**: Listings awaiting review

#### Three Management Tabs

**1. All Listings Tab**
- Complete view of all parking listings
- Filterable table with:
  - Listing ID
  - Address
  - Slot Type (Roadside QR, Commercial Manual, Commercial IoT)
  - Price per hour
  - Status (Available/Occupied/Reserved)
  - Active status (Yes/No)
- Approve/Reject actions for inactive listings

**2. Pending Approval Tab**
- Focused view of listings awaiting approval
- Submission date display
- Listing description preview
- Quick approve/reject buttons with reasons
- Empty state when no pending approvals

**3. Users Tab**
- Placeholder for user management features
- Coming soon: User profiles, role management, activity logs

#### Approval Workflow
1. Admin reviews listing details
2. Click **Approve** to activate listing
3. Click **Reject** to open reason dialog
4. Enter rejection reason (required)
5. Listing is deleted with reason logged

---

### ➕ Create Listing (`/list-slot`)

Enhanced marketplace listing creation interface.

#### Form Sections

**Location Details**
- Latitude/Longitude inputs (with map hint)
- Full address field (required)
- Multi-line address support

**Listing Details**
- **Slot Type** dropdown:
  - Roadside (QR)
  - Commercial (Manual)
  - Commercial (IoT)
- **Price per Hour** (₱) with platform fee note (5%)
- **Description** text area for detailed info

**Amenities**
Multi-select dropdown with options:
- Covered
- Security
- CCTV
- Restroom
- Elevator
- EV Charging
- Lighting
- Wide Slot
- Valet
- Bay View

#### Form Features
- Validation for required fields
- Success/Error alerts
- Auto-redirect to Host Dashboard after creation
- Cancel button to return to dashboard
- Responsive grid layout
- QR code auto-generation on submission

---

## Routes

| Path | Component | Access | Description |
|------|-----------|--------|-------------|
| `/` | Login | Public | Authentication screen |
| `/host-dashboard` | HostDashboard | Host | Manage listings & earnings |
| `/admin-dashboard` | AdminDashboard | Admin | Platform administration |
| `/list-slot` | ListSlot | Host | Create new listing |
| `/map` | MapView | All | Map view (legacy) |
| `/reserve` | Reservation | Driver | Make reservation |
| `/payment` | Payment | All | Payment processing |
| `/profile` | Profile | All | User profile |

---

## API Integration

### Endpoints Used

**Host Dashboard:**
```javascript
GET /api/parking/slots            // Fetch all slots (filter by owner)
GET /api/marketplace/host/earnings // Fetch earnings summary
DELETE /api/parking/slots/:id     // Delete listing
```

**Admin Dashboard:**
```javascript
GET /api/parking/slots            // Fetch all slots
PUT /api/parking/slots/:id        // Approve listing (set isActive)
DELETE /api/parking/slots/:id     // Reject/delete listing
```

**Create Listing:**
```javascript
POST /api/marketplace/listings    // Create new listing with QR
```

### Data Flow

1. **Authentication**: JWT token stored in localStorage
2. **API Interceptors**: Auto-add token to requests
3. **Error Handling**: 401 redirects to login
4. **Data Refresh**: Manual refresh after mutations

---

## Technology Stack

### Core Technologies
- **React** 18.2.0 - UI framework
- **Material-UI** 5.15.0 - Component library
- **React Router** 6.22.3 - Client-side routing
- **Axios** 1.6.7 - HTTP client
- **Vite** 4.4.9 - Build tool

### UI Components Used
- Container, Box, Grid - Layout
- Card, CardContent - Content containers
- Table, TableContainer - Data display
- Button, IconButton - Actions
- Dialog - Modals
- Alert - Notifications
- Chip - Tags/status
- TextField, Select - Forms
- CircularProgress - Loading states

---

## Usage Guide

### For Hosts

**1. Create Your First Listing**
```
1. Navigate to /host-dashboard
2. Click "New Listing" or "Create Listing" button
3. Fill out the form:
   - Enter latitude/longitude (use map)
   - Provide full address
   - Select slot type
   - Set price per hour
   - Add description
   - Select amenities
4. Click "Create Listing"
5. QR code generated automatically
6. Listing appears in dashboard (pending approval)
```

**2. View Earnings**
```
- Dashboard shows three key metrics
- Total Earnings: Sum of all completed bookings
- Pending Payout: Awaiting weekly/monthly transfer
- Total Bookings: Number of reservations
```

**3. Manage Listings**
```
- Edit: Update price, description, amenities
- View: See full details & QR code
- Delete: Remove listing (confirmation required)
```

### For Admins

**1. Approve Listings**
```
1. Navigate to /admin-dashboard
2. Click "Pending Approval" tab
3. Review listing details
4. Click "Approve" to activate
   OR
5. Click "Reject", enter reason, confirm
```

**2. Monitor Platform**
```
- View stats cards for quick overview
- Check "All Listings" for complete inventory
- Monitor user count (coming soon)
- Track platform revenue
```

---

## Design Patterns

### State Management
- Local component state with `useState`
- No global state (future: Redux/Context)
- Data fetched on component mount

### Error Handling
```javascript
try {
  const response = await api.get('/endpoint');
  setData(response.data);
} catch (err) {
  setError(err.response?.data?.error || 'Default message');
}
```

### Loading States
```javascript
const [loading, setLoading] = useState(true);

// Show spinner while loading
if (loading) {
  return <CircularProgress />;
}
```

### Empty States
```javascript
{listings.length === 0 && (
  <Box textAlign="center">
    <Typography>No listings yet</Typography>
    <Button>Create Listing</Button>
  </Box>
)}
```

---

## Customization

### Theme Configuration
Located in `App.jsx`:
```javascript
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});
```

### Adding New Routes
1. Create screen component in `src/screens/`
2. Import in `App.jsx`
3. Add route: `<Route path="/new" element={<NewScreen />} />`

### API Base URL
Configure in `api.jsx`:
```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});
```

Set in `.env.local`:
```
VITE_API_URL=https://api.parkpal.com
```

---

## Testing Guide

### Manual Testing Checklist

**Host Dashboard:**
- [ ] Login as host (pedro@example.com / password123)
- [ ] Verify earnings cards display
- [ ] Check listings table loads
- [ ] Click "New Listing" button
- [ ] Create a test listing
- [ ] Edit an existing listing
- [ ] Delete a listing (confirm dialog works)

**Admin Dashboard:**
- [ ] Login as admin (admin credentials needed)
- [ ] Verify stats cards display
- [ ] Check "All Listings" tab
- [ ] Check "Pending Approval" tab
- [ ] Approve a listing
- [ ] Reject a listing with reason

**Create Listing:**
- [ ] Fill all required fields
- [ ] Select amenities (multiple)
- [ ] Submit form
- [ ] Verify success message
- [ ] Check redirect to host dashboard
- [ ] Verify listing appears in table

---

## Troubleshooting

### Common Issues

**"Failed to load data" error**
```
- Check backend server is running (port 3001)
- Verify JWT token in localStorage
- Check API endpoint URLs in code
```

**Listings not appearing**
```
- Check user role (hosts only see their own)
- Verify ownerId matches logged-in user
- Check isActive flag for admin view
```

**CORS errors**
```
- Backend must allow origin: http://localhost:5173
- Check CORS configuration in backend index.js
```

**Token expired on page load**
```
- Normal behavior, user redirected to login
- Refresh token implementation coming soon
```

---

## Future Enhancements

### Planned Features

**Host Dashboard:**
- [ ] Revenue charts (daily/weekly/monthly)
- [ ] Booking calendar view
- [ ] Review management interface
- [ ] Bulk listing operations
- [ ] Export earnings report (CSV/PDF)

**Admin Dashboard:**
- [ ] User management (ban, roles, verification)
- [ ] Dispute resolution interface
- [ ] Platform analytics charts
- [ ] Revenue trends & forecasting
- [ ] Email notification triggers

**General:**
- [ ] Real-time WebSocket updates
- [ ] Dark mode support
- [ ] Mobile responsive improvements
- [ ] i18n (internationalization)
- [ ] Accessibility (WCAG 2.1 AA)

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm start
```

---

## File Structure

```
web/
├── src/
│   ├── screens/
│   │   ├── Login.jsx
│   │   ├── HostDashboard.jsx       ← Host interface
│   │   ├── AdminDashboard.jsx      ← Admin interface
│   │   ├── ListSlot.jsx            ← Create listing
│   │   ├── MapView.jsx
│   │   ├── Reservation.jsx
│   │   ├── Payment.jsx
│   │   └── Profile.jsx
│   ├── App.jsx                     ← Routes & theme
│   ├── api.jsx                     ← Axios config
│   └── index.jsx                   ← Entry point
├── package.json
├── vite.config.js
└── WEB_DASHBOARD_GUIDE.md          ← This file
```

---

## Support

For issues or feature requests:
- Backend API: See `/backend/TEST_RESULTS.md`
- Swagger Docs: http://localhost:3001/api-docs
- GitHub Issues: [Your repo URL]

---

**Last Updated:** October 2025
**Maintained By:** ParkPal Development Team
