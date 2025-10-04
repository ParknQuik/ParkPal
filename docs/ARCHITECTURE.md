# ParkPal System Architecture

## Overview

ParkPal is a full-stack parking management system built with a microservices-inspired architecture, consisting of three main components:

1. **Backend API** - Node.js/Express REST API
2. **Web Frontend** - React SPA with Vite
3. **Mobile App** - React Native with Expo

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
├──────────────────────┬──────────────────────────────────┤
│   Web Application    │    Mobile Application            │
│   (React + Vite)     │    (React Native + Expo)         │
│   Port: 5174         │    Expo Dev Server: 8081         │
└──────────────────────┴──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    API Gateway Layer                     │
│                  Backend REST API                        │
│              (Node.js + Express)                         │
│                   Port: 3001                             │
├─────────────────────────────────────────────────────────┤
│  Authentication │ Parking Spots │ Bookings │ Payments   │
│     (JWT)       │   Management  │  System  │ Processing │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│              SQLite Database (Prisma ORM)                │
├─────────────────────────────────────────────────────────┤
│  Users │ Slots │ Bookings │ Payments │ Alerts           │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: SQLite (dev), PostgreSQL (production-ready)
- **Authentication**: JWT + bcrypt
- **Real-time**: WebSocket (ws library)

### Web Frontend
- **Framework**: React 18.2
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: React Hooks + Context
- **HTTP Client**: Axios
- **Routing**: React Router v6

### Mobile App
- **Framework**: React Native
- **Platform**: Expo SDK 54
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation v6
- **Maps**: react-native-maps
- **Animations**: react-native-reanimated

## Data Flow

### User Authentication Flow
```
1. User enters credentials → Frontend
2. Frontend sends POST /api/auth/login → Backend
3. Backend validates credentials → Database
4. Backend generates JWT token → Returns to Frontend
5. Frontend stores token → AsyncStorage/localStorage
6. All subsequent requests include JWT in Authorization header
```

### Parking Spot Discovery Flow
```
1. User opens map/search → Frontend
2. Frontend requests current location → Device GPS
3. Frontend sends GET /api/parking/spots?lat=X&lng=Y → Backend
4. Backend queries nearby spots → Database
5. Backend returns spot list → Frontend
6. Frontend displays spots on map/list view
```

### Booking Flow
```
1. User selects spot and time → Frontend
2. Frontend sends POST /api/bookings → Backend
3. Backend validates availability → Database
4. Backend creates booking record → Database
5. Backend processes payment → Payment Gateway
6. Backend sends confirmation → Frontend
7. WebSocket notification → User's devices
```

## Security Considerations

### Authentication
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 24 hours
- Refresh token mechanism (to be implemented)
- Protected routes on both frontend and backend

### API Security
- CORS enabled with origin whitelist
- Rate limiting (to be implemented)
- Input validation on all endpoints
- SQL injection prevention via Prisma ORM

### Data Privacy
- User passwords never stored in plain text
- Payment information handled via secure gateway
- Personal data encrypted at rest (production)

## Database Schema

### Core Entities

**User**
- id (Primary Key)
- name, email, password
- role (user/host/admin)
- created_at, updated_at

**Slot (Parking Spot)**
- id (Primary Key)
- owner_id (Foreign Key → User)
- title, description, address
- latitude, longitude
- price, availability
- amenities (JSON)

**Booking**
- id (Primary Key)
- user_id (Foreign Key → User)
- slot_id (Foreign Key → Slot)
- start_date, end_date
- status (pending/confirmed/cancelled)
- total_price

**Payment**
- id (Primary Key)
- booking_id (Foreign Key → Booking)
- amount, currency
- status, payment_method
- transaction_id

**Alert**
- id (Primary Key)
- user_id (Foreign Key → User)
- type, message
- read_status
- created_at

## API Endpoints

### Authentication
```
POST   /api/auth/signup    - Register new user
POST   /api/auth/login     - Login user
POST   /api/auth/logout    - Logout user
GET    /api/auth/me        - Get current user
```

### Parking Spots
```
GET    /api/parking/spots           - List all spots
GET    /api/parking/spots/:id       - Get spot details
POST   /api/parking/spots           - Create new spot (host only)
PUT    /api/parking/spots/:id       - Update spot (owner only)
DELETE /api/parking/spots/:id       - Delete spot (owner only)
GET    /api/parking/spots/search    - Search spots
```

### Bookings
```
GET    /api/bookings               - List user bookings
GET    /api/bookings/:id          - Get booking details
POST   /api/bookings              - Create booking
PATCH  /api/bookings/:id/cancel   - Cancel booking
```

### User Profile
```
PATCH  /api/users/profile              - Update profile
GET    /api/users/payment-methods      - List payment methods
POST   /api/users/payment-methods      - Add payment method
DELETE /api/users/payment-methods/:id  - Remove payment method
```

## Deployment Architecture

### Development
- Backend: `npm start` (localhost:3001)
- Web: `npm run dev` (localhost:5174)
- Mobile: `npx expo start` (Metro bundler)

### Production (Recommended)
```
┌──────────────────┐
│   Load Balancer  │
│   (Nginx/Caddy)  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │   CDN   │ (Static files)
    └─────────┘
         │
┌────────┴─────────┐
│  Node.js Cluster │ (PM2)
│   Backend API    │
└────────┬─────────┘
         │
┌────────┴─────────┐
│   PostgreSQL     │
│   (Primary DB)   │
└──────────────────┘
```

## Scalability Considerations

### Horizontal Scaling
- Stateless backend API (can run multiple instances)
- Session data in JWT (no server-side sessions)
- Database connection pooling via Prisma

### Caching Strategy
- Redis for frequently accessed data
- Client-side caching with SWR/React Query
- CDN for static assets

### Real-time Features
- WebSocket server can be separated
- Use Socket.io with Redis adapter for multi-instance support

## Monitoring & Logging

### Application Monitoring
- Error tracking (Sentry recommended)
- Performance monitoring (New Relic/DataDog)
- User analytics (Google Analytics/Mixpanel)

### Logging
- Winston for structured logging
- Log levels: error, warn, info, debug
- Centralized logging (ELK stack for production)

## Future Enhancements

1. **Microservices Migration**
   - Separate authentication service
   - Independent booking service
   - Payment processing service

2. **Advanced Features**
   - Real-time parking availability updates
   - Machine learning for demand prediction
   - Dynamic pricing based on demand
   - In-app navigation
   - QR code entry/exit system

3. **Performance Optimization**
   - GraphQL API option
   - Server-side rendering for web
   - Image optimization and lazy loading
   - Progressive Web App (PWA) support
