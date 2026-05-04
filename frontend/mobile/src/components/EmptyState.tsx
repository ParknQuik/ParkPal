import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string; // MaterialCommunityIcons name
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  actionLabel,
  onAction,
}) => {
  const { colors } = useTheme();

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xxl,
    },
    icon: {
      marginBottom: spacing.lg,
      opacity: 0.5,
    },
    title: {
      ...typography.h4,
      color: colors.textPrimary,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    message: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: spacing.xl,
    },
    actionButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      marginTop: spacing.lg,
    },
    actionText: {
      ...typography.bodySmall,
      color: colors.white,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <View style={styles.container} accessible={true} accessibilityRole="text">
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={64}
          color={colors.textSecondary}
          style={styles.icon}
        />
      )}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
