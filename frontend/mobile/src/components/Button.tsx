// ParknQuik Mobile App - Button Component
// Updated: March 13, 2026
// Design: Google Stitch - Green theme rebrand
// Changes: Updated border radius (xl), added shadows, new secondary/text variants

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ButtonProps } from '../types';
import { typography, spacing, borderRadius, shadows } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { haptics } from '../utils/haptics';

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
}) => {
  const { colors } = useTheme();

  const handlePress = async () => {
    if (!disabled && !loading) {
      await haptics.medium();
      onPress?.();
    }
  };
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.xl, // Updated from md to xl (more rounded)
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    };

    const sizeStyles: Record<string, ViewStyle> = {
      small: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
      medium: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
      large: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl },
    };

    // Add shadow based on variant
    const shadowStyle = variant === 'outline' ? {} : shadows.default;

    return { ...baseStyle, ...sizeStyles[size], ...shadowStyle };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...typography.button,
      fontWeight: '600',
    };

    const sizeStyles: Record<string, TextStyle> = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyles: Record<string, TextStyle> = {
      primary: { color: colors.white },
      secondary: { color: colors.white },
      outline: { color: colors.primary },
      text: { color: colors.primary },
      gradient: { color: colors.white },
    };

    return { ...baseStyle, ...sizeStyles[size], ...variantStyles[variant] };
  };

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        style={[styles.container, style]}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || loading }}
      >
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[getButtonStyle(), disabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={getTextStyle()}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Variant-specific styles with new green theme
  const getVariantStyle = (): ViewStyle => {
    const baseStyle = getButtonStyle();

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: colors.primary, // Green
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: colors.secondary, // Orange
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.primary,
          ...shadows.none, // No shadow for outline
        };
      case 'text':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          ...shadows.none, // No shadow for text
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: colors.primary,
        };
    }
  };

  const buttonStyle = getVariantStyle();

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        buttonStyle,
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? colors.primary : colors.white}
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
