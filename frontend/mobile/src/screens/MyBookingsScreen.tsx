import React, { useState, useCallback } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { getMyBookings } from '../store/slices/marketplaceSlice';
import { marketplaceAPI, paymentAPI } from '../services/api';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { AppHeader } from '../components/AppHeader';
import { ListLoadingState, RetryableFailureState } from '../components/ListState';

const PRIMARY = '#10b77f';

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
    case 'completed':
      return PRIMARY;
    case 'cancelled':
    case 'expired':
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
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';
    default:
      return status;
  }
};

const getActionButtonText = (status: string) => {
  switch (status) {
    case 'confirmed':
    case 'active':
      return 'View Details';
    case 'completed':
      return 'Rate';
    default:
      return 'View Details';
  }
};

const formatBookingDate = (startTime: string, endTime: string | null, rentalMode: string) => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

  if (rentalMode === 'open' || !end) {
    return `${start.toLocaleDateString('en-US', opts)}, ${start.toLocaleTimeString('en-US', timeOpts)} (Open)`;
  }

  return `${start.toLocaleDateString('en-US', opts)}, ${start.toLocaleTimeString('en-US', timeOpts)} - ${end.toLocaleTimeString('en-US', timeOpts)}`;
};

export const MyBookingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const statusBarStyle = useStatusBarStyle();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedHours, setSelectedHours] = useState(1);
  const [extensionAvailability, setExtensionAvailability] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [extending, setExtending] = useState(false);

  const { bookings, loading, error } = useAppSelector((state) => state.marketplace);
  const showInitialLoading = loading && !refreshing && bookings.length === 0;
  const showInitialFailure = Boolean(error) && bookings.length === 0;

  const fetchBookings = useCallback(async () => {
    try {
      await dispatch(getMyBookings()).unwrap();
    } catch (err) {
      ;
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  const handleAction = useCallback(
    (booking: any) => {
      if (booking.status === 'pending') {
        (navigation.navigate as any)('Payment', {
          bookingId: booking.id,
          amount: booking.totalAmount,
          spotName: booking.spot?.title || booking.spot?.address || 'Parking Spot',
          spotAddress: booking.spot?.address || '',
          startTime: booking.startTime,
          endTime: booking.endTime,
        });
      } else {
        (navigation.navigate as any)('ParkingDetail', {
          spotId: booking.slotId,
          fromBooking: true,
          bookingId: booking.id,
          bookingStatus: booking.status,
          startTime: booking.startTime,
          endTime: booking.endTime,
          totalAmount: booking.totalAmount,
          rentalMode: booking.rentalMode,
        });
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
              } catch (err: any) {
                const errorMessage = err.response?.data?.error || 'Failed to cancel booking. Please try again.';
                ;
                Alert.alert('Cannot Cancel Booking', errorMessage);
              }
            },
          },
        ],
      );
    },
    [fetchBookings],
  );

  const handleOpenExtendModal = useCallback(async (booking: any) => {
    setSelectedBooking(booking);
    setSelectedHours(1);
    setExtendModalVisible(true);

    // Check initial availability for 1 hour
    await checkExtensionAvailability(booking.id, 1);
  }, []);

  const checkExtensionAvailability = async (bookingId: number, hours: number) => {
    try {
      setCheckingAvailability(true);
      const response = await marketplaceAPI.checkExtensionAvailability(bookingId, hours);
      setExtensionAvailability(response.data);
    } catch (err: any) {
      ;
      Alert.alert('Error', 'Failed to check extension availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleExtendBooking = async () => {
    if (!selectedBooking || !extensionAvailability?.available) return;

    try {
      setExtending(true);

      // Create payment intent for extension
      const paymentResponse = await paymentAPI.createPaymentIntent({
        amount: extensionAvailability.pricing.total,
        paymentMethod: 'card', // Use user's saved payment method
        bookingId: selectedBooking.id,
      });

      // Confirm payment
      await paymentAPI.confirmPayment({
        paymentIntentId: paymentResponse.data.paymentIntentId,
      });

      // Extend booking
      await marketplaceAPI.extendBooking(selectedBooking.id, {
        hours: selectedHours,
        paymentIntentId: paymentResponse.data.paymentIntentId,
      });

      Alert.alert(
        'Booking Extended!',
        `Your booking has been extended by ${selectedHours} hour(s). New end time: ${new Date(extensionAvailability.requestedEndTime).toLocaleString()}`
      );

      setExtendModalVisible(false);
      await fetchBookings(); // Refresh bookings list
    } catch (err: any) {
      ;
      Alert.alert('Extension Failed', err.response?.data?.error || 'Failed to extend booking. Please try again.');
    } finally {
      setExtending(false);
    }
  };

  const handleHoursChange = async (hours: number) => {
    setSelectedHours(hours);
    if (selectedBooking) {
      await checkExtensionAvailability(selectedBooking.id, hours);
    }
  };

  const handleShowQR = useCallback((booking: any) => {
    const qrData = booking.qrCode || String(booking.id);
    setQrCodeData(qrData);
    setQrModalVisible(true);
  }, []);

  const handleScanQR = useCallback(
    (booking: any) => {
      const mode = booking.status === 'active' ? 'checkout' : 'checkin';
      navigation.navigate('QRScanner', {
        mode,
        bookingId: booking.id,
      });
    },
    [navigation],
  );

  const filteredBookings = bookings.filter((booking) => {
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const hasSession = booking.sessionId != null;

    if (activeTab === 'upcoming') {
      // Upcoming: pending bookings with startTime > now
      //          confirmed bookings with startTime > now (future confirmed)
      //          confirmed bookings with startTime <= now AND no session yet (not scanned)
      //          active bookings with endTime > now (currently parked, not ended yet)
      return (booking.status === 'pending' && startTime > now) ||
             (booking.status === 'confirmed' && startTime > now) ||
             (booking.status === 'confirmed' && startTime <= now && !hasSession) ||
             (booking.status === 'active' && endTime > now);
    }
    if (activeTab === 'completed') {
      // Completed: status is completed
      //          OR status is expired
      //          OR (status is active AND endTime has passed - session ended)
      return booking.status === 'completed' ||
             booking.status === 'expired' ||
             (booking.status === 'active' && endTime <= now);
    }
    if (activeTab === 'cancelled') {
      return booking.status === 'cancelled';
    }
    return true;
  });

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
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
      backgroundColor: colors.surface,
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
      backgroundColor: colors.surface,
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
      backgroundColor: colors.surface,
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
      backgroundColor: colors.surface,
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
      marginTop: 1,
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
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    cardActionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: `${colors.accent}15`,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      gap: 4,
    },
    rateButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: typography.md.fontSize,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    stateContainer: {
      flex: 1,
      padding: spacing.xl,
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
    scanQRButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: borderRadius.lg,
      backgroundColor: PRIMARY,
      gap: 6,
      shadowColor: PRIMARY,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    scanQRButtonCheckout: {
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
    },
    scanQRButtonText: {
      fontSize: typography.sm.fontSize,
      fontWeight: '700',
      color: colors.white,
    },
    cancelButton: {
      marginTop: spacing.sm,
      paddingVertical: 10,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: typography.sm.fontSize,
      fontWeight: '600',
      color: colors.error,
    },
    cancelButtonDisabled: {
      backgroundColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      opacity: 0.6,
      marginTop: spacing.sm,
    },
    cancelButtonDisabledText: {
      color: colors.text,
      fontSize: 12,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
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
    extendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accent,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 6,
    },
    extendButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    extensionModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    extensionModalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    extensionModalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    extensionModalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    extensionModalLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    hoursContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    hourButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    hourButtonActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    hourButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    hourButtonTextActive: {
      color: colors.primary,
    },
    availabilityBox: {
      backgroundColor: `${colors.success}10`,
      borderRadius: 8,
      padding: 16,
      marginBottom: 20,
    },
    availabilityTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.success,
      marginBottom: 4,
    },
    availabilityText: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 12,
    },
    unavailableBox: {
      backgroundColor: `${colors.error}10`,
      borderRadius: 8,
      padding: 16,
      marginBottom: 20,
    },
    unavailableTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.error,
      marginBottom: 4,
    },
    unavailableText: {
      fontSize: 14,
      color: colors.text,
      marginTop: 4,
    },
    pricingBox: {
      gap: 8,
    },
    pricingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    pricingLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    pricingValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    pricingTotal: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      marginTop: 4,
    },
    pricingTotalLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    pricingTotalValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
    },
    extensionModalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    extensionModalCancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    extensionModalCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    extensionModalConfirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    extensionModalConfirmButtonDisabled: {
      opacity: 0.5,
    },
    extensionModalConfirmText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
       <StatusBar barStyle={`${statusBarStyle}-content`} backgroundColor={colors.surface} />

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

      {showInitialLoading ? (
        <View style={styles.stateContainer}>
          <ListLoadingState
            variant="booking"
            accessibilityLabel="Loading bookings"
            testID="my-bookings-loading-skeleton"
          />
        </View>
      ) : showInitialFailure ? (
        <View style={styles.stateContainer}>
          <RetryableFailureState
            title="Unable to load bookings"
            message={error || 'Something went wrong while loading your bookings. Please try again.'}
            retryLabel="Retry loading bookings"
            onRetry={fetchBookings}
            testID="my-bookings-failure"
          />
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
          const buttonColor = booking.status === 'completed' ? colors.accent : PRIMARY;
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
                    <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textSecondary} style={styles.dateIcon} />
                    <Text style={styles.dateText}>{formatBookingDate(booking.startTime, booking.endTime, booking.rentalMode)}</Text>
                  </View>
                  {booking.listingAddress && (
                    <View style={styles.dateContainer}>
                      <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textSecondary} style={styles.dateIcon} />
                      <Text style={styles.dateText} numberOfLines={1}>{booking.listingAddress}</Text>
                    </View>
                  )}
                  <View style={styles.dateContainer}>
                    <MaterialCommunityIcons name="currency-php" size={14} color={colors.textSecondary} style={styles.dateIcon} />
                    <Text style={styles.dateText}>₱{(booking.totalAmount || 0).toFixed(2)}</Text>
                  </View>
                </View>
                {booking.listingPhoto ? (
                  <Image source={{ uri: booking.listingPhoto }} style={styles.cardImage} contentFit="cover" transition={200} />
                ) : (
                  <View style={[styles.cardImage, styles.placeholderImage]}>
                    <MaterialCommunityIcons name="car-outline" size={32} color="#94a3b8" />
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                {/* Row 1: QR + Extend (only for confirmed/active) */}
                {(booking.status === 'confirmed' || booking.status === 'active') && new Date(booking.startTime) > new Date() && (
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.scanQRButton,
                        booking.status === 'active' && styles.scanQRButtonCheckout,
                      ]}
                      onPress={() => handleScanQR(booking)}
                    >
                      <MaterialCommunityIcons name="qrcode-scan" size={16} color="#fff" />
                      <Text style={styles.scanQRButtonText}>
                        {booking.status === 'active' ? 'Check-Out' : 'Check-In'}
                      </Text>
                    </TouchableOpacity>
                    {booking.rentalMode === 'fixed' && new Date(booking.endTime) > new Date() && (
                      <TouchableOpacity
                        style={styles.extendButton}
                        onPress={() => handleOpenExtendModal(booking)}
                      >
                        <MaterialCommunityIcons name="clock-plus-outline" size={16} color="#fff" />
                        <Text style={styles.extendButtonText}>Extend</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: buttonColor }]}
                      onPress={() => handleAction(booking)}
                    >
                      <Text style={styles.actionButtonText}>{buttonText}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                {/* Row for completed/cancelled: just the action button */}
                {((booking.status !== 'confirmed' && booking.status !== 'active') || (booking.status === 'confirmed' && new Date(booking.startTime) <= new Date())) && (
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: buttonColor }]}
                      onPress={() => handleAction(booking)}
                    >
                      <Text style={styles.actionButtonText}>{buttonText}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={16} color="#fff" />
                    </TouchableOpacity>
                    {booking.status === 'completed' && (
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => (navigation.navigate as any)('WriteReview', { spotId: booking.slotId })}
                      >
                        <MaterialCommunityIcons name="star-outline" size={18} color={colors.accent} />
                        <Text style={styles.rateButtonText}>Rate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              {(() => {
                if (
                  booking.status === 'active' ||
                  booking.status === 'completed' ||
                  booking.status === 'cancelled' ||
                  booking.status === 'expired'
                ) return null;

                const now = new Date();
                const startTime = new Date(booking.startTime);
                const cancellationDeadline = new Date(startTime.getTime() - 30 * 60 * 1000); // 30 min before
                const canCancel = booking.status === 'pending' || now < cancellationDeadline;

                if (!canCancel) {
                  return (
                    <View style={styles.cancelButtonDisabled}>
                      <Text style={styles.cancelButtonDisabledText}>
                        Cancellation unavailable (within 30 min of start)
                      </Text>
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelBooking(String(booking.id))}
                  >
                    <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          );
        }}
        contentContainerStyle={styles.bookingsListContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
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

      {/* Extension Modal */}
      <Modal
        visible={extendModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExtendModalVisible(false)}
      >
        <View style={styles.extensionModalOverlay}>
          <View style={styles.extensionModalContent}>
            <Text style={styles.extensionModalTitle}>Extend Booking Time</Text>

            {selectedBooking && (
              <>
                <Text style={styles.extensionModalSubtitle}>
                  Current end: {new Date(selectedBooking.endTime).toLocaleString()}
                </Text>

                <Text style={styles.extensionModalLabel}>Select extension duration:</Text>

                <View style={styles.hoursContainer}>
                  {[1, 2, 3, 4].map((hours) => (
                    <TouchableOpacity
                      key={hours}
                      style={[
                        styles.hourButton,
                        selectedHours === hours && styles.hourButtonActive,
                      ]}
                      onPress={() => handleHoursChange(hours)}
                    >
                      <Text style={[
                        styles.hourButtonText,
                        selectedHours === hours && styles.hourButtonTextActive,
                      ]}>
                        +{hours}hr{hours > 1 ? 's' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {checkingAvailability ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
                ) : extensionAvailability ? (
                  extensionAvailability.available ? (
                    <View style={styles.availabilityBox}>
                      <Text style={styles.availabilityTitle}>Available</Text>
                      <Text style={styles.availabilityText}>
                        New end: {new Date(extensionAvailability.requestedEndTime).toLocaleString()}
                      </Text>
                      <View style={styles.pricingBox}>
                        <View style={styles.pricingRow}>
                          <Text style={styles.pricingLabel}>Extension ({selectedHours}hr{selectedHours > 1 ? 's' : ''})</Text>
                          <Text style={styles.pricingValue}>₱{extensionAvailability.pricing.extensionCost.toFixed(2)}</Text>
                        </View>
                        <View style={styles.pricingRow}>
                          <Text style={styles.pricingLabel}>Service Fee</Text>
                          <Text style={styles.pricingValue}>₱{extensionAvailability.pricing.serviceFee.toFixed(2)}</Text>
                        </View>
                        <View style={styles.pricingRow}>
                          <Text style={styles.pricingLabel}>Tax</Text>
                          <Text style={styles.pricingValue}>₱{extensionAvailability.pricing.tax.toFixed(2)}</Text>
                        </View>
                        <View style={[styles.pricingRow, styles.pricingTotal]}>
                          <Text style={styles.pricingTotalLabel}>Total</Text>
                          <Text style={styles.pricingTotalValue}>₱{extensionAvailability.pricing.total.toFixed(2)}</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.unavailableBox}>
                      <Text style={styles.unavailableTitle}>Unavailable</Text>
                      <Text style={styles.unavailableText}>
                        This slot is booked by another user during the requested extension time.
                      </Text>
                      {extensionAvailability.conflictingBooking && (
                        <Text style={styles.unavailableText}>
                          Next booking starts: {new Date(extensionAvailability.conflictingBooking.startTime).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  )
                ) : null}

                <View style={styles.extensionModalActions}>
                  <TouchableOpacity
                    style={styles.extensionModalCancelButton}
                    onPress={() => setExtendModalVisible(false)}
                  >
                    <Text style={styles.extensionModalCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.extensionModalConfirmButton,
                      (!extensionAvailability?.available || extending) && styles.extensionModalConfirmButtonDisabled,
                    ]}
                    onPress={handleExtendBooking}
                    disabled={!extensionAvailability?.available || extending}
                  >
                    {extending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.extensionModalConfirmText}>
                        Extend & Pay ₱{extensionAvailability?.pricing?.total?.toFixed(2) || '0.00'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
