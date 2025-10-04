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
import { colors, typography, spacing, borderRadius } from '../theme';

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
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    };

    const sizeStyles: Record<string, ViewStyle> = {
      small: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
      medium: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
      large: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl },
    };

    return { ...baseStyle, ...sizeStyles[size] };
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
      outline: { color: colors.primary },
      gradient: { color: colors.white },
    };

    return { ...baseStyle, ...sizeStyles[size], ...variantStyles[variant] };
  };

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.container, style]}
        activeOpacity={0.8}
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

  const buttonStyle: ViewStyle =
    variant === 'outline'
      ? {
          ...getButtonStyle(),
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.primary,
        }
      : {
          ...getButtonStyle(),
          backgroundColor: colors.primary,
        };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        buttonStyle,
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
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
