import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { ParkingSpot } from '../types';
import { colors, typography, spacing, borderRadius } from '../theme';
import { formatCurrency, formatDistance } from '../utils/helpers';
import { Badge } from './Badge';

interface ParkingCardProps {
  spot: ParkingSpot;
  onPress: () => void;
}

export const ParkingCard: React.FC<ParkingCardProps> = ({ spot, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: spot.images[0] }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {spot.title}
          </Text>
          <Badge
            text={spot.availability}
            variant={spot.availability === 'available' ? 'success' : 'error'}
          />
        </View>
        <Text style={styles.address} numberOfLines={1}>
          {spot.address}, {spot.city}
        </Text>
        <View style={styles.footer}>
          <View style={styles.rating}>
            <Text style={styles.ratingText}>★ {spot.rating}</Text>
            <Text style={styles.reviews}>({spot.reviews})</Text>
          </View>
          {spot.distance !== undefined && (
            <Text style={styles.distance}>{formatDistance(spot.distance)}</Text>
          )}
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {formatCurrency(spot.price)}/{spot.priceUnit}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: colors.border,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h6,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  address: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  reviews: {
    ...typography.small,
    color: colors.textTertiary,
  },
  distance: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  priceContainer: {
    marginTop: spacing.sm,
  },
  price: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
  },
});
