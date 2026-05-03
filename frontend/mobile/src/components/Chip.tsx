// ParknQuik Mobile App - Chip Component
// Updated: March 14, 2026
// Design: Google Stitch - Green theme rebrand
// Changes: Green theme colors (primary color already updated via theme)

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChipProps } from '../types';
import { colors, typography, spacing, borderRadius } from '../theme';

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.selected,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        style={[
          styles.label,
          selected && styles.selectedText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  selectedText: {
    color: colors.white,
  },
});
