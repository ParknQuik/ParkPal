import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSpotById } from '../store/slices/parkingSlice';
import { createBooking } from '../store/slices/bookingSlice';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import { colors, typography, spacing, borderRadius } from '../theme';
import { formatCurrency, formatDate, formatTime } from '../utils/helpers';
import { mockPaymentMethods } from '../services/mockData';

export const ReservationScreen: React.FC = () => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(
    mockPaymentMethods[0].id
  );
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const { spotId } = route.params as { spotId: string };
  const { selectedSpot, loading: spotLoading } = useAppSelector(
    (state) => state.parking
  );
  const { loading: bookingLoading } = useAppSelector((state) => state.booking);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchSpotById(spotId));
  }, [spotId]);

  const calculateDuration = () => {
    const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    return Math.max(1, Math.round(hours * 10) / 10);
  };

  const calculateTotal = () => {
    if (!selectedSpot) return 0;
    const duration = calculateDuration();
    return duration * selectedSpot.price;
  };

  const handleReserve = async () => {
    if (!selectedSpot || !user) return;

    const paymentMethod = mockPaymentMethods.find(
      (p) => p.id === selectedPayment
    );

    try {
      await dispatch(
        createBooking({
          spotId: selectedSpot.id,
          spotTitle: selectedSpot.title,
          spotAddress: `${selectedSpot.address}, ${selectedSpot.city}`,
          spotImage: selectedSpot.images[0],
          userId: user.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          duration: calculateDuration(),
          price: calculateTotal(),
          paymentMethod: `${paymentMethod?.label} ${paymentMethod?.details}`,
        })
      ).unwrap();

      setToastMessage('Reservation successful!');
      setShowToast(true);

      setTimeout(() => {
        navigation.navigate('Bookings' as never);
      }, 2000);
    } catch (error) {
      setToastMessage('Reservation failed. Please try again.');
      setShowToast(true);
    }
  };

  if (spotLoading || !selectedSpot) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Reserve Parking</Text>
            <Text style={styles.spotName}>{selectedSpot.title}</Text>
          </View>

          {/* Date & Time Selection */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Date & Time</Text>

            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeItem}>
                <Text style={styles.label}>Start</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(startDate.toISOString())}</Text>
                  <Text style={styles.timeText}>{formatTime(startDate.toISOString())}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateTimeItem}>
                <Text style={styles.label}>End</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(endDate.toISOString())}</Text>
                  <Text style={styles.timeText}>{formatTime(endDate.toISOString())}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (date) {
                    setStartDate(date);
                    if (date >= endDate) {
                      setEndDate(new Date(date.getTime() + 3600000));
                    }
                  }
                }}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={startDate}
                onChange={(event, date) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (date) setEndDate(date);
                }}
              />
            )}

            <View style={styles.durationContainer}>
              <Text style={styles.durationLabel}>Duration</Text>
              <Text style={styles.durationValue}>
                {calculateDuration()} hours
              </Text>
            </View>
          </Card>

          {/* Payment Method */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {mockPaymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  selectedPayment === method.id && styles.paymentOptionSelected,
                ]}
                onPress={() => setSelectedPayment(method.id)}
              >
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentLabel}>{method.label}</Text>
                  <Text style={styles.paymentDetails}>{method.details}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedPayment === method.id && styles.radioSelected,
                  ]}
                >
                  {selectedPayment === method.id && (
                    <View style={styles.radioDot} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addPaymentButton}>
              <Text style={styles.addPaymentText}>+ Add Payment Method</Text>
            </TouchableOpacity>
          </Card>

          {/* Price Summary */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Price Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {formatCurrency(selectedSpot.price)} × {calculateDuration()} hours
              </Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(calculateTotal())}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Fee</Text>
              <Text style={styles.summaryValue}>$2.00</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(calculateTotal() + 2)}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceContainer}>
          <Text style={styles.bottomPriceLabel}>Total</Text>
          <Text style={styles.bottomPrice}>
            {formatCurrency(calculateTotal() + 2)}
          </Text>
        </View>
        <Button
          title="Confirm Reservation"
          variant="gradient"
          onPress={handleReserve}
          loading={bookingLoading}
          style={styles.confirmButton}
        />
      </View>

      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastMessage.includes('successful') ? 'success' : 'error'}
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
  content: {
    padding: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  spotName: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateTimeItem: {
    flex: 1,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  dateTimeButton: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timeText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  durationLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  durationValue: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  paymentDetails: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  addPaymentButton: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  addPaymentText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  totalLabel: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  totalValue: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomPriceContainer: {
    marginRight: spacing.lg,
  },
  bottomPriceLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  bottomPrice: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1,
  },
});
