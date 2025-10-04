# Project Overview

You are to generate a complete codebase plan and scaffolding for an application called *ParkPal*, a parking management and discovery system.

System Requirements:

1.  Architecture
•  Full-stack app with:
  • Backend → Node.js + Express
  • Frontend → React (web) + React Native (mobile via Expo)
  • Database → PostgreSQL with Prisma ORM
  • Caching → Redis
  • Real-time updates → WebSockets
  • Containerization → Docker + docker-compose

2.  Backend
•  Endpoints:
  • GET /parking → fetch available slots (filters: status, location)
  • POST /parking/reserve → reserve a slot
  • POST /parking/list → add a user-owned slot
  • POST /payments → process payments
  • GET /alerts → weather/flood alerts
•  JWT authentication (OAuth2.0 style)
•  Middleware for input validation and security
•  Prisma schema with models:
  • User(id, name, email, role, createdAt)
  • Slot(id, lat, lon, status [open|reserved], ownerId, price, createdAt)
  • Booking(id, slotId, userId, startTime, endTime, price, status, createdAt)
  • Payment(id, userId, bookingId, method, amount, status, createdAt)
•  Redis for caching frequently queried slots
•  WebSocket service for slot status changes (reserved, freed, listed)

3.  Frontend
•  React Native (mobile) and React (web)
•  Screens:
  • Login/Signup
  • Map View with markers for slots
  • Reservation screen
  • Payment screen
  • User profile
  • List new slot screen
•  Use Redux Toolkit or React Query for API state management
•  Axios for API requests with JWT header
•  Map integration: Google Maps API or Mapbox
•  Material UI (web) + React Native Paper (mobile) for styling

4.  Integrations
•  Google Maps API for maps and routing
•  OpenWeather API + flood hazard API for alerts
•  Payment gateway stub (Stripe/GCash/Maya)

5.  Infrastructure
•  Dockerfile for backend (Node.js LTS)
•  docker-compose.yml with:
  • backend (port 3000)
  • postgres (port 5432)
  • redis (port 6379)
•  Volumes for PostgreSQL data
•  Example .env:
  • DATABASE_URL=postgresql://postgres:password@db:5432/parkpal
  • REDIS_URL=redis://redis:6379
  • JWT_SECRET=supersecretkey
  • WEATHER_API_KEY=yourapikey
  • MAPS_API_KEY=yourapikey
  • PAYMENT_GATEWAY_KEY=yourapikey

6.  DevOps
•  Nodemon for dev
•  ESLint + Prettier for linting/formatting
•  Basic test setup with Jest

7.  Future Extensions
•  Predictive ML model for slot availability (TensorFlow/PyTorch microservice)
•  EV charging slot reservations
•  License plate recognition (ALPR) via camera API

Task:
Generate a repo plan with:
•  Directory structure
•  Example boilerplate code for backend routes, Prisma schema, and frontend screens
•  Dockerfile + docker-compose
•  README with setup instructions