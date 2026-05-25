import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { notificationsAPI, Notification } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';

const NOTIFICATION_ICONS: Record<string, string> = {
  booking_confirmed: '\u2705',
  booking_cancelled: '\u274C',
  new_booking: '\uD83C\uDD7F\uFE0F',
  review: '\u2B50',
  earning: '\uD83D\uDCB0',
};

const DEFAULT_ICON = '\uD83D\uDD14';

function getNotificationIcon(type: string): string {
  return NOTIFICATION_ICONS[type] ?? DEFAULT_ICON;
}

function isPenaltyNotification(type: string): boolean {
  return type === 'penalty_strike';
}

function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return new Date(dateString).toLocaleDateString();
}

export const NotificationsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const statusBarStyle = useStatusBarStyle();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationsAPI.getNotifications();
      const data = response.data;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      Alert.alert('Error', 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = useCallback(
    async (id: number) => {
      const notification = notifications.find((n) => n.id === id);
      if (!notification || notification.read) return;

      try {
        await notificationsAPI.markAsRead(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        Alert.alert('Error', 'Failed to mark as read.');
      }
    },
    [notifications]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;

    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      Alert.alert('Error', 'Failed to mark all as read.');
    }
  }, [unreadCount]);

  const handleDelete = useCallback((id: number) => {
    Alert.alert('Delete Notification', 'Are you sure you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await notificationsAPI.deleteNotification(id);
            setNotifications((prev) => {
              const deleted = prev.find((n) => n.id === id);
              if (deleted && !deleted.read) {
                setUnreadCount((c) => Math.max(0, c - 1));
              }
              return prev.filter((n) => n.id !== id);
            });
          } catch {
            Alert.alert('Error', 'Failed to delete notification.');
          }
        },
      },
    ]);
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      backgroundColor: colors.appHeaderBackground,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.appHeaderBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: colors.headerActionBackground,
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    headerTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: '600' as const,
      color: colors.appHeaderText,
    },
    badge: {
      backgroundColor: colors.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeText: {
      color: colors.white,
      fontSize: 11,
      fontWeight: '700' as const,
    },
    markAllButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: colors.headerActionBackground,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      padding: spacing.md,
      paddingBottom: spacing.xxxl,
    },
    emptyList: {
      flexGrow: 1,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardUnread: {
      backgroundColor: colors.surfaceSecondary,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
      position: 'relative',
    },
    icon: {
      fontSize: 22,
    },
    penaltyIconContainer: {
      backgroundColor: `${colors.warning}18`,
    },
    unreadDot: {
      position: 'absolute',
      top: 2,
      right: 2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    textContainer: {
      flex: 1,
      marginRight: spacing.sm,
    },
    title: {
      fontSize: typography.sizes.md,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    titleUnread: {
      color: colors.textPrimary,
      fontWeight: '700' as const,
    },
    body: {
      fontSize: typography.sizes.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    timestamp: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      marginTop: 4,
    },
    deleteButton: {
      padding: 4,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 80,
    },
    emptyTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: '600' as const,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    emptySubtitle: {
      fontSize: typography.sizes.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
  }), [colors, isDark]);

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      activeOpacity={0.7}
      onPress={() => handleMarkAsRead(item.id)}
    >
      <View style={[styles.iconContainer, isPenaltyNotification(item.type) && styles.penaltyIconContainer]}>
        {isPenaltyNotification(item.type) ? (
          <MaterialCommunityIcons name="shield-alert-outline" size={24} color={colors.warning} />
        ) : (
          <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
        )}
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.timestamp}>{getRelativeTime(item.createdAt)}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmpty = () =>
    !loading && (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="bell-off-outline"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyTitle}>No Notifications</Text>
        <Text style={styles.emptySubtitle}>You're all caught up!</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.appHeaderBackground} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          style={styles.markAllButton}
          disabled={unreadCount === 0}
        >
          <MaterialCommunityIcons
            name="check-all"
            size={24}
            color={unreadCount > 0 ? colors.primary : (isDark ? colors.primaryDark : colors.textSecondary)}
          />
        </TouchableOpacity>
      </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};
