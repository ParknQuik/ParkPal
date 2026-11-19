import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { AppHeader } from '../components/AppHeader';
import { PointsHistoryItem } from '../components/PointsHistoryItem';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../context/ThemeContext';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchBalance, fetchHistory, fetchReferralStats, generateReferralCode } from '../store/slices/pointsSlice';
import { borderRadius, spacing } from '../theme';

const HISTORY_LIMIT = 20;

export const PerksScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const points = useAppSelector((state) => state.points);
  const [refreshing, setRefreshing] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const statusBarStyle = useStatusBarStyle();

  const loadBalance = useCallback(() => { dispatch(fetchBalance()); }, [dispatch]);
  const loadHistory = useCallback(() => { dispatch(fetchHistory({ page: 1, limit: HISTORY_LIMIT })); }, [dispatch]);
  const loadStats = useCallback(() => { dispatch(fetchReferralStats()); }, [dispatch]);

  useEffect(() => {
    loadBalance();
    loadHistory();
    loadStats();
  }, [loadBalance, loadHistory, loadStats]);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchBalance()),
        dispatch(fetchHistory({ page: 1, limit: HISTORY_LIMIT })),
        dispatch(fetchReferralStats()),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, refreshing]);

  const copyCode = useCallback(async () => {
    if (!points.referralCode) return;
    setCopyMessage('');
    try {
      const copied = await Clipboard.setStringAsync(points.referralCode);
      setCopyMessage(copied ? 'Code copied' : 'Could not copy code. Please try again.');
    } catch {
      setCopyMessage('Could not copy code. Please try again.');
    }
  }, [points.referralCode]);

  const nextPage = (points.pagination?.page ?? 0) + 1;
  const hasMore = Boolean(points.pagination && points.pagination.page < points.pagination.pages);
  const stats = points.referralStats;
  const styles = useMemo(() => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.appHeaderBackground },
    content: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
    section: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: borderRadius.xl, padding: spacing.md },
    sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
    balance: { color: colors.textPrimary, fontSize: 38, fontWeight: '700' },
    body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    error: { color: colors.error, fontSize: 14, marginBottom: spacing.sm },
    action: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primary, marginTop: spacing.sm },
    actionText: { color: colors.white, fontWeight: '700' },
    code: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: 1, marginVertical: spacing.sm },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    statValue: { color: colors.textPrimary, fontWeight: '700' },
    transaction: { marginHorizontal: -spacing.md },
  }), [colors]);

  const action = (label: string, onPress: () => void, disabled = false) => (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={styles.action}>
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style={statusBarStyle} />
      <AppHeader title="Perks" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points balance</Text>
          {points.balanceLoading && !points.balance ? <ActivityIndicator accessibilityLabel="Loading points balance" /> : points.balance ? <Text style={styles.balance}>{points.balance.balance.toLocaleString()} points</Text> : null}
          {points.balanceError ? <><Text style={styles.error}>{points.balanceError}</Text>{action('Retry points balance', loadBalance)}</> : null}
          <Text style={styles.body}>Checkout redemption is not available yet.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points history</Text>
          {points.historyLoading && points.transactions.length === 0 ? <ActivityIndicator accessibilityLabel="Loading points history" /> : null}
          {!points.historyLoading && !points.historyError && points.transactions.length === 0 ? <Text style={styles.body}>No points transactions yet.</Text> : null}
          {points.transactions.map((transaction) => <View key={transaction.id} style={styles.transaction}><PointsHistoryItem transaction={transaction} /></View>)}
          {points.historyError ? <><Text style={styles.error}>{points.historyError}</Text>{action('Retry points history', () => dispatch(fetchHistory({ page: points.historyRequestedPage, limit: HISTORY_LIMIT })))}</> : null}
          {hasMore && !points.historyError ? action(points.historyLoading ? 'Loading more' : 'Load more transactions', () => dispatch(fetchHistory({ page: nextPage, limit: HISTORY_LIMIT })), points.historyLoading) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Referral code</Text>
          <Text style={styles.body}>Referral signup benefits are not active yet. You can still reveal and copy your code.</Text>
          {points.referralCode ? <><Text style={styles.code}>{points.referralCode}</Text>{action('Copy referral code', copyCode)}</> : action(points.codeLoading ? 'Revealing code' : 'Reveal my code', () => dispatch(generateReferralCode()), points.codeLoading)}
          {points.codeLoading ? <ActivityIndicator accessibilityLabel="Loading referral code" /> : null}
          {points.codeError ? <><Text style={styles.error}>{points.codeError}</Text>{action('Retry referral code', () => dispatch(generateReferralCode()))}</> : null}
          {copyMessage ? <Text accessibilityRole="alert" style={copyMessage === 'Code copied' ? styles.body : styles.error}>{copyMessage}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Referral stats</Text>
          {points.referralStatsLoading && !stats ? <ActivityIndicator accessibilityLabel="Loading referral stats" /> : null}
          {stats ? ([
            ['Total', stats.totalReferrals],
            ['Pending', stats.pendingReferrals],
            ['Active', stats.activeReferrals],
            ['Completed', stats.completedReferrals],
            ['Points Earned', stats.totalPointsEarned],
          ] as const).map(([label, value]) => <View key={label} style={styles.statRow}><Text style={styles.body}>{label}</Text><Text style={styles.statValue}>{value.toLocaleString()}</Text></View>) : null}
          {points.referralStatsError ? <><Text style={styles.error}>{points.referralStatsError}</Text>{action('Retry referral stats', loadStats)}</> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
