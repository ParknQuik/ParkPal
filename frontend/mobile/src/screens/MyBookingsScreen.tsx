import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchBookings, cancelBooking } from '../store/slices/bookingSlice';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Toast } from '../components/Toast';
import { colors, typography, spacing, borderRadius } from '../theme';
import {
  formatCurrency,
  formatDate,
  formatTime,
  getBookingStatusColor,
} from '../utils/helpers';
import { Booking } from '../types';

export const MyBookingsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { bookings, loading } = useAppSelector((state) => state.booking);

  useEffect(() => {
    if (user) {
      dispatch(fetchBookings(user.id));
    }
  }, [user]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await dispatch(cancelBooking(bookingId)).unwrap();
      setToastMessage('Booking cancelled successfully');
      setShowToast(true);
    } catch (error) {
      setToastMessage('Failed to cancel booking');
      setShowToast(true);
    }
  };

  const activeBookings = bookings.filter(
    (b) => b.status === 'active' || b.status === 'upcoming'
  );
  const historyBookings = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled'
  );

  const currentBookings =
    activeTab === 'active' ? activeBookings : historyBookings;

  const renderBookingCard = (booking: Booking) => {
    const statusColors = getBookingStatusColor(booking.status);
    const isActive = booking.status === 'active';
    const isUpcoming = booking.status === 'upcoming';
    const canCancel = isActive || isUpcoming;

    return (
      <Card key={booking.id} style={styles.bookingCard}>
        <View style={styles.cardHeader}>
          <Image
            source={{ uri: booking.spotImage }}
            style={styles.spotImage}
            resizeMode="cover"
          />
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.spotTitle} numberOfLines={1}>
              {booking.spotTitle}
            </Text>
            <Text style={styles.spotAddress} numberOfLines={1}>
              {booking.spotAddress}
            </Text>
            <Badge
              text={booking.status}
              variant={
                booking.status === 'active'
                  ? 'success'
                  : booking.status === 'upcoming'
                  ? 'info'
                  : booking.status === 'completed'
                  ? 'default'
                  : 'error'
              }
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Start</Text>
            <Text style={styles.detailValue}>{formatDate(booking.startDate)}</Text>
            <Text style={styles.detailTime}>{formatTime(booking.startDate)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>End</Text>
            <Text style={styles.detailValue}>{formatDate(booking.endDate)}</Text>
            <Text style={styles.detailTime}>{formatTime(booking.endDate)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.paymentLabel}>Payment</Text>
            <Text style={styles.paymentValue}>{booking.paymentMethod}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatCurrency(booking.price)}</Text>
          </View>
        </View>

        {isUpcoming && (
          <Button
            title="Scan QR to Check In"
            variant="gradient"
            onPress={() =>
              navigation.navigate('QRScanner' as never, {
                mode: 'checkin',
                bookingId: booking.id,
              } as never)
            }
            style={styles.checkInButton}
          />
        )}

        {isActive && (
          <View style={styles.qrContainer}>
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrText}>Parking Session Active</Text>
              <Text style={styles.qrCode}>{booking.qrCode}</Text>
            </View>
            <Text style={styles.qrInstruction}>
              You are currently parked. Scan QR again to check out.
            </Text>
            <Button
              title="Scan QR to Check Out"
              variant="outline"
              onPress={() =>
                navigation.navigate('QRScanner' as never, {
                  mode: 'checkout',
                  sessionId: booking.id,
                } as never)
              }
              style={styles.checkOutButton}
            />
          </View>
        )}

        {canCancel && !isActive && (
          <Button
            title="Cancel Booking"
            variant="outline"
            onPress={() => handleCancelBooking(booking.id)}
            style={styles.cancelButton}
          />
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText,
            ]}
          >
            Active ({activeBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && styles.activeTabText,
            ]}
          >
            History ({historyBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <LoadingSpinner />
        ) : currentBookings.length === 0 ? (
          <EmptyState
            title={`No ${activeTab} bookings`}
            message={
              activeTab === 'active'
                ? 'Your active reservations will appear here'
                : 'Your booking history will appear here'
            }
          />
        ) : (
          currentBookings.map(renderBookingCard)
        )}
      </ScrollView>

      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastMessage.includes('successfully') ? 'success' : 'error'}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    flexGrow: 1,
  },
  bookingCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  spotImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: spacing.lg,
    justifyContent: 'space-between',
  },
  spotTitle: {
    ...typography.h6,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  spotAddress: {
    ...typography.small,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  detailTime: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  paymentValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
  },
  qrContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  qrText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  qrCode: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  qrInstruction: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  checkInButton: {
    marginTop: spacing.lg,
  },
  checkOutButton: {
    marginTop: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.lg,
  },
});
