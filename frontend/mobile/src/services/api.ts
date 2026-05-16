import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api.config';
import { PointsBalance, PointsHistoryResponse, ReferralStats } from '../types';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  signup: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password, role: 'driver' }),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data: { name: string; phone: string | null; profileImageUrl?: string | null }) =>
    api.patch('/users/profile', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
  googleSignIn: (code: string) =>
    api.post('/auth/google', { code }),
};

// Parking endpoints (using /slots to match backend)
export const parkingAPI = {
  getSpots: (params?: {
    latitude?: number;
    longitude?: number;
    radius?: number;
    minPrice?: number;
    maxPrice?: number;
  }) => api.get('/slots', { params }),
  getSpotById: (id: string) => api.get(`/slots/${id}`),
  searchSpots: (query: string) =>
    api.get('/marketplace/search', { params: { q: query } }),
  createSpot: (data: any) => api.post('/slots', data),
  updateSpot: (id: string, data: any) => api.put(`/slots/${id}`, data),
  deleteSpot: (id: string) => api.delete(`/slots/${id}`),
};

// Booking endpoints (using /marketplace/bookings to match backend)
export const bookingAPI = {
  getBookings: (userId: string) =>
    api.get('/marketplace/bookings', { params: { userId } }),
  getBookingById: (id: string) => api.get(`/marketplace/bookings/${id}`),
  createBooking: (data: {
    spotId: string;
    startDate: string;
    endDate: string;
    paymentMethodId: string;
  }) => api.post('/marketplace/bookings', data),
  cancelBooking: (id: string) => api.patch(`/marketplace/bookings/${id}/cancel`),
};

// Marketplace endpoints
export const marketplaceAPI = {
  // Listings
  createListing: (data: {
    lat: number;
    lon: number;
    price: number;
    address: string;
    slotType: 'roadside_qr' | 'commercial_manual' | 'commercial_iot';
    description?: string;
    amenities?: string[];
    photos?: string[];
    zoneId?: number;
  }) => api.post('/marketplace/listings', data),

  getListingById: (id: number) => api.get(`/marketplace/listings/${id}`),

  getMyListings: () => api.get('/marketplace/host/listings'),

  updateListing: (id: number, data: {
    title?: string;
    description?: string;
    address?: string;
    lat?: number;
    lon?: number;
    price?: number;
    slotType?: 'roadside_qr' | 'commercial_manual' | 'commercial_iot';
    amenities?: string[];
    photos?: string[];
  }) => api.put(`/marketplace/listings/${id}`, data),

  deleteListing: (listingId: number) => api.delete(`/marketplace/listings/${listingId}`),

  // Search with filters
  searchListings: (params?: {
    lat?: number;
    lon?: number;
    radius?: number;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string;
    slotType?: string;
    status?: string;
    q?: string;
  }) => api.get('/marketplace/search', { params }),

  // Bookings
  createBookingMarketplace: (data: {
    slotId: number;
    startTime: string;
    endTime: string;
    rentalMode?: 'fixed' | 'open';
    maxDuration?: number;
  }) => api.post('/marketplace/bookings', data),

  getMyBookings: () => api.get('/marketplace/bookings'),

  cancelBooking: (bookingId: number) =>
    api.patch(`/marketplace/bookings/${bookingId}/cancel`),

  // Confirm booking without payment (for cash payments)
  confirmBooking: (bookingId: number) =>
    api.post(`/marketplace/bookings/${bookingId}/confirm`),

  // Check if booking can be extended
  checkExtensionAvailability: (bookingId: number, hours: number) =>
    api.get(`/marketplace/bookings/${bookingId}/extension-availability`, {
      params: { hours },
    }),

  // Extend booking
  extendBooking: (bookingId: number, data: { hours: number; paymentIntentId: string }) =>
    api.post(`/marketplace/bookings/${bookingId}/extend`, data),

  // QR Code operations
  qrCheckIn: (data: { qrData: string; bookingId?: number }) =>
    api.post('/marketplace/qr/checkin', data),

  qrCheckOut: (data: { sessionId: number }) =>
    api.post('/marketplace/qr/checkout', data),

  // Reviews
  createReview: (data: {
    slotId: number;
    bookingId?: number;
    rating: number;
    comment?: string;
  }) => api.post('/marketplace/reviews', data),

  getListingReviews: (listingId: number) =>
    api.get(`/marketplace/listings/${listingId}/reviews`),

  // Host earnings
  getHostEarnings: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/marketplace/host/earnings', { params }),

  // Toggle listing availability
  toggleListingAvailability: (listingId: number, isActive: boolean) =>
    api.patch(`/marketplace/listings/${listingId}/toggle`, { isActive }),
};

// Vehicle endpoints
export const vehiclesAPI = {
  getVehicles: () => api.get('/vehicles'),
  getVehicle: (id: number) => api.get(`/vehicles/${id}`),
  createVehicle: (data: {
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
    imageUrl?: string;
    isDefault?: boolean;
  }) => api.post('/vehicles', data),
  updateVehicle: (id: number, data: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    licensePlate?: string;
    imageUrl?: string;
    isDefault?: boolean;
  }) => api.put(`/vehicles/${id}`, data),
  deleteVehicle: (id: number) => api.delete(`/vehicles/${id}`),
  setDefaultVehicle: (id: number) => api.post(`/vehicles/${id}/default`),
};

