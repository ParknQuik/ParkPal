import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search parking spots...',
  onFocus,
  onBlur,
}) => {
  const { colors } = useTheme();

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    input: {
      ...typography.body,
      color: colors.textPrimary,
      paddingVertical: spacing.md,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </View>
  );
};
