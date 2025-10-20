// API Response Types
export interface ApiError {
  error: string;
  details?: Record<string, unknown>;
}

// User Types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'driver' | 'host' | 'admin';
  createdAt: string;
  updatedAt: string;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'driver' | 'host';
}

export interface AuthResponse {
  user: User;
  token: string;
  warnings?: string[];
}

export interface PasswordChangeRequest {
  oldPassword: string;
  newPassword: string;
}

// Parking Slot Types
export interface ParkingSlot {
  id: number;
  title: string;
  description: string;
  address: string;
  lat: number;
  lon: number;
  price: number;
  isActive: boolean;
  slotType: 'manual' | 'qr' | 'iot';
  amenities?: string;
  photos?: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  reviews?: Review[];
  averageRating?: number;
}

export interface SearchParams {
  lat: number;
  lon: number;
  radius?: number;
  minPrice?: number;
  maxPrice?: number;
}

export interface SearchResponse {
  listings: ParkingSlot[];
  total: number;
}

// Booking Types
export interface Booking {
  id: number;
  driverId: number;
  slotId: number;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  slot?: ParkingSlot;
  driver?: User;
  payment?: Payment;
}

export interface CreateBookingRequest {
  slotId: number;
  startTime: string;
  endTime: string;
}

// Payment Types
export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

// Review Types
export interface Review {
  id: number;
  slotId: number;
  authorId: number;
  bookingId?: number;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
}

export interface CreateReviewRequest {
  slotId: number;
  bookingId?: number;
  rating: number;
  comment?: string;
}

// QR Code Types
export interface QRCheckInRequest {
  qrCode: string;
  bookingId: number;
}

export interface QRCheckOutRequest {
  qrCode: string;
  sessionId: number;
}

// Config Types
export interface AppConfig {
  mapsApiKey: string;
  version: string;
  environment: 'development' | 'production';
}
