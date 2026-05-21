import React, { useState } from 'react';
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
import { paymentAPI, marketplaceAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';

export const PaymentScreen: React.FC = () => {
  const navigation = useNavigation() as any;
  const route = useRoute();
  const { colors } = useTheme();
  const statusBarStyle = useStatusBarStyle();
  const { bookingId, amount, spotId, spotName, spotAddress, startTime, endTime, createBookingOnSuccess, rentalMode, maxDuration } = route.params as {
    bookingId: number;
    amount: number;
    spotId?: number;
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

  const orderData = {
    subtotal: amount || 0,
    serviceFee: Math.round((amount || 0) * 0.05),
    total: (amount || 0) + Math.round((amount || 0) * 0.05),
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
      const rawData = createResponse.data;
      return rawData?.id || rawData?.data?.id || rawData?.data?.data?.id || rawData?.booking?.id;
    }
    return bookingId;
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handlePayNow = async () => {
    if (!selectedPayment) return;

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

        const response = await marketplaceAPI.confirmBooking(finalBookingId);

Alert.alert(
           'Booking Confirmed!',
           'Please pay in cash when you arrive at the parking location.',
           [{ text: 'OK', onPress: () => navigation.navigate('PaymentSuccess', {
             paymentId: bookingId,
             bookingId,
             amount: orderData.total,
             spotName: spotName || 'Parking Spot',
             spotAddress: spotAddress || '',
             startTime: startTime || '',
             endTime: endTime || '',
             paymentMethod: selectedPayment,
             rentalMode,
           }) }]
         );
        return;
     } catch (err: any) {
         if (err.response?.status === 409) {
          Alert.alert(
            'Slot Unavailable',
            err.response?.data?.error || 'This slot is already booked for the selected time. Please go back and choose different times.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }

        Alert.alert('Error', err.message || 'Failed to confirm booking. Please try again.');
        return;
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    try {
      let finalBookingId: number | undefined = bookingId;

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

      const { paymentIntentId, clientSecret } = intentResponse.data;

      const confirmResponse = await paymentAPI.confirmPayment({
        paymentIntentId,
      });

navigation.navigate('PaymentSuccess', {
         paymentId: confirmResponse.data.paymentId || paymentIntentId,
         bookingId,
         amount: orderData.total,
         spotName: spotName || 'Parking Spot',
         spotAddress: spotAddress || '',
         startTime: startTime || '',
         endTime: endTime || '',
         paymentMethod: selectedPayment,
         rentalMode,
       });
     } catch (err: any) {

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
         bookingId: bookingId,
       });
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: '💵', description: 'Pay with cash at location' },
    { id: 'gcash', name: 'GCash', icon: '💚', description: 'Pay with GCash e-wallet' },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳', description: 'Visa, Mastercard, Amex' },
    { id: 'grab_pay', name: 'GrabPay', icon: '🟢', description: 'Pay with GrabPay' },
    { id: 'paymaya', name: 'Maya', icon: '🔵', description: 'Pay with Maya e-wallet' },
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
    paymentIcon: {
      fontSize: 28,
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
                <Text style={styles.paymentIcon}>{method.icon}</Text>
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
        </View>
      </ScrollView>

      {/* Pay Now Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedPayment || loading) && styles.payButtonDisabled,
          ]}
          onPress={handlePayNow}
          disabled={!selectedPayment || loading}
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
