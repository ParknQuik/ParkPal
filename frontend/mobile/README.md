# ParkPal Mobile App

A complete React Native (Expo) mobile application for parking management system built with TypeScript, Redux Toolkit, and React Navigation.

## Features

- **Authentication**: Login/Signup with email and password
- **Home Dashboard**: View nearby parking spots with search functionality
- **Map View**: Interactive map with parking spot markers and filters
- **Parking Details**: Detailed view with image carousel, amenities, and pricing
- **Reservations**: Book parking spots with date/time selection
- **My Bookings**: Manage active and historical bookings with QR codes
- **List Spot**: Multi-step form to list your parking spots
- **Profile**: User profile with stats, settings, and account management

## Tech Stack

- **React Native**: 0.81.4
- **Expo**: ~54.0.12
- **TypeScript**: ~5.9.2
- **Redux Toolkit**: ^1.9.7
- **React Navigation**: ^6.1.9
- **React Native Maps**: 1.18.0
- **Expo Location**: ~18.0.4
- **Expo Linear Gradient**: ~14.0.1
- **React Native Reanimated**: ~3.17.1

## Project Structure

```
frontend/mobile/
├── App.tsx                    # Root component
├── app.json                   # Expo configuration
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── navigation/           # Navigation setup
│   │   ├── AppNavigator.tsx
│   │   ├── AuthStack.tsx
│   │   ├── MainStack.tsx
│   │   └── BottomTabNavigator.tsx
│   ├── screens/              # All screen components
│   │   ├── HomeScreen.tsx
│   │   ├── MapViewScreen.tsx
│   │   ├── ParkingDetailScreen.tsx
│   │   ├── ReservationScreen.tsx
│   │   ├── MyBookingsScreen.tsx
│   │   ├── ListSpotScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── AuthScreen.tsx
│   ├── components/           # Reusable components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Chip.tsx
│   │   ├── Avatar.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── SearchBar.tsx
│   │   ├── ParkingCard.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── Toast.tsx
│   ├── store/                # Redux store
│   │   ├── index.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── parkingSlice.ts
│   │       ├── bookingSlice.ts
│   │       └── locationSlice.ts
│   ├── services/             # API and mock data
│   │   ├── api.ts
│   │   └── mockData.ts
│   ├── theme/                # Design system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   └── utils/                # Helper functions
│       └── helpers.ts
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator

### Installation

1. **Navigate to the mobile directory**:
   ```bash
   cd /Users/bryanangeloyaneza/Projects/frontend/mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

   If you encounter npm cache issues, run:
   ```bash
   npm cache clean --force
   npm install
   ```

3. **Configure Google Maps API**:
   - Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Update `app.json` with your API key:
     ```json
     "ios": {
       "config": {
         "googleMapsApiKey": "YOUR_API_KEY_HERE"
       }
     },
     "android": {
       "config": {
         "googleMaps": {
           "apiKey": "YOUR_API_KEY_HERE"
         }
       }
     }
     ```

4. **Configure Backend API**:
   - Update the API base URL in `src/services/api.ts`:
     ```typescript
     const API_BASE_URL = 'http://your-backend-url.com/api';
     ```

### Running the App

1. **Start the development server**:
   ```bash
   npm start
   ```

2. **Run on iOS** (Mac only):
   ```bash
   npm run ios
   ```

3. **Run on Android**:
   ```bash
   npm run android
   ```

4. **Run on Web**:
   ```bash
   npm run web
   ```

## API Configuration

The app requires a backend API. Update the following in `src/services/api.ts`:

### Required API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

#### Parking
- `GET /api/parking/spots` - Get all parking spots
- `GET /api/parking/spots/:id` - Get spot by ID
- `GET /api/parking/spots/search?q=query` - Search spots
- `POST /api/parking/spots` - Create new spot
- `PUT /api/parking/spots/:id` - Update spot
- `DELETE /api/parking/spots/:id` - Delete spot

#### Bookings
- `GET /api/bookings?userId=:userId` - Get user bookings
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create new booking
- `PATCH /api/bookings/:id/cancel` - Cancel booking

#### User
- `PATCH /api/users/profile` - Update user profile
- `GET /api/users/payment-methods` - Get payment methods
- `POST /api/users/payment-methods` - Add payment method
- `DELETE /api/users/payment-methods/:id` - Delete payment method

### Request Headers

All authenticated requests will include:
```
Authorization: Bearer <token>
Content-Type: application/json
```

## Mock Data

The app currently uses mock data for development. To switch to real API:

1. Update `API_BASE_URL` in `src/services/api.ts`
2. Replace mock API calls in Redux slices with actual API calls:
   - `src/store/slices/authSlice.ts`
   - `src/store/slices/parkingSlice.ts`
   - `src/store/slices/bookingSlice.ts`

## Design System

### Colors
- Primary: `#667eea`
- Secondary: `#10b981`
- Accent: `#f59e0b`
- Success: `#10b981`
- Warning: `#f59e0b`
- Error: `#ef4444`

### Typography
- H1: 32px, bold
- H2: 28px, bold
- H3: 24px, semibold
- H4: 20px, semibold
- H5: 18px, semibold
- Body: 16px, regular
- Small: 14px, regular

### Spacing
- XS: 4px
- SM: 8px
- MD: 12px
- LG: 16px
- XL: 20px
- XXL: 24px

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

### Using EAS Build (Recommended)
```bash
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**:
   ```bash
   expo start -c
   ```

2. **Dependencies issues**:
   ```bash
   rm -rf node_modules
   npm cache clean --force
   npm install
   ```

3. **iOS Simulator issues**:
   ```bash
   npx pod-install
   ```

4. **Android build issues**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

## Environment Variables

Create a `.env` file in the root directory:

```
API_BASE_URL=http://localhost:3000/api
GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Testing Credentials

For development with mock data:
- Email: any email format (e.g., test@example.com)
- Password: any password with at least 8 characters, 1 uppercase, 1 lowercase, 1 number

## License

MIT

## Support

For issues or questions, please contact support@parkpal.com
