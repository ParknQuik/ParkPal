/**
 * User-friendly error messages
 * Converts technical errors into readable messages for end users
 */

export const getErrorMessage = (error: any): string => {
  // Network errors
  if (error.message === 'Network request failed' || error.code === 'NETWORK_ERROR') {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Authentication errors
  if (error.response?.status === 401) {
    return 'Your session has expired. Please log in again.';
  }

  if (error.response?.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  // Not found errors
  if (error.response?.status === 404) {
    return 'The requested resource was not found.';
  }

  // Validation errors
  if (error.response?.status === 422 || error.response?.status === 400) {
    const validationMessage = error.response?.data?.message;
    if (validationMessage) {
      return validationMessage;
    }
    return 'Please check your input and try again.';
  }

  // Server errors
  if (error.response?.status >= 500) {
    return 'Something went wrong on our end. Please try again later.';
  }

  // Rate limiting
  if (error.response?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Location errors
  if (error.message?.includes('location')) {
    return 'Unable to access your location. Please enable location services.';
  }

  // Payment errors
  if (error.message?.includes('payment')) {
    return 'Payment processing failed. Please check your payment method.';
  }

  // Generic error with message from backend
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Generic error with message from error object
  if (error.message) {
    return error.message;
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Specific error messages for common operations
 */
export const ErrorMessages = {
  // Auth
  LOGIN_FAILED: 'Invalid email or password. Please try again.',
  SIGNUP_FAILED: 'Unable to create account. Please try again.',
  LOGOUT_FAILED: 'Unable to log out. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',

  // Booking
  BOOKING_FAILED: 'Unable to complete booking. Please try again.',
  BOOKING_CANCEL_FAILED: 'Unable to cancel booking. Please contact support.',
  BOOKING_NOT_FOUND: 'Booking not found. It may have been cancelled.',

  // Parking
  SPOTS_LOAD_FAILED: 'Unable to load parking spots. Please refresh.',
  SPOT_NOT_FOUND: 'Parking spot not found.',
  SEARCH_FAILED: 'Search failed. Please try again.',

  // Location
  LOCATION_PERMISSION_DENIED: 'Location permission denied. Please enable in settings.',
  LOCATION_UNAVAILABLE: 'Unable to get your location. Please try again.',

  // Payment
  PAYMENT_FAILED: 'Payment failed. Please check your payment method.',
  PAYMENT_METHOD_INVALID: 'Invalid payment method. Please try another.',

  // Network
  NO_INTERNET: 'No internet connection. Please check your network.',
  REQUEST_TIMEOUT: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',

  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

/**
 * Get user-friendly field validation messages
 */
export const getValidationMessage = (field: string, rule: string): string => {
  const fieldName = field.charAt(0).toUpperCase() + field.slice(1);

  switch (rule) {
    case 'required':
      return `${fieldName} is required`;
    case 'email':
      return 'Please enter a valid email address';
    case 'minLength':
      return `${fieldName} is too short`;
    case 'maxLength':
      return `${fieldName} is too long`;
    case 'pattern':
      return `${fieldName} format is invalid`;
    case 'min':
      return `${fieldName} value is too low`;
    case 'max':
      return `${fieldName} value is too high`;
    default:
      return `${fieldName} is invalid`;
  }
};
