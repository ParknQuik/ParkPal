# ParkPal - Smart Parking Management Platform

**Status:** ✅ Production Ready (Phases 1-4 Complete)
**Updated:** December 31, 2025

ParkPal is a full-stack parking management app. Users find, book, and manage parking spots. Hosts list available spaces.

## 📄 Research Background

This project is based on the research paper: **"ParknQuik: a park sharing and crowdsource park monitoring mobile application"**

**Reference**: [ResearchGate Publication](https://www.researchgate.net/publication/332287449_ParknQuik_a_park_sharing_and_crowdsource_park_monitoring_mobile_application)

The application implements a peer-to-peer parking space sharing platform with crowdsourced monitoring capabilities, allowing:
- Private parking space owners to monetize unused spots
- Drivers to find and reserve available parking in real-time
- Community-driven updates on parking availability
- Reduced urban parking congestion through efficient space utilization

## 🏗️ Project Structure

```
├── backend/              # Node.js/Express API with Prisma ORM
├── frontend/
│   ├── web/             # React web application (Vite)
│   └── mobile/          # React Native mobile app (Expo)
└── docs/                # Documentation
```

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL (Prisma ORM) - Production ready
- **Caching**: Redis (50% DB load reduction)
- **Authentication**: JWT + bcrypt (OWASP compliant)
- **Real-time**: WebSocket with authentication
- **Logging**: Winston with file rotation
- **Monitoring**: Prometheus metrics
- **Security Score**: 100/100

### Frontend Web
- **Framework**: React 18.2 with Vite
- **UI Library**: Material-UI
- **State Management**: React hooks
- **API Client**: Axios with interceptors

### Mobile App
- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **UI Components**: Custom design system with gradient themes
- **Screens**: 20 complete screens
- **UX Features**: Haptic feedback, skeleton loaders, pull-to-refresh
- **Accessibility**: WCAG AA compliant, screen reader support
- **Testing**: 41 test cases (unit + integration)

## 🎯 Features

### Core Features
- **User Authentication**: Secure login/signup with JWT, OWASP-compliant password policy
- **Parking Spot Discovery**: Search and filter available parking spaces
- **Map Integration**: Interactive map view (mobile only)
- **Booking System**: Reserve parking spots with date/time selection
- **Payment Processing**: PayMongo integration (4 payment methods)
- **User Profiles**: Manage account settings and booking history
- **Host Features**: List and manage parking spots, earnings dashboard
- **Real-time Updates**: WebSocket notifications for booking status
- **Review System**: Rate and review parking spots

### Production Features (Phase 3 & 4)
- **Security**: 100/100 score - Rate limiting, CORS, Helmet.js, JWT rotation
- **Performance**: 10x improvement (10-50ms response time)
- **Caching**: Redis cache for marketplace (80%+ hit rate)
- **Monitoring**: Winston logging + Prometheus metrics
- **Testing**: 217+ tests (150 backend + 41 mobile + 26 web)
- **Accessibility**: WCAG AA compliant across all platforms
- **PWA**: Service worker, offline support
- **Deployment**: Docker, CI/CD pipeline ready

## 📦 Quick Start

### Prerequisites
- Node.js 16+ and npm
- For mobile: Expo Go app on your phone or Android/iOS simulator

### Backend Setup

```bash
cd backend
./start.sh
```

The backend will:
- Install dependencies
- Create SQLite database
- Run migrations
- Start server on http://localhost:3001

### Web Frontend Setup

```bash
cd frontend/web
./start.sh
```

Runs on http://localhost:5174

### Mobile App Setup

```bash
# 1. Copy environment file
cd frontend/mobile
cp .env.local.example .env.local

# 2. Set your Mac's hostname (for physical devices)
hostname
# Example output: Bryans-MacBook-Air.local
# Edit .env.local and set: EXPO_PUBLIC_BACKEND_HOSTNAME=Bryans-MacBook-Air

# 3. Add Google Maps API keys to .env.local
# Get keys from: https://console.cloud.google.com/

# 4. Install and start
npm install
npm start
```

The app **automatically connects** to your local backend:
- ✅ iOS Simulator → `localhost:3001` (zero config)
- ✅ Android Emulator → `10.0.2.2:3001` (zero config)
- ✅ Physical Device → `[YOUR-HOSTNAME].local:3001` (via mDNS)

**Connect via Expo Go app:**
- Scan QR code from terminal
- Or press `i` for iOS Simulator / `a` for Android Emulator

📖 **Detailed setup**: See [frontend/mobile/docs/BACKEND_SWITCHING.md](frontend/mobile/docs/BACKEND_SWITCHING.md)

## 🔧 Environment Variables

### Backend (`backend/.env`)
```
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/parknquik?schema=public&connection_limit=20&pool_timeout=10
REDIS_URL=redis://localhost:6379
JWT_SECRET=<128-char-cryptographic-secret>
NODE_ENV=production
USE_SECRET_MANAGER=false
```

See `backend/.env.example` for complete configuration.

## 📱 Mobile App Notes

- The mobile app uses Expo SDK 54
- Map features only available on native devices (not web)
- Requires same WiFi network for local development
- Built with TypeScript for type safety

## 🗄️ Database

The project uses **PostgreSQL** for production with the following models:
- **User**: Authentication and profile data
- **ParkingSlot**: Parking spot information
- **Booking**: Reservation records
- **ParkingSession**: QR check-in/out tracking
- **Payment**: Transaction history
- **Payout**: Host earnings
- **Review**: Ratings and comments
- **Zone**: Geofenced parking areas
- **ZoneMetrics**: Analytics data

**Database Features:**
- 24 performance indexes
- Connection pooling (20 connections)
- PostgreSQL 16 (Docker)

Run Prisma Studio to view database:
```bash
cd backend
npx prisma studio  # http://localhost:5555
```

## 📚 Documentation

### Project Documentation
- `PHASE_3_4_COMPLETION.md` - Latest achievements (Dec 31, 2025)
- `BACKEND_SECURITY_PERFORMANCE_AUDIT.md` - Security audit (100/100 score)
- `CONTRACT_TESTING_SUMMARY.md` - API contract testing
- `docs/PARKPAL_SYSTEM_ARCHITECTURE.md` - System architecture

### Platform-Specific
- **Mobile**: `frontend/mobile/PHASE3_IMPLEMENTATION_SUMMARY.md`
- **Web**: `frontend/web/PRODUCTION_READINESS.md`
- **Backend**: `backend/PHASE_4_BETA_LAUNCH_COMPLETION.md`

### Development Guides
- `backend/PASSWORD_POLICY.md` - Password requirements
- `backend/POSTGRESQL_MIGRATION.md` - Database migration
- `backend/API_VERSIONING_GUIDE.md` - API versioning
- `frontend/web/DEPLOYMENT.md` - Deployment guide

## 🎯 Roadmap

- ✅ **Phase 1** (Dec 11, 2025): PayMongo Integration
- ✅ **Phase 2** (Dec 16, 2025): Mobile Core Features (20 screens)
- ✅ **Phase 3** (Dec 31, 2025): UX Polish & Testing
- ✅ **Phase 4** (Dec 31, 2025): Beta Launch Preparation
- 🚧 **Phase 5** (Next): Public Launch

## 📊 Project Stats

- **Files Created**: 47 (19 mobile + 6 backend + 22 web)
- **Test Cases**: 217+ (150 backend + 41 mobile + 26+ web)
- **Security Score**: 100/100 (↑72 points from Oct 2025)
- **Performance**: 10x improvement (200-500ms → 10-50ms)
- **API Contract**: 0 mismatches (31 → 0)
- **Production Ready**: ✅ Yes

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
