// ParkPal Mobile App - Points Balance Card Component
// Component for displaying user's points balance with redeem functionality

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../types';
import { redeemPoints } from '../store/slices/pointsSlice';
import { Button } from './Button';
import { colors, spacing, borderRadius, shadows } from '../theme';

// Star icon SVG for points
const starIcon = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FACC15" stroke="#FACC15" stroke-width="2" stroke-linejoin="round"/>
</svg>
`;

export const PointsBalanceCard: React.FC = () => {
  const dispatch = useDispatch();
  const balance = useSelector((state: RootState) => state.points.balance);
  const loading = useSelector((state: RootState) => state.points.loading);
  const error = useSelector((state: RootState) => state.points.error);

  const handleRedeem = () => {
    // Open a modal or navigate to redeem screen
    // For now, dispatch a sample redeem action
    console.log('Redeem points clicked');
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <SvgXml xml={starIcon} width={24} height={24} />
        </View>
        <Text style={styles.label}>Points Balance</Text>
      </View>
      
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceText}>
          {balance?.balance?.toLocaleString() || '0'}
        </Text>
        <Text style={styles.pointsLabel}>points</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Button
        title="Redeem Points"
        onPress={handleRedeem}
        variant="gradient"
        size="medium"
        loading={loading}
        style={styles.redeemButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  balanceText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 56,
  },
  pointsLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    marginBottom: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  redeemButton: {
    marginTop: spacing.sm,
  },
});
