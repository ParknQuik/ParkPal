// ParknQuik Mobile App - LoadingSpinner Component
// Updated: March 14, 2026
// Design: Google Stitch - Green theme rebrand
// Changes: Green primary color (already uses colors.primary from theme)

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
}) => {
  const { colors } = useTheme();
  const spinnerColor = color ?? colors.primary;

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={spinnerColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
