import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Get API URL from environment variable or fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request queue for retry logic
interface RetryConfig {
  retryCount?: number;
  retryDelay?: number;
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Add auth token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Handle responses and errors with retry logic
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & RetryConfig;

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
      return Promise.reject(error);
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error('Server error:', error);
      // Optionally redirect to 500 error page
      // window.location.href = '/500';
    }

    // Retry logic for network errors or 5xx errors
    const shouldRetry = (
      !error.response || // Network error
      (error.response.status >= 500 && error.response.status < 600) // Server error
    );

    if (shouldRetry && config) {
      const retryCount = config.retryCount || 0;

      if (retryCount < MAX_RETRIES) {
        config.retryCount = retryCount + 1;

        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, retryCount);

        console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));

        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors with user-friendly messages
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || error.response.data?.error;
      return message || `Error: ${error.response.status}`;
    } else if (error.request) {
      // Request made but no response
      return 'Unable to connect to server. Please check your internet connection.';
    }
  }
  return 'An unexpected error occurred. Please try again.';
};

// Helper function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

// Helper function to get current user
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export default api;
