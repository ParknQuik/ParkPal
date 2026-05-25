import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { SkeletonLoader } from './SkeletonLoader';
import { accessibility } from '../utils/accessibility';

export type ListLoadingVariant = 'parking' | 'booking' | 'vehicle' | 'transaction' | 'listing';

type ListLoadingStateProps = {
  variant: ListLoadingVariant;
  accessibilityLabel: string;
  testID?: string;
};

type RetryableFailureStateProps = {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
  testID?: string;
};

const SKELETON_COUNTS: Record<ListLoadingVariant, number> = {
  parking: 3,
  booking: 3,
  vehicle: 3,
  transaction: 3,
  listing: 3,
};

export const ListLoadingState: React.FC<ListLoadingStateProps> = ({
  variant,
  accessibilityLabel,
  testID,
}) => {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      padding: spacing.md,
    },
    listingCard: {
      padding: 0,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    column: {
      flex: 1,
      gap: spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.lg,
      marginBottom: spacing.sm,
    },
    content: {
      padding: spacing.md,
    },
    inlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
  }), [colors]);

  const renderSkeleton = (index: number) => {
    if (variant === 'parking') {
      return (
        <View key={index} style={[styles.card, styles.row]} testID="parking-skeleton-card">
          <SkeletonLoader width={96} height={96} borderRadius={borderRadius.md} />
          <View style={styles.column}>
            <View style={styles.headerRow}>
              <SkeletonLoader width="68%" height={20} />
              <SkeletonLoader width={48} height={18} />
            </View>
            <SkeletonLoader width="58%" height={16} />
            <SkeletonLoader width="46%" height={18} />
          </View>
        </View>
      );
    }

    if (variant === 'booking') {
      return (
        <View key={index} style={styles.card} testID="booking-skeleton-card">
          <View style={styles.row}>
            <View style={styles.column}>
              <SkeletonLoader width={92} height={14} />
              <SkeletonLoader width="78%" height={22} />
              <SkeletonLoader width="88%" height={16} />
              <SkeletonLoader width="64%" height={16} />
            </View>
            <SkeletonLoader width={96} height={96} borderRadius={borderRadius.lg} />
          </View>
          <View style={styles.actions}>
            <SkeletonLoader width="48%" height={40} borderRadius={borderRadius.lg} />
            <SkeletonLoader width="48%" height={40} borderRadius={borderRadius.lg} />
          </View>
        </View>
      );
    }

    if (variant === 'vehicle') {
      return (
        <View key={index} style={styles.card} testID="vehicle-skeleton-card">
          <View style={styles.headerRow}>
            <SkeletonLoader width="62%" height={22} />
            <SkeletonLoader width={72} height={22} borderRadius={borderRadius.full} />
          </View>
          <SkeletonLoader width="48%" height={16} />
          <SkeletonLoader width="58%" height={16} />
          <View style={styles.actions}>
            <SkeletonLoader width={52} height={32} borderRadius={borderRadius.md} />
            <SkeletonLoader width={92} height={32} borderRadius={borderRadius.md} />
            <SkeletonLoader width={64} height={32} borderRadius={borderRadius.md} />
          </View>
        </View>
      );
    }

    if (variant === 'transaction') {
      return (
        <View key={index} style={styles.card} testID="transaction-skeleton-row">
          <View style={styles.row}>
            <SkeletonLoader width={44} height={44} borderRadius={borderRadius.full} />
            <View style={styles.column}>
              <SkeletonLoader width="70%" height={18} />
              <SkeletonLoader width="48%" height={14} />
            </View>
            <SkeletonLoader width={56} height={18} />
          </View>
        </View>
      );
    }

    return (
      <View key={index} style={[styles.card, styles.listingCard]} testID="listing-skeleton-card">
        <SkeletonLoader width="100%" height={180} borderRadius={0} />
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.column}>
              <SkeletonLoader width={68} height={18} borderRadius={borderRadius.full} />
              <SkeletonLoader width="82%" height={20} />
            </View>
            <SkeletonLoader width={72} height={24} />
          </View>
          <View style={styles.inlineRow}>
            <SkeletonLoader width={16} height={16} borderRadius={borderRadius.full} />
            <SkeletonLoader width="72%" height={16} />
          </View>
          <View style={styles.actions}>
            <SkeletonLoader width="78%" height={44} borderRadius={borderRadius.lg} />
            <SkeletonLoader width={48} height={44} borderRadius={borderRadius.lg} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {Array.from({ length: SKELETON_COUNTS[variant] }, (_, index) => renderSkeleton(index))}
    </View>
  );
};

export const RetryableFailureState: React.FC<RetryableFailureStateProps> = ({
  title,
  message,
  retryLabel,
  onRetry,
  testID,
}) => {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.xl,
    },
    iconShell: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.error}15`,
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.h5,
      color: colors.textPrimary,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    message: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    retryButton: {
      minHeight: 44,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: {
      ...typography.bodySmall,
      color: colors.white,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={title}
      testID={testID}
    >
      <View style={styles.iconShell}>
        <MaterialCommunityIcons name="alert-circle-outline" size={34} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        {...accessibility.button(retryLabel)}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};
