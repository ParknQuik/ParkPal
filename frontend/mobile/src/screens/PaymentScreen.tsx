import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { behaviorAPI, paymentAPI, marketplaceAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { AccountStanding } from '../components/AccountStanding';
import { BehaviorStatus } from '../types';
import {
  getSuspensionAlertMessage,
  isAccountSuspendedError,
} from '../utils/behaviorStatus';

export const PaymentScreen: React.FC = () => {
  const navigation = useNavigation() as any;
  const route = useRoute();
  const { colors } = useTheme();
  const statusBarStyle = useStatusBarStyle();
  const { bookingId, amount, spotId, spotName, spotAddress, startTime, endTime, createBookingOnSuccess, rentalMode, maxDuration } = route.params as {
    bookingId?: number;
    amount: number;
    spotId?: number | string;
    spotName?: string;
    spotAddress?: string;
    startTime?: string;
    endTime?: string;
    createBookingOnSuccess?: boolean;
    rentalMode?: 'fixed' | 'open';
    maxDuration?: number;
  };

  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [behaviorStatus, setBehaviorStatus] = useState<BehaviorStatus | null>(null);

  const refreshBehaviorStatus = async () => {
    const response = await behaviorAPI.getStatus();
    setBehaviorStatus(response.data);
    return response.data;
  };

  useEffect(() => {
    refreshBehaviorStatus().catch(() => undefined);
  }, []);

  const orderData = {
    subtotal: amount || 0,
    serviceFee: Math.round((amount || 0) * 0.05),
    total: (amount || 0) + Math.round((amount || 0) * 0.05),
  };
  const cashPolicyNote = rentalMode === 'open'
    ? 'Cash bookings still reserve the spot now. Cancel at least 1 hour before start to avoid a strike, and check in within 30 minutes of your start time.'
    : 'Cash bookings still reserve the spot now. Cancel at least 1 hour before start to avoid a strike, and check in during your reserved time.';

  const extractBookingId = (payload: any): number | undefined => {
    const id =
      payload?.booking?.id ??
      payload?.id ??
      payload?.data?.booking?.id ??
      payload?.data?.id ??
      payload?.data?.data?.booking?.id ??
      payload?.data?.data?.id;

    const numericId = Number(id);
    return Number.isFinite(numericId) ? numericId : undefined;
  };

  const createBookingIfNeeded = async (): Promise<number | undefined> => {
    if (createBookingOnSuccess && !bookingId && spotId) {
      const createResponse = await marketplaceAPI.createBookingMarketplace({
        slotId: Number(spotId),
        startTime: startTime!,
        endTime: endTime!,
        rentalMode: rentalMode as 'fixed' | 'open',
        maxDuration: rentalMode === 'open' ? maxDuration : undefined,
      });
      return extractBookingId(createResponse.data);
    }
    return bookingId;
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handlePayNow = async () => {
    if (!selectedPayment) return;

    const latestBehavior = await refreshBehaviorStatus().catch(() => behaviorStatus);
    if (latestBehavior?.isSuspended) {
      Alert.alert('Booking paused', getSuspensionAlertMessage({ response: { data: latestBehavior } }));
      return;
    }

    if (selectedPayment === 'cash') {
      try {
        setLoading(true);

        let finalBookingId: number | undefined = bookingId;

        if (createBookingOnSuccess && !bookingId && spotId) {
          finalBookingId = await createBookingIfNeeded();
        }

        if (!finalBookingId) {
          throw new Error('Failed to create booking');
        }

        const intentResponse = await paymentAPI.createPaymentIntent({
          amount: orderData.total,
          paymentMethod: 'cash',
          bookingId: finalBookingId,
        });

        const confirmResponse = await paymentAPI.confirmPayment({
          paymentIntentId: intentResponse.data.paymentIntentId,
        });

        navigation.navigate('PaymentSuccess', {
          paymentId: confirmResponse.data.payment?.id || intentResponse.data.paymentId,
          bookingId: finalBookingId,
          amount: orderData.total,
          spotName: spotName || 'Parking Spot',
          spotAddress: spotAddress || '',
          startTime: startTime || '',
          endTime: endTime || '',
          paymentMethod: selectedPayment,
          rentalMode,
        });
        return;
      } catch (err: any) {
        if (isAccountSuspendedError(err)) {
          Alert.alert('Booking paused', getSuspensionAlertMessage(err));
          refreshBehaviorStatus().catch(() => undefined);
          return;
        }

        if (err.response?.status === 409) {
          navigation.navigate('PaymentFailed', {
            error: err.response?.data?.error || 'This slot is already booked for the selected time. Please go back and choose different times.',
            bookingId: bookingId,
          });
          return;
        }

        navigation.navigate('PaymentFailed', {
          error: err.response?.data?.error || err.message || 'Failed to confirm booking. Please try again.',
          bookingId: bookingId,
        });
        return;
      } finally {
        setLoading(false);
      }
    }

    let finalBookingId: number | undefined = bookingId;
    setLoading(true);
    try {
      if (createBookingOnSuccess && !bookingId && spotId) {
        finalBookingId = await createBookingIfNeeded();
      }

      if (!finalBookingId) {
        throw new Error('Failed to create booking');
      }

      const intentResponse = await paymentAPI.createPaymentIntent({
        amount: orderData.total,
        paymentMethod: selectedPayment as 'cash' | 'gcash' | 'card' | 'grab_pay' | 'paymaya',
        bookingId: finalBookingId,
      });

      const { paymentIntentId } = intentResponse.data;

      const confirmResponse = await paymentAPI.confirmPayment({
        paymentIntentId,
      });

      navigation.navigate('PaymentSuccess', {
        paymentId: confirmResponse.data.paymentId || paymentIntentId,
        bookingId: finalBookingId,
        amount: orderData.total,
        spotName: spotName || 'Parking Spot',
        spotAddress: spotAddress || '',
        startTime: startTime || '',
        endTime: endTime || '',
        paymentMethod: selectedPayment,
        rentalMode,
      });
    } catch (err: any) {
      if (isAccountSuspendedError(err)) {
        Alert.alert('Booking paused', getSuspensionAlertMessage(err));
        refreshBehaviorStatus().catch(() => undefined);
        return;
      }

      if (err.response?.status === 409) {
        Alert.alert(
          'Slot Unavailable',
          err.response?.data?.error || 'This slot is already booked for the selected time. Please go back and choose different times.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      navigation.navigate('PaymentFailed', {
        error: err.response?.data?.error || err.message || 'Payment failed',
        bookingId: finalBookingId,
      });
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: 'cash', description: 'Pay with cash at location' },
    { id: 'gcash', name: 'GCash', icon: 'cellphone', description: 'Pay with GCash e-wallet' },
    { id: 'card', name: 'Credit/Debit Card', icon: 'credit-card-outline', description: 'Visa, Mastercard, Amex' },
    { id: 'grab_pay', name: 'GrabPay', icon: 'wallet-outline', description: 'Pay with GrabPay' },
    { id: 'paymaya', name: 'Maya', icon: 'wallet-plus-outline', description: 'Pay with Maya e-wallet' },
  ];

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      backgroundColor: colors.appHeaderBackground,
    },
    contentArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    priceCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginHorizontal: 16,
      marginTop: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    priceLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    priceValue: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    totalValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.primary,
    },
    paymentSection: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 20,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    paymentOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    paymentOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    paymentOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    paymentIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${colors.primary}12`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    paymentTextContainer: {
      flex: 1,
    },
    paymentName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    paymentDescription: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    radioOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioOuterSelected: {
      borderColor: colors.primary,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    cashPolicyNote: {
      flexDirection: 'row',
      backgroundColor: `${colors.warning}15`,
      borderWidth: 1,
      borderColor: `${colors.warning}80`,
      borderRadius: 12,
      padding: 14,
      marginTop: 4,
    },
    cashPolicyIcon: {
      marginRight: 10,
      marginTop: 1,
    },
    cashPolicyContent: {
      flex: 1,
    },
    cashPolicyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    cashPolicyText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    standingWrap: {
      marginHorizontal: 16,
      marginTop: 16,
    },
    footer: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    payButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    payButtonDisabled: {
      backgroundColor: colors.border,
    },
    payButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.white,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.appHeaderBackground} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader title="Payment" onBack={handleBack} />
      </SafeAreaView>

      <View style={styles.contentArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {behaviorStatus && (behaviorStatus.totalStrikes > 0 || behaviorStatus.isSuspended) && (
          <View style={styles.standingWrap}>
            <AccountStanding status={behaviorStatus} surface="banner" testID="payment-account-standing" />
          </View>
        )}

        {/* Price Breakdown */}
        <View style={styles.priceCard}>
          <Text style={styles.sectionTitle}>Price Details</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₱{orderData.subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service Fee</Text>
            <Text style={styles.priceValue}>₱{orderData.serviceFee.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{orderData.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentOption,
                selectedPayment === method.id && styles.paymentOptionSelected,
              ]}
              onPress={() => setSelectedPayment(method.id)}
            >
              <View style={styles.paymentOptionContent}>
                <View style={styles.paymentIconContainer}>
                  <MaterialCommunityIcons
                    name={method.icon as any}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.paymentTextContainer}>
                  <Text style={styles.paymentName}>{method.name}</Text>
                  <Text style={styles.paymentDescription}>{method.description}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  selectedPayment === method.id && styles.radioOuterSelected,
                ]}
              >
                {selectedPayment === method.id && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          {selectedPayment === 'cash' && (
            <View style={styles.cashPolicyNote}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={20}
                color={colors.warning}
                style={styles.cashPolicyIcon}
              />
              <View style={styles.cashPolicyContent}>
                <Text style={styles.cashPolicyTitle}>Cash booking policy</Text>
                <Text style={styles.cashPolicyText}>{cashPolicyNote}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Pay Now Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedPayment || loading || behaviorStatus?.isSuspended) && styles.payButtonDisabled,
          ]}
          onPress={handlePayNow}
          disabled={!selectedPayment || loading || behaviorStatus?.isSuspended}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.payButtonText}>
              Pay ₱{orderData.total.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      </View>
    </View>
  );
};
