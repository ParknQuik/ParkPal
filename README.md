# ParkPal - Smart Parking Management System

A full-stack parking management solution with web and mobile applications. Users can find, book, and manage parking spots while hosts can list their available spaces.

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
- **Database**: SQLite (Prisma ORM)
- **Authentication**: JWT + bcrypt
- **Real-time**: WebSocket support

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

## 🎯 Features

- **User Authentication**: Secure login/signup with JWT
- **Parking Spot Discovery**: Search and filter available parking spaces
- **Map Integration**: Interactive map view (mobile only)
- **Booking System**: Reserve parking spots with date/time selection
- **Payment Processing**: Integrated payment workflows
- **User Profiles**: Manage account settings and booking history
- **Host Features**: List and manage parking spots
- **Real-time Updates**: WebSocket notifications for booking status

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
cd frontend/mobile
./start-mobile.sh
```

Connect via Expo Go app:
- Scan QR code from terminal
- Or enter URL: `exp://192.168.100.222:8081`

## 🔧 Environment Variables

### Backend (`backend/.env`)
```
PORT=3001
DATABASE_URL=file:./dev.db
JWT_SECRET=your_jwt_secret_change_this_in_production
```

## 📱 Mobile App Notes

- The mobile app uses Expo SDK 54
- Map features only available on native devices (not web)
- Requires same WiFi network for local development
- Built with TypeScript for type safety

## 🗄️ Database

The project uses SQLite for development with the following models:
- **User**: Authentication and profile data
- **Slot**: Parking spot information
- **Booking**: Reservation records
- **Payment**: Transaction history
- **Alert**: Notification system

Run Prisma Studio to view database:
```bash
cd backend
npx prisma studio
```

## 📚 Documentation

See `docs/` folder for detailed documentation on:
- API endpoints
- Component architecture
- State management patterns
- Deployment guides

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request