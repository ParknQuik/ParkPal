import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { getMyBookings } from '../store/slices/marketplaceSlice';
import { marketplaceAPI } from '../services/api';
import { colors, typography, spacing, borderRadius } from '../theme';

const PRIMARY = '#10b77f';
const SECONDARY_ORANGE = '#f97316';
const ACCENT_YELLOW = '#fbbf24';
const BACKGROUND = '#f6f8f7';

type TabType = 'upcoming' | 'completed' | 'cancelled';

const TABS: { key: TabType; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
    case 'active':
      return PRIMARY;
    case 'pending':
      return SECONDARY_ORANGE;
    case 'completed':
      return PRIMARY;
    case 'cancelled':
      return '#ef4444';
    default:
      return PRIMARY;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'Confirmed';
    case 'active':
      return 'Active';
    case 'pending':
      return 'Payment Pending';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

const getActionButtonText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Complete Payment';
    case 'confirmed':
    case 'active':
      return 'View Details';
    case 'completed':
      return 'Rate';
    default:
      return 'View Details';
  }
};

const getActionButtonColor = (status: string) => {
  if (status === 'pending') return SECONDARY_ORANGE;
  if (status === 'completed') return ACCENT_YELLOW;
  return PRIMARY;
};

const formatBookingDate = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${start.toLocaleDateString('en-US', opts)}, ${start.toLocaleTimeString('en-US', timeOpts)} - ${end.toLocaleTimeString('en-US', timeOpts)}`;
};

export const MyBookingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  const { bookings, loading, error } = useAppSelector((state) => state.marketplace);

  const fetchBookings = useCallback(async () => {
    try {
      await dispatch(getMyBookings()).unwrap();
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  const handleAction = useCallback(
    (booking: any) => {
      switch (booking.status) {
        case 'confirmed':
        case 'active':
          navigation.navigate('ParkingDetail' as never, { spotId: booking.listingId } as never);
          break;
        case 'pending':
          navigation.navigate('Payment' as never, { bookingId: booking.id, amount: booking.totalAmount } as never);
          break;
        case 'completed':
          navigation.navigate('WriteReview' as never, { spotId: booking.listingId } as never);
          break;
        default:
          navigation.navigate('ParkingDetail' as never, { spotId: booking.listingId } as never);
          break;
      }
    },
    [navigation],
  );

  const handleCancelBooking = useCallback(
    (bookingId: string) => {
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this booking? This action cannot be undone.',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                await marketplaceAPI.cancelBooking(parseInt(bookingId, 10));
                await fetchBookings();
              } catch (err) {
                Alert.alert('Error', 'Failed to cancel booking. Please try again.');
              }
            },
          },
        ],
      );
    },
    [fetchBookings],
  );

  const handleShowQR = useCallback((booking: any) => {
    const qrData = booking.qrCode || String(booking.id);
    setQrCodeData(qrData);
    setQrModalVisible(true);
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    if (activeTab === 'upcoming') {
      return booking.status === 'confirmed' || booking.status === 'pending' || booking.status === 'active';
    }
    if (activeTab === 'completed') {
      return booking.status === 'completed';
    }
    if (activeTab === 'cancelled') {
      return booking.status === 'cancelled';
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyText}>Failed to load bookings</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookings}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY} />
        }
        renderItem={({ item: booking }) => {
          const statusColor = getStatusColor(booking.status);
          const buttonColor = getActionButtonColor(booking.status);
          const buttonText = getActionButtonText(booking.status);
          const statusLabel = getStatusLabel(booking.status);

          return (
            <View style={styles.bookingCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardInfo}>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                  </View>
                  <Text style={styles.bookingName} numberOfLines={1}>{booking.listingTitle || booking.listingAddress}</Text>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateIcon}>📅</Text>
                    <Text style={styles.dateText}>{formatBookingDate(booking.startTime, booking.endTime)}</Text>
                  </View>
                  {booking.listingAddress && (
                    <View style={styles.dateContainer}>
                      <Text style={styles.dateIcon}>📍</Text>
                      <Text style={styles.dateText} numberOfLines={1}>{booking.listingAddress}</Text>
                    </View>
                  )}
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateIcon}>💰</Text>
                    <Text style={styles.dateText}>₱{(booking.totalAmount || 0).toFixed(2)}</Text>
                  </View>
                </View>
                {booking.listingPhoto ? (
                  <Image source={{ uri: booking.listingPhoto }} style={styles.cardImage} contentFit="cover" transition={200} />
                ) : (
                  <View style={[styles.cardImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderIcon}>🅿️</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: buttonColor },
                  ]}
                  onPress={() => handleAction(booking)}
                >
                  <Text style={styles.actionButtonText}>{buttonText}</Text>
                  <Text style={styles.actionButtonIcon}>→</Text>
                </TouchableOpacity>
                {booking.status === 'completed' && (
                  <TouchableOpacity
                    style={styles.rateButton}
                    onPress={() => navigation.navigate('WriteReview' as never, { spotId: booking.listingId } as never)}
                  >
                    <Text style={styles.rateButtonIcon}>⭐</Text>
                  </TouchableOpacity>
                )}
              </View>
              {(booking.status === 'confirmed' || booking.status === 'active') && (booking.qrCode || booking.id) && (
                <TouchableOpacity style={styles.qrButton} onPress={() => handleShowQR(booking)}>
                  <Text style={styles.qrButtonText}>Show QR Code</Text>
                </TouchableOpacity>
              )}
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelBooking(String(booking.id))}>
                  <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.bookingsListContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No {activeTab} bookings found</Text>
          </View>
        }
      />
      )}

      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setQrModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Booking QR Code</Text>
            {qrCodeData && (
              <Image
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrCodeData}` }}
                style={{ width: 200, height: 200 }}
                contentFit="contain"
              />
            )}
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setQrModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: `${PRIMARY}10`,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.lg.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  searchButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    fontSize: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: `${PRIMARY}10`,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: PRIMARY,
  },
  tabText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: PRIMARY,
    fontWeight: '700',
  },
  filterScroll: {
    backgroundColor: colors.white,
    maxHeight: 60,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: `${PRIMARY}20`,
    gap: 4,
  },
  activeFilterChip: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterIcon: {
    fontSize: 16,
  },
  activeFilterIcon: {
    color: colors.white,
  },
  filterText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  activeFilterText: {
    color: colors.white,
  },
  bookingsList: {
    flex: 1,
  },
  bookingsListContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 80,
  },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${PRIMARY}5`,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardInfo: {
    flex: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingName: {
    fontSize: typography.lg.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dateIcon: {
    fontSize: 12,
  },
  dateText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  cardImage: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    gap: 6,
  },
  actionButtonText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.white,
  },
  actionButtonIcon: {
    fontSize: 16,
    color: colors.white,
  },
  rateButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: `${ACCENT_YELLOW}10`,
    borderWidth: 1,
    borderColor: `${ACCENT_YELLOW}20`,
  },
  rateButtonIcon: {
    fontSize: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: typography.md.fontSize,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: PRIMARY,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  retryText: {
    fontSize: typography.sm.fontSize,
    color: colors.white,
    fontWeight: '600',
  },
  placeholderImage: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  qrButton: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: `${PRIMARY}10`,
    borderWidth: 1,
    borderColor: `${PRIMARY}20`,
    alignItems: 'center',
  },
  qrButtonText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '600',
    color: PRIMARY,
  },
  cancelButton: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '600',
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    width: '80%',
  },
  modalTitle: {
    fontSize: typography.lg.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: PRIMARY,
    borderRadius: borderRadius.lg,
  },
  modalCloseText: {
    fontSize: typography.sm.fontSize,
    color: colors.white,
    fontWeight: '600',
  },
});
