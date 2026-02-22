import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get API URL from app config, fallback to dev URL
// Updated for API v1 versioning
const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  (__DEV__ ? 'http://192.168.100.176:3001/api/v1' : 'https://api.parkpal.com/api/v1');

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log API URL for debugging
console.log('API Base URL:', API_BASE_URL);

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
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage and redirect to login
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // TODO: Navigate to login screen
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
  updateProfile: (data: { name: string; phone: string | null }) =>
    api.patch('/users/profile', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
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
  }) => api.get('/marketplace/search', { params }),

  // Bookings
  createBookingMarketplace: (data: {
    slotId: number;
    startTime: string;
    endTime: string;
  }) => api.post('/marketplace/bookings', data),

  getMyBookings: () => api.get('/marketplace/bookings'),

  cancelBooking: (bookingId: number) =>
    api.patch(`/marketplace/bookings/${bookingId}/cancel`),

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
};

// User endpoints
export const userAPI = {
  updateProfile: (data: { name?: string; phone?: string; avatar?: string }) =>
    api.patch('/users/profile', data),
  getPaymentMethods: () => api.get('/users/payment-methods'),
  addPaymentMethod: (data: any) => api.post('/users/payment-methods', data),
  deletePaymentMethod: (id: string) =>
    api.delete(`/users/payment-methods/${id}`),
};

// Payment endpoints (PayMongo integration)
export const paymentAPI = {
  // Create payment intent for booking
  createPaymentIntent: (data: {
    bookingId: number;
    amount: number;
    paymentMethod: 'gcash' | 'card' | 'grab_pay' | 'paymaya';
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

// Config endpoints
export const configAPI = {
  getGoogleMapsApiKey: () => api.get('/config/maps-api-key'),
  getAppConfig: () => api.get('/config/app'),
};

export default api;
