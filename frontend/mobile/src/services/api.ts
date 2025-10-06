import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Update this with your computer's local IP when running on physical device
// For now using localhost (works with iOS simulator)
const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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
    api.post('/auth/signup', { name, email, password }),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

// Parking endpoints
export const parkingAPI = {
  getSpots: (params?: {
    latitude?: number;
    longitude?: number;
    radius?: number;
    minPrice?: number;
    maxPrice?: number;
  }) => api.get('/parking/spots', { params }),
  getSpotById: (id: string) => api.get(`/parking/spots/${id}`),
  searchSpots: (query: string) =>
    api.get('/parking/spots/search', { params: { q: query } }),
  createSpot: (data: any) => api.post('/parking/spots', data),
  updateSpot: (id: string, data: any) => api.put(`/parking/spots/${id}`, data),
  deleteSpot: (id: string) => api.delete(`/parking/spots/${id}`),
};

// Booking endpoints
export const bookingAPI = {
  getBookings: (userId: string) =>
    api.get('/bookings', { params: { userId } }),
  getBookingById: (id: string) => api.get(`/bookings/${id}`),
  createBooking: (data: {
    spotId: string;
    startDate: string;
    endDate: string;
    paymentMethodId: string;
  }) => api.post('/bookings', data),
  cancelBooking: (id: string) => api.patch(`/bookings/${id}/cancel`),
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

export default api;
