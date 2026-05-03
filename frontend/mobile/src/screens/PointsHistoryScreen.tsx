import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchHistory } from '../store/slices/pointsSlice';
import { PointsHistoryItem } from '../components/PointsHistoryItem';
import { EmptyState } from '../components/EmptyState';
import { colors, typography, spacing, borderRadius } from '../theme';
import { PointsTransaction } from '../types';

export const PointsHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);

      const pointsState = useAppSelector((state) => state.points) ?? {
        transactions: [],
        loading: false,
        balance: null,
        referralStats: null,
        referralCode: null,
        error: null
      };
      const { transactions, loading } = pointsState;

   const fetchHistoryData = useCallback(async () => {
     try {
       const result = await dispatch(fetchHistory({ page: 1, limit: 50 })).unwrap();
       console.log('Points history response:', result);
     } catch (error) {
       console.error('Error fetching points history:', error);
     }
   }, [dispatch]);

  useEffect(() => {
    fetchHistoryData();
  }, [fetchHistoryData]);

   const handleRefresh = useCallback(async () => {
     if (refreshing) return;
     setRefreshing(true);
     try {
       const result = await dispatch(fetchHistory({ page: 1, limit: 50 })).unwrap();
       console.log('Points history refresh response:', result);
     } catch (error) {
       console.error('Error refreshing points history:', error);
     } finally {
       setRefreshing(false);
     }
   }, [dispatch, refreshing]);

  const handleBack = () => {
    navigation.goBack();
  };

  const renderTransactionItem = ({ item }: { item: PointsTransaction }) => (
    <PointsHistoryItem transaction={item} showBalance={false} />
  );

  const renderEmptyState = () => (
    <EmptyState
      title="No Points History"
      message="Your points transactions will appear here once you start earning or redeeming points."
      icon="📊"
    />
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading points history...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Points History</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      {loading && !refreshing && transactions.length === 0 ? (
        renderLoading()
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            transactions.length === 0 && styles.emptyListContent,
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={!loading ? renderEmptyState : null}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  title: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  emptyListContent: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
