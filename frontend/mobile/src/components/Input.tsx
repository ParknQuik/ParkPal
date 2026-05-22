// ParknQuik Mobile App - Input Component
// Updated: March 13, 2026
// Design: Google Stitch - Green theme rebrand
// Changes: Updated border radius (xl), focus state with green primary

import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { InputProps } from '../types';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  icon,
  style,
  keyboardType,
  autoCapitalize,
  autoComplete,
  rightElement,
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.xl, // Updated from md to xl (more rounded)
      paddingHorizontal: spacing.lg,
    },
    inputFocused: {
      borderColor: colors.primary, // Green border when focused
      borderWidth: 2, // Thicker border on focus
    },
    inputError: {
      borderColor: colors.error,
      borderWidth: 2,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: colors.textPrimary,
      paddingVertical: spacing.md,
    },
    errorText: {
      ...typography.small,
      color: colors.error,
      marginTop: spacing.xs,
    },
  }), [colors]);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          error && styles.inputError,
          isFocused && styles.inputFocused,
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType as any}
          autoCapitalize={autoCapitalize as any}
          autoComplete={autoComplete as any}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {rightElement}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
