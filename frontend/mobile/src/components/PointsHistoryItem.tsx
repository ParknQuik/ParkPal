// ParkPal Mobile App - Points History Item Component
// Component for displaying individual points transaction items

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PointsTransaction } from '../types';
import { spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface TransactionIconConfig {
  name: string;
  color: string;
}

const getTransactionIcon = (type: string, colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']): TransactionIconConfig => {
  const upperType = type.toUpperCase();
  switch (upperType) {
    case 'EARNED':
      return {
        name: 'arrow-down-bold',
        color: colors.success,
      };
    case 'REDEEMED':
      return {
        name: 'arrow-up-bold',
        color: colors.error,
      };
    case 'REFERRAL_BONUS':
    case 'REFERRAL_REWARD':
      return {
        name: 'gift',
        color: colors.accent,
      };
    case 'EXPIRED':
      return {
        name: 'clock-outline',
        color: colors.warning,
      };
    case 'ADJUSTMENT':
      return {
        name: 'tune',
        color: colors.textSecondary,
      };
    case 'BONUS':
      return {
        name: 'star',
        color: colors.accentYellow,
      };
    default:
      return {
        name: 'help-circle',
        color: colors.textSecondary,
      };
  }
};

export interface PointsHistoryItemProps {
  transaction: PointsTransaction;
  showBalance?: boolean;
}

export const PointsHistoryItem: React.FC<PointsHistoryItemProps> = ({
  transaction,
  showBalance = false,
}) => {
  const { colors } = useTheme();

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    leftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconWrapper: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
      backgroundColor: 'rgba(148, 163, 184, 0.1)',
    },
    textContent: {
      flex: 1,
    },
    typeText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    descriptionText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    dateText: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    referenceText: {
      fontSize: 11,
      color: colors.textTertiary,
      fontFamily: 'monospace',
      marginTop: 2,
    },
    rightContent: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    amountText: {
      fontSize: 16,
      fontWeight: '700',
    },
    balanceAfterText: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 2,
    },
  }), [colors]);

  const icon = getTransactionIcon(transaction.type, colors);
  const upperType = transaction.type.toUpperCase();
  const isEarn = ['EARNED', 'REFERRAL_BONUS', 'REFERRAL_REWARD', 'BONUS'].includes(upperType);
  const isExpire = upperType === 'EXPIRED';
  const amountColor = isEarn ? colors.success : isExpire ? colors.warning : colors.error;
  const amountPrefix = isEarn ? '+' : isExpire ? '-' : '-';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <View style={styles.iconWrapper}>
          <MaterialCommunityIcons
            name={icon.name as any}
            size={20}
            color={icon.color}
          />
        </View>

        <View style={styles.textContent}>
          <Text style={styles.typeText}>{formatType(transaction.type)}</Text>
          <Text style={styles.descriptionText} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text style={styles.dateText}>
            {formatDate(transaction.createdAt)} at {formatTime(transaction.createdAt)}
          </Text>
          {transaction.referenceId && (
            <Text style={styles.referenceText}>
              Ref: {transaction.referenceId}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightContent}>
        <Text style={[styles.amountText, { color: amountColor }]}>
          {amountPrefix}{Math.abs(transaction.amount).toLocaleString()}
        </Text>
        {showBalance && (
          <Text style={styles.balanceAfterText}>
            Balance: {transaction.balanceAfter.toLocaleString()}
          </Text>
        )}
      </View>
    </View>
  );
};

const formatType = (type: string) => {
  const upperType = type.toUpperCase();
  const typeMap: Record<string, string> = {
    EARNED: 'Earned',
    REDEEMED: 'Redeemed',
    REFERRAL_BONUS: 'Referral Bonus',
    REFERRAL_REWARD: 'Referral Reward',
    EXPIRED: 'Expired',
    ADJUSTMENT: 'Adjustment',
    BONUS: 'Bonus',
  };
  return typeMap[upperType] || type;
};
