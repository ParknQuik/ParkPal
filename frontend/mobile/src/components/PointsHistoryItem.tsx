// ParkPal Mobile App - Points History Item Component
// Component for displaying individual points transaction items

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { PointsTransaction } from '../types';
import { colors, spacing, borderRadius } from '../theme';

// Icons for different transaction types
const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'earn':
      return {
        name: 'arrow-down',
        color: colors.success,
        bgColor: 'rgba(16, 183, 127, 0.1)',
      };
    case 'redeem':
      return {
        name: 'arrow-up',
        color: colors.error,
        bgColor: 'rgba(239, 68, 68, 0.1)',
      };
    case 'referral':
      return {
        name: 'gift',
        color: colors.accent,
        bgColor: 'rgba(250, 204, 21, 0.1)',
      };
    case 'bonus':
      return {
        name: 'star',
        color: colors.accentYellow,
        bgColor: 'rgba(250, 204, 21, 0.15)',
      };
    case 'expire':
      return {
        name: 'clock',
        color: colors.warning,
        bgColor: 'rgba(245, 158, 11, 0.1)',
      };
    default:
      return {
        name: 'adjust',
        color: colors.textSecondary,
        bgColor: 'rgba(148, 163, 184, 0.1)',
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
  const icon = getTransactionIcon(transaction.type);
  const isEarn = transaction.type === 'earn' || transaction.type === 'referral' || transaction.type === 'bonus';
  const isExpire = transaction.type === 'expire';
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
        <View 
          style={[
            styles.iconWrapper,
            { backgroundColor: icon.bgColor },
          ]}
        >
          <Text style={[styles.icon, { color: icon.color }]}>
            {getIconSvg(transaction.type)}
          </Text>
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

const getIconSvg = (type: string) => {
  switch (type) {
    case 'earn':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4V20M12 4L8 8M12 4L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'redeem':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 20V4M12 20L16 16M12 20L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'referral':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.84 4.61C21.11 4.34 20.84 4.34 20.57 4.61C20.3 4.88 12 12 12 12C12 12 3.7 4.88 3.46 4.61C3.22 4.34 2.95 4.61 3.19 4.88L10.92 12L3.19 19.12C2.95 19.39 3.22 19.66 3.46 19.39C3.7 19.12 12 12 12 12C12 12 20.3 19.12 20.54 19.39C20.78 19.66 21.05 19.39 20.81 19.12L13.08 12L20.84 4.61Z" fill="currentColor"/>
        </svg>
      );
    case 'bonus':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
        </svg>
      );
    case 'expire':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 12H20M12 4V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
  }
};

const formatType = (type: string) => {
  const typeMap: Record<string, string> = {
    earn: 'Earned',
    redeem: 'Redeemed',
    referral: 'Referral Bonus',
    bonus: 'Bonus',
    expire: 'Expired',
    adjustment: 'Adjustment',
  };
  return typeMap[type] || type;
};

const styles = StyleSheet.create({
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
  },
  icon: {
    color: colors.primary,
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
});
