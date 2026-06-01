// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  profileImageUrl?: string | null;
  totalBookings: number;
  totalSpent: number;
  activeSince: string;
}

export interface BehaviorPolicySummary {
  warning: string;
  suspension: string;
  noShow: string;
  lateCancellation: string;
  reset: string;
}

export interface BehaviorStatus {
  noShowCount: number;
  lateCancelCount: number;
  totalStrikes: number;
  isSuspended: boolean;
  suspendedUntil: string | null;
  lastStrikeAt: string | null;
  strikeResetDays: number;
  policySummary: BehaviorPolicySummary;
}

export interface BehaviorState {
  status: BehaviorStatus | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: string | null;
}

// Parking Spot types
export interface ParkingSpot {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  price: number;
  priceUnit: 'hour' | 'day';
  rating: number;
  reviews: number;
  distance?: number;
  availability: 'available' | 'occupied' | 'reserved';
  images: string[];
  amenities: string[];
  description: string;
  ownerId: string;
  ownerName: string;
  ownerRating: number;
  features: {
    covered: boolean;
    security: boolean;
    evCharging: boolean;
    accessible: boolean;
    lighting: boolean;
    cctv: boolean;
  };
}

// Booking types
export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled' | 'expired';

export interface Booking {
  id: string;
  spotId: string;
  spotTitle: string;
  spotAddress: string;
  spotImage: string;
  userId: string;
  startDate: string;
  endDate: string;
  duration: number;
  price: number;
  status: BookingStatus;
  paymentMethod: string;
  qrCode?: string;
  createdAt: string;
}

// Payment types
export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  label: string;
  details: string;
  isDefault: boolean;
}

// PayMongo Payment types
export type PayMongoPaymentMethod = 'gcash' | 'card' | 'grab_pay' | 'paymaya';

export interface PaymentIntent {
  paymentId: number;
  paymentIntentId: string;
  clientKey: string;
  amount: number;
  status: string;
  message?: string;
}

export interface Payment {
  id: number;
  userId: number;
  bookingId: number;
  paymentMethod: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  MainTabs: undefined;
  ParkingDetail: { spotId: string };
  Reservation: { spotId: string };
  ListSpot: { listingId?: number; mode?: 'edit' } | undefined;
  QRScanner: { mode?: 'checkin' | 'checkout'; bookingId?: string } | undefined;
  QRGenerator: undefined;
  WriteReview: { spotId: string | number };
  EditProfile: undefined;
  Payment: { bookingId: number; amount: number };
  PaymentSuccess: { paymentId: number; bookingId: number; paymentMethod: string; rentalMode?: 'fixed' | 'open'; };
  PaymentFailed: { error: string; bookingId: number };
  PaymentMethods: undefined;
  Earnings: undefined;
  MyListings: undefined;
  Notifications: undefined;
  MyVehicles: undefined;
  SecurityPrivacy: undefined;
  HelpCenter: undefined;
  AddVehicleWizard: { vehicleId?: number };
  PointsHistory: undefined;
  Referral: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Explore: { candidateId?: number; latitude?: number; longitude?: number; focusSpotId?: number | string } | undefined;
  Map: { candidateId?: number; latitude?: number; longitude?: number; focusSpotId?: number | string } | undefined;
  MyBookings: undefined;
  Bookings: undefined;
  Profile: undefined;
};

// Redux State types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  checkingAuth: boolean;
  error: string | null;
}

export interface ParkingState {
  spots: ParkingSpot[];
  selectedSpot: ParkingSpot | null;
  loading: boolean;
  error: string | null;
  filters: {
    priceRange: [number, number];
    amenities: string[];
    sortBy: 'price' | 'distance' | 'rating';
  };
}

export interface BookingState {
  bookings: Booking[];
  activeBooking: Booking | null;
  loading: boolean;
  error: string | null;
}

export interface LocationState {
  currentLocation: {
    latitude: number;
    longitude: number;
  } | null;
  loading: boolean;
  error: string | null;
}

// Component Props types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: any;
}

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  icon?: string;
  style?: any;
  keyboardType?: string;
  autoCapitalize?: string;
  autoComplete?: string;
  rightElement?: React.ReactNode;
}

export interface CardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}

export interface BadgeProps {
  text: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  style?: any;
}

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: any;
}

export interface AvatarProps {
  uri?: string;
  name: string;
  size?: number;
  style?: any;
}

