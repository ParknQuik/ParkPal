// ParknQuik Mobile App - Card Component
// Updated: March 13, 2026
// Design: Google Stitch - Green theme rebrand
// Changes: Updated border radius (xxl), new shadow system, added border

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { CardProps } from '../types';
import { colors, spacing, borderRadius, shadows } from '../theme';

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl, // Updated from lg to xxl (more rounded)
    padding: spacing.lg,
    borderWidth: 1, // Added border
    borderColor: colors.border, // Subtle border
    ...shadows.sm, // Using new shadow system
  },
});
