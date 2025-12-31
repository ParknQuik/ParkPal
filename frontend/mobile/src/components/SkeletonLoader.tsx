import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius: customBorderRadius = borderRadius.md,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: customBorderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Pre-built skeleton layouts for common use cases
export const SkeletonParkingCard: React.FC = () => (
  <View style={styles.cardContainer}>
    <SkeletonLoader width="100%" height={200} borderRadius={borderRadius.lg} />
    <View style={styles.cardContent}>
      <SkeletonLoader width="70%" height={24} style={{ marginBottom: spacing.sm }} />
      <SkeletonLoader width="50%" height={16} style={{ marginBottom: spacing.md }} />
      <View style={styles.row}>
        <SkeletonLoader width={80} height={16} style={{ marginRight: spacing.md }} />
        <SkeletonLoader width={100} height={16} />
      </View>
    </View>
  </View>
);

export const SkeletonBookingCard: React.FC = () => (
  <View style={styles.cardContainer}>
    <View style={styles.row}>
      <SkeletonLoader width={80} height={80} borderRadius={borderRadius.lg} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <SkeletonLoader width="80%" height={20} style={{ marginBottom: spacing.sm }} />
        <SkeletonLoader width="60%" height={16} style={{ marginBottom: spacing.sm }} />
        <SkeletonLoader width="40%" height={16} />
      </View>
    </View>
  </View>
);

export const SkeletonListItem: React.FC = () => (
  <View style={styles.listItem}>
    <SkeletonLoader width={60} height={60} borderRadius={borderRadius.full} />
    <View style={{ flex: 1, marginLeft: spacing.md }}>
      <SkeletonLoader width="70%" height={18} style={{ marginBottom: spacing.sm }} />
      <SkeletonLoader width="50%" height={14} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.border,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  cardContent: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
