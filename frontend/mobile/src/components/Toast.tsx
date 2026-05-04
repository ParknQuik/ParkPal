import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { haptics } from '../utils/haptics';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  visible: boolean;
  onHide: () => void;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible,
  onHide,
  duration = 3000,
  action,
}) => {
  const { colors } = useTheme();
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(100)).current;

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 100,
      left: spacing.xl,
      right: spacing.xl,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      fontSize: 20,
      color: colors.white,
      marginRight: spacing.md,
      fontWeight: '700',
    },
    message: {
      ...typography.bodySmall,
      color: colors.white,
      flex: 1,
      fontWeight: '500',
    },
    actionButton: {
      marginLeft: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    actionText: {
      ...typography.small,
      color: colors.white,
      fontWeight: '700',
    },
    closeButton: {
      marginLeft: spacing.sm,
      padding: spacing.xs,
    },
    closeText: {
      fontSize: 16,
      color: colors.white,
      fontWeight: '700',
    },
  }), [colors]);

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback based on type
      if (type === 'success') {
        haptics.success();
      } else if (type === 'error') {
        haptics.error();
      } else if (type === 'warning') {
        haptics.warning();
      }

      // Animate in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 15,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after duration (if no action button)
      if (!action) {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      // Reset position when hidden
      translateY.setValue(100);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      default:
        return colors.info;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          opacity,
          transform: [{ translateY }],
        },
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{getIcon()}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
      {action && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            haptics.light();
            action.onPress();
            hideToast();
          }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => {
          haptics.light();
          hideToast();
        }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};
