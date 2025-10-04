import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BadgeProps } from '../types';
import { colors, typography, spacing, borderRadius } from '../theme';

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'default',
  style,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.success, text: colors.white };
      case 'warning':
        return { bg: colors.warning, text: colors.white };
      case 'error':
        return { bg: colors.error, text: colors.white };
      case 'info':
        return { bg: colors.info, text: colors.white };
      default:
        return { bg: colors.border, text: colors.textSecondary };
    }
  };

  const badgeColors = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeColors.bg },
        style,
      ]}
    >
      <Text style={[styles.text, { color: badgeColors.text }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.tiny,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
