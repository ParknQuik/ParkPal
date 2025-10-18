// User types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'driver' | 'host' | 'admin' | 'operator';
  phone?: string;
  profileImageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Parking Slot types
export interface ParkingSlot {
  id: number;
  zoneId?: number;
  slotNumber?: string;
  lat: number;
  lon: number;
  address: string;
  floor?: string;
  section?: string;
  slotType: 'commercial_iot' | 'commercial_manual' | 'roadside_qr';
  sensorId?: string;
  qrCode?: string;
  status: 'available' | 'occupied' | 'reserved' | 'out_of_service';
  price: number;
  description?: string;
  amenities?: string[];
  photos?: string[];
  rating: number;
  ownerId?: number;
  owner?: User;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  distance?: number;
}

// Booking types
export interface Booking {
  id: number;
  slotId: number;
  userId: number;
  startTime: string;
  endTime: string;
  price: number;
  platformFee: number;
  hostEarnings: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  slot?: ParkingSlot;
  user?: User;
}

// Payment types
export interface Payment {
  id: number;
  userId: number;
  sessionId?: number;
  bookingId?: number;
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'cash' | 'gcash' | 'paymaya' | 'paymongo';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// Review types
export interface Review {
  id: number;
  authorId: number;
  targetId?: number;
  slotId?: number;
  bookingId?: number;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
  target?: User;
}

// Host Earnings types
export interface HostEarnings {
  totalEarnings: number;
  pendingPayout: number;
  totalBookings: number;
  listings?: ParkingSlot[];
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface SearchParams {
  lat?: number;
  lon?: number;
  radius?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  status?: string;
}

export interface ListingFormData {
  lat: string | number;
  lon: string | number;
  price: string | number;
  address: string;
  slotType: string;
  description: string;
  amenities: string[];
  photos: string[];
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
