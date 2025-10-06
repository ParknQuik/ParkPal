// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  totalBookings: number;
  totalSpent: number;
  activeSince: string;
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
export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

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

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ParkingDetail: { spotId: string };
  Reservation: { spotId: string };
  ListSpot: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  Bookings: undefined;
  Profile: undefined;
};

// Redux State types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
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
  variant?: 'primary' | 'outline' | 'gradient';
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
}

export interface MarketplaceBooking {
  id: number;
  listingId: number;
  listingTitle: string;
  listingAddress: string;
  listingPhoto?: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  platformFee: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
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

export interface RootState {
  auth: AuthState;
  parking: ParkingState;
  booking: BookingState;
  location: LocationState;
  marketplace: MarketplaceState;
}
