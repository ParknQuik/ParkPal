import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { haptics } from '../utils/haptics';
import { earningsAPI } from '../services/api';

interface EarningsSummary {
  totalEarned: number;
  monthlyChange: number;
  availableBalance: number;
}

interface AnalyticsItem {
  label: string;
  amount: number;
}

interface Transaction {
  id: number;
  createdAt: string;
  description: string;
  amount: number;
  status: string;
  type?: string;
}

export const EarningsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');

  const fetchData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const [summaryRes, analyticsRes, transactionsRes] = await Promise.all([
        earningsAPI.getSummary(),
        earningsAPI.getAnalytics(period),
        earningsAPI.getTransactions({ limit: 10 }),
      ]);

      setSummary(summaryRes.data?.data || summaryRes.data || null);
      setAnalytics(analyticsRes.data?.data || analyticsRes.data || []);
      setTransactions(transactionsRes.data?.data || transactionsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
      if (!isRefresh) {
        Alert.alert('Error', 'Failed to load earnings data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [period])
  );

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const analyticsResponse = await earningsAPI.getAnalytics(period);
        setAnalytics(analyticsResponse.data?.data || analyticsResponse.data || []);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      }
    };
    fetchAnalytics();
  }, [period]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleBack = async () => {
    await haptics.light();
    navigation.goBack();
  };

  const handleWithdraw = async () => {
    await haptics.medium();
    if (!summary?.availableBalance || summary.availableBalance <= 0) {
      Alert.alert('No Balance', 'You have no available balance to withdraw.');
      return;
    }
    try {
      await earningsAPI.requestPayout(summary.availableBalance);
      Alert.alert('Success', 'Payout request submitted successfully.');
      fetchData(true);
    } catch (error) {
      console.error('Payout failed:', error);
      Alert.alert('Error', 'Payout request failed. Please try again.');
    }
  };

  const maxAmount = analytics.length > 0 ? Math.max(...analytics.map(d => d.amount)) : 1;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Earnings</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Earnings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <View style={styles.totalCardContainer}>
            <LinearGradient
              colors={['#10b77f', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.totalCard}
            >
              <Text style={styles.totalLabel}>Total Earned</Text>
              <Text style={styles.totalAmount}>₱{(summary?.totalEarned ?? 0).toLocaleString()}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeIcon}>{(summary?.monthlyChange ?? 0) >= 0 ? '↑' : '↓'}</Text>
                <Text style={styles.badgeText}>
                  {(summary?.monthlyChange ?? 0) >= 0 ? '+' : ''}{summary?.monthlyChange ?? 0}% from last month
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.cardLabel}>Available Balance</Text>
              <Text style={styles.cardValue}>₱{(summary?.availableBalance ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.cardLabel}>This Month</Text>
              <Text style={styles.cardValue}>
                {(summary as any)?.monthlyEarnings != null
                  ? `₱${(summary as any).monthlyEarnings.toLocaleString()}`
                  : `${(summary?.monthlyChange ?? 0) >= 0 ? '+' : ''}${summary?.monthlyChange ?? 0}%`}
              </Text>
            </View>
          </View>

          {analytics.length > 0 && (
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>{period === 'weekly' ? 'Weekly' : 'Monthly'} Earnings</Text>
              <View style={styles.periodToggle}>
                <TouchableOpacity
                  style={[styles.periodButton, period === 'weekly' && styles.periodButtonActive]}
                  onPress={() => setPeriod('weekly')}
                >
                  <Text style={[styles.periodText, period === 'weekly' && styles.periodTextActive]}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodButton, period === 'monthly' && styles.periodButtonActive]}
                  onPress={() => setPeriod('monthly')}
                >
                  <Text style={[styles.periodText, period === 'monthly' && styles.periodTextActive]}>Monthly</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chartContainer}>
                {analytics.map((item) => (
                  <View key={item.label} style={styles.barWrapper}>
                    <View style={styles.barContainer}>
                      <View 
                        style={[
                          styles.bar, 
                          { height: `${(item.amount / maxAmount) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.barLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No transactions yet.</Text>
              </View>
            ) : (
              transactions.map((transaction) => {
                const isPositive = transaction.type !== 'debit' && transaction.amount >= 0;
                return (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
                    <Text style={styles.transactionDesc}>{transaction.description}</Text>
                    <Text style={[styles.txStatus, { color: transaction.status === 'completed' ? colors.primary : colors.secondary }]}>
                      {transaction.status || 'completed'}
                    </Text>
                  </View>
                  <Text style={[styles.transactionAmount, { color: isPositive ? colors.primary : colors.error }]}>
                    {isPositive ? '+' : '-'}₱{Math.abs(transaction.amount).toLocaleString()}
                  </Text>
                </View>
                );
              })
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleWithdraw} style={styles.withdrawButton}>
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  totalCardContainer: {
    marginBottom: spacing.lg,
  },
  totalCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  totalLabel: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  totalAmount: {
    ...typography.h1,
    color: colors.white,
    fontSize: 36,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    fontSize: 14,
    color: colors.white,
    marginRight: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  cardLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardValue: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  chartSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  periodButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  periodButtonActive: {
    backgroundColor: colors.white,
  },
  periodText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  periodTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    width: 24,
    height: 120,
    justifyContent: 'flex-end',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    minHeight: 20,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  transactionsSection: {
    marginBottom: spacing.lg,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  transactionDesc: {
    ...typography.body,
    color: colors.textPrimary,
  },
  txStatus: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  transactionAmount: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  withdrawButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});