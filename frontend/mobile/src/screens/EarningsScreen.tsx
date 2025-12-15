import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { getHostEarnings } from '../store/slices/marketplaceSlice';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { colors, typography, spacing, borderRadius } from '../theme';
import { formatCurrency, formatDate } from '../utils/helpers';

type DateFilter = 'all' | 'week' | 'month' | 'year';

export const EarningsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { hostEarnings, loading } = useAppSelector((state) => state.marketplace);

  const [selectedFilter, setSelectedFilter] = useState<DateFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEarnings();
  }, [selectedFilter]);

  const loadEarnings = async () => {
    const params = getDateFilterParams(selectedFilter);
    await dispatch(getHostEarnings(params));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEarnings();
    setRefreshing(false);
  };

  const getDateFilterParams = (filter: DateFilter) => {
    const now = new Date();
    let startDate: Date | undefined;

    switch (filter) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return undefined;
    }

    return startDate
      ? {
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
        }
      : undefined;
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (loading && !hostEarnings) {
    return <LoadingSpinner />;
  }

  const filters: { id: DateFilter; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Earnings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Earnings Summary Header */}
        <LinearGradient
          colors={colors.gradientPrimary}
          style={styles.summaryHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.summaryLabel}>Total Earnings</Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(hostEarnings?.totalEarnings || 0)}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatCurrency(hostEarnings?.pendingPayouts || 0)}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatCurrency(hostEarnings?.completedPayouts || 0)}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {hostEarnings?.bookingsCount || 0}
              </Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Date Filters */}
          <View style={styles.filtersContainer}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterChip,
                  selectedFilter === filter.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === filter.id && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Earnings by Listing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Earnings by Listing</Text>

            {!hostEarnings || hostEarnings.listings.length === 0 ? (
              <EmptyState
                title="No Earnings Yet"
                message="Start hosting parking spots to see your earnings here"
              />
            ) : (
              hostEarnings.listings.map((listing, index) => (
                <Card key={listing.id} style={styles.listingCard}>
                  <View style={styles.listingHeader}>
                    <View style={styles.listingRank}>
                      <Text style={styles.listingRankText}>#{index + 1}</Text>
                    </View>
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingTitle} numberOfLines={1}>
                        {listing.title}
                      </Text>
                      <Text style={styles.listingStats}>
                        {listing.bookings} booking{listing.bookings !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.listingEarnings}>
                      <Text style={styles.listingEarningsAmount}>
                        {formatCurrency(listing.earnings)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${
                            hostEarnings.totalEarnings > 0
                              ? (listing.earnings / hostEarnings.totalEarnings) * 100
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.progressPercentage}>
                    {hostEarnings.totalEarnings > 0
                      ? ((listing.earnings / hostEarnings.totalEarnings) * 100).toFixed(1)
                      : 0}
                    % of total
                  </Text>
                </Card>
              ))
            )}
          </View>

          {/* Payment History Info */}
          {hostEarnings && hostEarnings.listings.length > 0 && (
            <Card style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Text style={styles.infoIcon}>💡</Text>
                <Text style={styles.infoTitle}>Payment Information</Text>
              </View>
              <Text style={styles.infoText}>
                Earnings are tracked manually. Hosts confirm payments received from drivers.
                Automatic payouts will be available soon!
              </Text>
              <View style={styles.infoStats}>
                <View style={styles.infoStatItem}>
                  <Text style={styles.infoStatLabel}>Platform Fee</Text>
                  <Text style={styles.infoStatValue}>5%</Text>
                </View>
                <View style={styles.infoStatItem}>
                  <Text style={styles.infoStatLabel}>Your Share</Text>
                  <Text style={styles.infoStatValue}>95%</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Action Buttons */}
          {hostEarnings && hostEarnings.listings.length > 0 && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  // Navigate to My Listings (will be implemented next)
                  console.log('View all listings');
                }}
              >
                <Text style={styles.actionButtonText}>View My Listings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={() => {
                  // Navigate to support/help
                  console.log('Contact support');
                }}
              >
                <Text style={styles.actionButtonTextSecondary}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 32,
    color: colors.textPrimary,
    fontWeight: '300',
  },
  headerTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },
  summaryHeader: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.sm,
  },
  summaryAmount: {
    ...typography.h1,
    color: colors.white,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statValue: {
    ...typography.h5,
    color: colors.white,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.small,
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.lg,
    marginTop: -spacing.xl,
  },
  filtersContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  listingCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listingRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  listingRankText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  listingStats: {
    ...typography.small,
    color: colors.textSecondary,
  },
  listingEarnings: {
    alignItems: 'flex-end',
  },
  listingEarningsAmount: {
    ...typography.h5,
    color: colors.success,
    fontWeight: '700',
  },
  progressContainer: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressPercentage: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: 'right',
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    marginBottom: spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  infoTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  infoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoStatItem: {
    alignItems: 'center',
  },
  infoStatLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoStatValue: {
    ...typography.h4,
    color: colors.success,
    fontWeight: '700',
  },
  actionsContainer: {
    marginBottom: spacing.xl,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
});
