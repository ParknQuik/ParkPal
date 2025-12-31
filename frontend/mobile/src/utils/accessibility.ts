import { AccessibilityInfo } from 'react-native';

/**
 * Accessibility utilities for screen reader support and WCAG compliance
 */

export const accessibility = {
  /**
   * Check if screen reader is enabled
   */
  isScreenReaderEnabled: async (): Promise<boolean> => {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch (error) {
      console.debug('Failed to check screen reader status:', error);
      return false;
    }
  },

  /**
   * Announce a message to screen readers
   */
  announce: (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  },

  /**
   * Helper to create accessible button props
   */
  button: (label: string, hint?: string) => ({
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    ...(hint && { accessibilityHint: hint }),
  }),

  /**
   * Helper to create accessible text input props
   */
  textInput: (label: string, hint?: string) => ({
    accessible: true,
    accessibilityRole: 'text' as const,
    accessibilityLabel: label,
    ...(hint && { accessibilityHint: hint }),
  }),

  /**
   * Helper to create accessible image props
   */
  image: (label: string) => ({
    accessible: true,
    accessibilityRole: 'image' as const,
    accessibilityLabel: label,
  }),

  /**
   * Helper to create accessible header props
   */
  header: (level: 1 | 2 | 3 | 4 | 5 | 6 = 1) => ({
    accessible: true,
    accessibilityRole: 'header' as const,
    accessibilityLevel: level,
  }),

  /**
   * Helper to create accessible link props
   */
  link: (label: string, hint?: string) => ({
    accessible: true,
    accessibilityRole: 'link' as const,
    accessibilityLabel: label,
    ...(hint && { accessibilityHint: hint }),
  }),

  /**
   * Helper for grouped elements
   */
  group: (label?: string) => ({
    accessible: true,
    accessibilityRole: 'none' as const,
    ...(label && { accessibilityLabel: label }),
  }),

  /**
   * Mark element as disabled for screen readers
   */
  disabled: {
    accessible: true,
    accessibilityState: { disabled: true },
  },

  /**
   * Mark element as selected for screen readers
   */
  selected: (isSelected: boolean) => ({
    accessible: true,
    accessibilityState: { selected: isSelected },
  }),

  /**
   * Format price for screen reader
   */
  formatPrice: (amount: number, currency: string = 'PHP'): string => {
    return `${amount} ${currency}`;
  },

  /**
   * Format date for screen reader
   */
  formatDate: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  /**
   * Format time for screen reader
   */
  formatTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  },

  /**
   * Format rating for screen reader
   */
  formatRating: (rating: number, maxRating: number = 5): string => {
    return `${rating} out of ${maxRating} stars`;
  },
};

export default accessibility;
