# ParkPal Setup Guide

## Prerequisites
- Node.js (v16+)
- PostgreSQL
- Redis (optional, for caching)

## Backend Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Update database credentials in `.env`:
     ```
     DATABASE_URL=postgresql://user:password@localhost:5432/parkpal
     JWT_SECRET=your_secure_secret_key
     WEATHER_API_KEY=your_openweathermap_api_key (optional)
     ```

3. **Set up database:**
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run migrations
   npx prisma migrate dev --name init
   ```

4. **Start backend server:**
   ```bash
   npm run dev
   ```

   Backend will run on http://localhost:3001

## Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend/web
   npm install
   ```

2. **Configure environment:**
   - The `.env` file is already configured to connect to http://localhost:3001
   - Update `VITE_API_URL` if backend runs on a different port

3. **Start frontend:**
   ```bash
   npm run dev
   ```

   Frontend will run on http://localhost:5173

## Features Implemented

### Backend API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

**Parking Slots:**
- `GET /api/slots` - Get all available slots
- `GET /api/slots/:id` - Get slot by ID
- `POST /api/slots` - List a new parking slot (authenticated)
- `PUT /api/slots/:id` - Update slot (authenticated)
- `DELETE /api/slots/:id` - Delete slot (authenticated)

**Bookings:**
- `POST /api/bookings` - Reserve a slot (authenticated)
- `GET /api/bookings` - Get user's bookings (authenticated)

**Payments:**
- `POST /api/payments` - Process payment (authenticated)
- `GET /api/payments` - Get user's payments (authenticated)
- `GET /api/payments/:id` - Get payment by ID (authenticated)

**Alerts:**
- `GET /api/alerts?lat=<lat>&lon=<lon>` - Get weather alerts for location

### Frontend Screens

1. **Login/Register** - User authentication
2. **Map View** - Browse available parking slots
3. **List Slot** - Add your parking slot
4. **Reservation** - Reserve a parking slot
5. **Payment** - Process payment for booking
6. **Profile** - View user info and bookings

## Database Schema

- **users** - User accounts
- **slots** - Parking slots
- **bookings** - Reservations
- **payments** - Payment records

## WebSocket

Real-time updates for:
- New slots listed
- Slots reserved
- Payment completed

## Next Steps

1. Install PostgreSQL and create database
2. Run Prisma migrations
3. Install backend dependencies
4. Install frontend dependencies
5. Start both servers
6. Register a new user and start using the app!

## Troubleshooting

- **Database connection error**: Check PostgreSQL is running and credentials are correct
- **Port already in use**: Change PORT in backend `.env` or frontend `vite.config.mjs`
- **CORS errors**: Ensure backend CORS is configured to allow frontend origin