// Marketplace types
export interface MarketplaceListing {
  id: number;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  pricePerHour: number;
  photos: string[];
  amenities: string[];
  hostId: number;
  hostName: string;
  hostAvatar?: string;
  rating: number;
  reviewCount: number;
  distance?: number;
  availability: boolean;
  zoneId?: number;
}

export interface ParkingCandidateDiscoveryPin {
  id: number;
  source: 'google_candidate';
  canBook: false;
  canShowAnalytics: boolean;
  isPreview: boolean;
  latitude: number;
  longitude: number;
  title: string;
  address: string | null;
  distance?: number;
}

export interface MarketplaceBooking {
  id: number;
  listingId: number;
  slotId: number;
  listingTitle: string;
  listingAddress: string;
  listingPhoto?: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  platformFee: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired';
  rentalMode: 'fixed' | 'hourly';
  qrCode?: string;
  sessionId?: number;
  createdAt: string;
}

export interface Review {
  id: number;
  listingId: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface HostEarnings {
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  bookingsCount: number;
  listings: Array<{
    id: number;
    title: string;
    earnings: number;
    bookings: number;
  }>;
}

export interface SearchFilters {
  q?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  sortBy?: 'price' | 'distance' | 'rating';
}

export interface MarketplaceState {
  listings: MarketplaceListing[];
  selectedListing: MarketplaceListing | null;
  myListings: MarketplaceListing[];
  bookings: MarketplaceBooking[];
  activeBooking: MarketplaceBooking | null;
  reviews: Review[];
  hostEarnings: HostEarnings | null;
  filters: SearchFilters;
  loading: boolean;
  error: string | null;
}

export interface Vehicle {
  id: number;
  userId: number;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  imageUrl?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehiclesState {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
}

// Points & Rewards types
export type PointsTransactionType = 'earn' | 'redeem' | 'expire' | 'bonus' | 'referral' | 'adjustment' | 'EARNED' | 'REDEEMED' | 'REFERRAL_BONUS' | 'REFERRAL_REWARD' | 'EXPIRED' | 'ADJUSTMENT';
export type PointsTransactionStatus = 'pending' | 'completed' | 'cancelled';
export type PointsTransactionSource = 'booking' | 'referral' | 'manual' | 'promotion' | 'adjustment';

export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  type: PointsTransactionType;
  source: PointsTransactionSource;
  referenceId?: string;
  referenceType?: string;
  description: string;
  expiresAt: string;
  isExpired: boolean;
  status: PointsTransactionStatus;
  createdAt: string;
}

export interface PointsBalance {
  balance: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PointsHistoryResponse {
  transactions: PointsTransaction[];
  pagination: Pagination;
}

export interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  activeReferrals: number;
  completedReferrals: number;
  totalPointsEarned: number;
}

export interface PointsState {
  balance: PointsBalance | null;
  transactions: PointsTransaction[];
  referralStats: ReferralStats | null;
  referralCode: string | null;
  loading: boolean;
  error: string | null;
}

// Analytics types (Phase 6A)
export type ActivityType = 'IN_VEHICLE' | 'STILL' | 'ON_FOOT' | 'WALKING' | 'RUNNING' | 'ON_BICYCLE';

export interface Zone {
  id: number;
  name: string;
  geofencePolygon: Array<{ latitude: number; longitude: number }>;
  centroidLat: number;
  centroidLon: number;
  radiusMeters: number;
}

export interface ZoneAvailability {
  zoneId: number;
  name: string;
  totalSlots: number;
  occupied: number;
  available: number;
  occupancyPercentage: number;
  estimatedCirclingTime: number; // seconds
  dataFreshness: string | null;
  message: string;
}

export interface ParkingSession {
  id: number;
  userId: number;
  zoneId: number;
  circlingStartTime: string;
  circlingEndTime?: string;
  parked?: boolean;
}

export interface ActivityEvent {
  activityEventId: number;
  timestamp: string;
  status: 'logged';
}

export interface AnalyticsState {
  activeSession: ParkingSession | null;
  activeZoneId: number | null;
  zoneAvailability: Record<number, ZoneAvailability>;
  optedIn: boolean;
  loading: boolean;
  error: string | null;
}

export interface RootState {
  auth: AuthState;
  behavior: BehaviorState;
  parking: ParkingState;
  booking: BookingState;
  location: LocationState;
  marketplace: MarketplaceState;
  vehicles: VehiclesState;
  analytics: AnalyticsState;
  points: PointsState;
  settings: { themeMode: 'system' | 'light' | 'dark' };
}
