import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback utilities for enhanced user experience
 * iOS and Android supported through Expo Haptics
 */

export const haptics = {
  /**
   * Light impact feedback - for subtle interactions like taps
   */
  light: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Silently fail if haptics not available
        ;
      }
    }
  },

  /**
   * Medium impact feedback - for button presses
   */
  medium: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        ;
      }
    }
  },

  /**
   * Heavy impact feedback - for important actions
   */
  heavy: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        ;
      }
    }
  },

  /**
   * Success notification - for successful operations
   */
  success: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        ;
      }
    }
  },

  /**
   * Warning notification - for warnings or important alerts
   */
  warning: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (error) {
        ;
      }
    }
  },

  /**
   * Error notification - for errors or failed operations
   */
  error: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (error) {
        ;
      }
    }
  },

  /**
   * Selection feedback - for picker/selector changes
   */
  selection: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await Haptics.selectionAsync();
      } catch (error) {
        ;
      }
    }
  },
};

export default haptics;
