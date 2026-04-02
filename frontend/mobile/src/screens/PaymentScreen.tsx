import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { paymentAPI } from '../services/api';

const PRIMARY = '#10b77f';
const BACKGROUND = '#f6f6f8';

export const PaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookingId, amount } = route.params as { bookingId: number; amount: number; spotId?: number };

  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const orderData = {
    subtotal: amount || 0,
    serviceFee: Math.round((amount || 0) * 0.05),
    total: (amount || 0) + Math.round((amount || 0) * 0.05),
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handlePayNow = async () => {
    if (!selectedPayment) return;

    setLoading(true);
    try {
      const intentResponse = await paymentAPI.createPaymentIntent({
        amount: orderData.total,
        paymentMethod: selectedPayment as 'gcash' | 'card' | 'grab_pay' | 'paymaya',
        bookingId,
      });

      const { paymentIntentId, clientSecret } = intentResponse.data;

      const confirmResponse = await paymentAPI.confirmPayment({
        paymentIntentId,
      });

      navigation.navigate('PaymentSuccess' as never, {
        paymentId: confirmResponse.data.paymentId || paymentIntentId,
        bookingId,
      } as never);
    } catch (err: any) {
      navigation.navigate('PaymentFailed' as never, {
        error: err.response?.data?.error || err.message || 'Payment failed',
        bookingId,
      } as never);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: 'gcash', name: 'GCash', icon: '💚', description: 'Pay with GCash e-wallet' },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳', description: 'Visa, Mastercard, Amex' },
    { id: 'grab_pay', name: 'GrabPay', icon: '🟢', description: 'Pay with GrabPay' },
    { id: 'paymaya', name: 'Maya', icon: '🔵', description: 'Pay with Maya e-wallet' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Text style={styles.headerButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.headerButton} />
        </View>

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
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.payButtonText}>
              Pay ₱{orderData.total.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 24,
    color: '#1e293b',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  priceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
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
    color: '#64748b',
  },
  priceValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY,
  },
  paymentSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY + '10',
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
    color: '#1e293b',
    marginBottom: 2,
  },
  paymentDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: PRIMARY,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PRIMARY,
  },
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  payButton: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
});
