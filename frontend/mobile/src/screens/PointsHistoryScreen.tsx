import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchHistory } from '../store/slices/pointsSlice';
import { PointsHistoryItem } from '../components/PointsHistoryItem';
import { EmptyState } from '../components/EmptyState';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { PointsTransaction } from '../types';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { StatusBar } from 'expo-status-bar';
import { AppHeader } from '../components/AppHeader';
import { ListLoadingState, RetryableFailureState } from '../components/ListState';

export const PointsHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();

  const pointsState = useAppSelector((state) => state.points) ?? {
    transactions: [],
    loading: false,
    balance: null,
    referralStats: null,
    referralCode: null,
    error: null
  };
  const { transactions, loading, error } = pointsState;
  const showInitialLoading = loading && !refreshing && transactions.length === 0;
  const showInitialFailure = Boolean(error) && transactions.length === 0;

  const statusBarStyle = useStatusBarStyle();

   const fetchHistoryData = useCallback(async () => {
     try {
       await dispatch(fetchHistory({ page: 1, limit: 50 })).unwrap();
     } catch (error) {
     }
   }, [dispatch]);

  useEffect(() => {
    fetchHistoryData();
  }, [fetchHistoryData]);

   const handleRefresh = useCallback(async () => {
     if (refreshing) return;
     setRefreshing(true);
     try {
       await dispatch(fetchHistory({ page: 1, limit: 50 })).unwrap();
     } catch (error) {
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
      icon="chart-timeline"
    />
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
      backgroundColor: colors.appHeaderBackground,
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
    contentArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: colors.white,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      ...typography.h5,
      color: colors.white,
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
    stateContainer: {
      padding: spacing.md,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.appHeaderBackground} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <AppHeader title="Points History" onBack={handleBack} />
        <View style={styles.contentArea}>
          {showInitialLoading ? (
            <View style={styles.stateContainer}>
              <ListLoadingState
                variant="transaction"
                accessibilityLabel="Loading points history"
                testID="points-history-loading-skeleton"
              />
            </View>
          ) : showInitialFailure ? (
            <View style={styles.stateContainer}>
              <RetryableFailureState
                title="Unable to load points history"
                message={error || 'Something went wrong while loading your points history. Please try again.'}
                retryLabel="Retry loading points history"
                onRetry={fetchHistoryData}
                testID="points-history-failure"
              />
            </View>
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
      </SafeAreaView>
    </View>
  );
};
