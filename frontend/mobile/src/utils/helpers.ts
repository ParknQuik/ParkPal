export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export const formatDistance = (distanceInKm: number): string => {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m`;
  }
  return `${distanceInKm.toFixed(1)}km`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleTimeString('en-US', options);
};

export const formatDateTime = (dateString: string): string => {
  return `${formatDate(dateString)} at ${formatTime(dateString)}`;
};

export const calculateDuration = (
  startDate: string,
  endDate: string
): number => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const hours = (end - start) / (1000 * 60 * 60);
  return Math.round(hours * 10) / 10;
};

export const getInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): {
  valid: boolean;
  message?: string;
} => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const getBookingStatusColor = (
  status: string
): {
  bg: string;
  text: string;
} => {
  switch (status) {
    case 'active':
      return { bg: '#10b981', text: '#ffffff' };
    case 'upcoming':
      return { bg: '#3b82f6', text: '#ffffff' };
    case 'completed':
      return { bg: '#64748b', text: '#ffffff' };
    case 'cancelled':
      return { bg: '#ef4444', text: '#ffffff' };
    default:
      return { bg: '#94a3b8', text: '#ffffff' };
  }
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
