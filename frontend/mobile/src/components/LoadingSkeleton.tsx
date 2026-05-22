import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface LoadingSkeletonProps {
  variant?: 'collapsed' | 'expanded';
}

interface AnimatedBoxProps {
  width: number;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const AnimatedBox: React.FC<AnimatedBoxProps> = ({
  width: w,
  height: h,
  borderRadius = 6,
  style,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.ease }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['#e5e7eb', '#f3f4f6']),
  }));

  return (
    <Animated.View
      style={[animatedStyle, { width: w, height: h, borderRadius }, style]}
    />
  );
};

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'expanded' }) => {
  if (variant === 'collapsed') {
    return (
      <View style={styles.skeletonContainer}>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 8 }}>
            <AnimatedBox width={width * 0.4} height={16} />
            <AnimatedBox width={width * 0.25} height={12} />
          </View>
          <AnimatedBox width={56} height={28} borderRadius={8} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.skeletonContainer}>
      {/* Image placeholder */}
      <AnimatedBox width={width - 32} height={180} borderRadius={12} />
      
      <View style={styles.body}>
        {/* Title */}
        <AnimatedBox width={width * 0.6} height={20} />
        
        {/* Address + distance */}
        <AnimatedBox width={width * 0.5} height={14} style={{ marginTop: 8 }} />
        <AnimatedBox width={width * 0.2} height={14} style={{ marginTop: 4 }} />
        
        {/* Price badge */}
        <View style={styles.priceRow}>
          <AnimatedBox width={70} height={32} borderRadius={8} />
          <AnimatedBox width={60} height={24} borderRadius={12} style={{ marginLeft: 8 }} />
        </View>
        
        {/* Rating */}
        <AnimatedBox width={width * 0.25} height={14} style={{ marginTop: 8 }} />
        
        {/* Amenities */}
        <View style={styles.amenityRow}>
          {[80, 90, 70, 85].map((w, i) => (
            <AnimatedBox key={i} width={w} height={28} borderRadius={14} />
          ))}
        </View>
        
        {/* Zone availability */}
        <AnimatedBox width={width * 0.35} height={22} borderRadius={12} style={{ marginTop: 8 }} />
        
        {/* Action buttons */}
        <View style={styles.actionRow}>
          <AnimatedBox width={width * 0.55} height={48} borderRadius={12} />
          <AnimatedBox width={48} height={48} borderRadius={12} style={{ marginLeft: 8 }} />
          <AnimatedBox width={80} height={48} borderRadius={12} style={{ marginLeft: 8 }} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonContainer: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  body: {
    marginTop: 16,
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  amenityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
});