// User endpoints
export const userAPI = {
  updateProfile: (data: { name?: string; phone?: string; avatar?: string }) =>
    api.patch('/users/profile', data),
  getPaymentMethods: () => api.get('/users/payment-methods'),
  addPaymentMethod: (data: any) => api.post('/users/payment-methods', data),
  deletePaymentMethod: (id: string) =>
    api.delete(`/users/payment-methods/${id}`),
  getProfileUploadUrl: (fileName: string) =>
    api.get<{ uploadUrl: string; fileName: string; expiresAt: string }>('/users/profile/upload-url', {
      params: { fileName }
    }),
  uploadProfilePicture: (fileName: string) =>
    api.patch<{
      id: number;
      name: string;
      email: string;
      phone: string | null;
      profileImageUrl: string | null;
    }>('/users/profile/upload', { fileName }),
};

// Payment endpoints (PayMongo integration)
export const paymentAPI = {
  // Create payment intent for booking
  createPaymentIntent: (data: {
    bookingId: number;
    amount: number;
    paymentMethod: 'cash' | 'gcash' | 'card' | 'grab_pay' | 'paymaya';
  }) => api.post('/payments/intent', data),

  // Confirm payment after completion
  confirmPayment: (data: { paymentIntentId: string }) =>
    api.post('/payments/confirm', data),

  // Create GCash payment (alternative flow)
  createGCashPayment: (data: { bookingId: number; amount: number }) =>
    api.post('/payments/gcash', data),

  // Get all user payments
  getPayments: () => api.get('/payments'),

  // Get specific payment by ID
  getPaymentById: (id: number) => api.get(`/payments/${id}`),
};

// Earnings endpoints
export const earningsAPI = {
  getSummary: () => api.get('/earnings/summary'),
  getTransactions: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get('/earnings/transactions', { params }),
  getAnalytics: (period?: 'weekly' | 'monthly') =>
    api.get('/earnings/analytics', { params: { period } }),
  requestPayout: (amount: number) =>
    api.post('/earnings/payout', { amount }),
};

// Config endpoints
export const configAPI = {
  getGoogleMapsApiKey: () => api.get('/config/maps-api-key'),
  getAppConfig: () => api.get('/config/app'),
};

// Notifications endpoints
export interface Notification {
  id: number;
  userId: number;
  title: string;
  body: string;
  type: string;
  data: Record<string, any>;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export const notificationsAPI = {
  getNotifications: (params?: { read?: boolean; limit?: number; offset?: number }) =>
    api.get<NotificationsResponse>('/notifications', { params }),
  
  getUnreadCount: () => api.get<{ unreadCount: number }>('/notifications/unread-count'),
  
  getNotification: (id: number) => api.get<Notification>(`/notifications/${id}`),
  
  markAsRead: (id: number) => api.patch<Notification>(`/notifications/${id}/read`),
  
  markAllAsRead: () => api.patch('/notifications/read-all'),
  
  deleteNotification: (id: number) => api.delete(`/notifications/${id}`),
};

// Points & Referral endpoints
export const pointsAPI = {
  getBalance: () => api.get<PointsBalance>('/points/balance'),
  earnPoints: (bookingId: string, amount: number) =>
    api.post('/points/earn', { bookingId, amount }),
  redeemPoints: (amount: number, bookingId?: string) =>
    api.post('/points/redeem', { amount, bookingId }),
  getHistory: (page: number, limit: number) =>
    api.get<PointsHistoryResponse>('/points/history', { params: { page, limit } }),
  generateReferralCode: () => api.post<{ code: string }>('/referrals/generate'),
  validateReferralCode: (referralCode: string) =>
    api.post<{ valid: boolean; message?: string }>('/referrals/validate', { referralCode }),
  getReferralStats: () => api.get<ReferralStats>('/referrals/stats'),
  processReferralReward: (referredUserId: string) =>
    api.post('/referrals/process', { referredUserId }),
};

// Analytics endpoints (Phase 6A — Service 1)
export const analyticsAPI = {
  // Notify backend when user enters a parking zone geofence
  zoneEnter: (data: {
    userId: number;
    zoneId: number;
    latitude: number;
    longitude: number;
  }) => api.post('/analytics/zone/enter', data),

  // Notify backend when user exits a parking zone geofence
  zoneExit: (data: {
    sessionId: number;
    exitTime?: string;
    parked?: boolean;
  }) => api.post('/analytics/zone/exit', data),

  // Log an activity recognition event during a zone session
  logActivity: (data: {
    userId: number;
    sessionId: number;
    activityType: 'IN_VEHICLE' | 'STILL' | 'ON_FOOT' | 'WALKING' | 'RUNNING' | 'ON_BICYCLE';
    confidence: number;
    latitude?: number;
    longitude?: number;
  }) => api.post('/analytics/activity', data),

  // Get real-time availability + circling time estimate for a zone
  getZoneAvailability: (zoneId: number) =>
    api.get(`/analytics/zones/${zoneId}/availability`),

  // Get aggregated zone metrics (historical)
  getZoneMetrics: (zoneId: number, params?: {
    startDate?: string;
    endDate?: string;
    interval?: 'hour' | 'day' | 'week';
  }) => api.get(`/analytics/zones/${zoneId}/metrics`, { params }),

  // List all zones (used by geofence service on startup)
  getZones: () => api.get('/analytics/zones'),
};

export default api;
