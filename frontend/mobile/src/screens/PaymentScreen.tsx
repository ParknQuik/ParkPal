import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, PayMongoPaymentMethod } from '../types';
import { paymentAPI } from '../services/api';

type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'Payment'>;
type PaymentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Payment'>;

export const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<PaymentScreenNavigationProp>();
  const route = useRoute<PaymentScreenRouteProp>();
  const { bookingId, amount } = route.params;

  const [selectedMethod, setSelectedMethod] = useState<PayMongoPaymentMethod>('gcash');
  const [loading, setLoading] = useState(false);

  const paymentMethods: Array<{
    id: PayMongoPaymentMethod;
    name: string;
    description: string;
    icon: string;
  }> = [
    {
      id: 'gcash',
      name: 'GCash',
      description: 'Most popular in Philippines',
      icon: '💰',
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard',
      icon: '💳',
    },
    {
      id: 'grab_pay',
      name: 'GrabPay',
      description: 'Pay with GrabPay wallet',
      icon: '🚗',
    },
    {
      id: 'paymaya',
      name: 'PayMaya',
      description: 'Digital wallet',
      icon: '🏦',
    },
  ];

  const handlePayment = async () => {
    try {
      setLoading(true);

      // Create payment intent
      const response = await paymentAPI.createPaymentIntent({
        bookingId,
        amount,
        paymentMethod: selectedMethod,
      });

      const { paymentIntentId, clientKey } = response.data;

      // For GCash/GrabPay/PayMaya - redirect to payment page
      if (selectedMethod === 'gcash' || selectedMethod === 'grab_pay' || selectedMethod === 'paymaya') {
        // In production, you would use PayMongo SDK here
        // For now, show alert with instructions
        Alert.alert(
          'Complete Payment',
          `Payment Intent created!\n\nPayment ID: ${paymentIntentId}\n\nIn production, you would be redirected to ${selectedMethod.toUpperCase()} to complete payment.`,
          [
            {
              text: 'Simulate Success',
              onPress: () => simulatePaymentSuccess(paymentIntentId),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setLoading(false),
            },
          ]
        );
      } else if (selectedMethod === 'card') {
        // For card payments - would show card input form
        Alert.alert(
          'Card Payment',
          'Card payment UI would be shown here using PayMongo SDK.',
          [
            {
              text: 'Simulate Success',
              onPress: () => simulatePaymentSuccess(paymentIntentId),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setLoading(false),
            },
          ]
        );
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert(
        'Payment Failed',
        error.response?.data?.error || error.message || 'Failed to create payment'
      );
    }
  };

  const simulatePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Confirm payment with backend
      const confirmResponse = await paymentAPI.confirmPayment({ paymentIntentId });
      const { paymentId, status } = confirmResponse.data;

      setLoading(false);

      if (status === 'completed') {
        navigation.replace('PaymentSuccess', { paymentId, bookingId });
      } else {
        navigation.replace('PaymentFailed', {
          error: `Payment ${status}`,
          bookingId,
        });
      }
    } catch (error: any) {
      setLoading(false);
      navigation.replace('PaymentFailed', {
        error: error.response?.data?.error || error.message || 'Payment confirmation failed',
        bookingId,
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Amount Summary */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amount}>₱{amount.toFixed(2)}</Text>
          <Text style={styles.amountSubtext}>Booking #{bookingId}</Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardSelected,
              ]}
              onPress={() => setSelectedMethod(method.id)}
              disabled={loading}
            >
              <View style={styles.methodIcon}>
                <Text style={styles.methodIconText}>{method.icon}</Text>
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodDescription}>{method.description}</Text>
              </View>
              {selectedMethod === method.id && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedIndicatorText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            You'll be redirected to complete your payment securely. Your booking will be confirmed
            once payment is successful.
          </Text>
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Payments powered by PayMongo - Secure & PCI-DSS compliant
          </Text>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.payButtonText}>Pay ₱{amount.toFixed(2)}</Text>
              <Text style={styles.payButtonSubtext}>with {paymentMethods.find(m => m.id === selectedMethod)?.name}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  amountContainer: {
    backgroundColor: '#4CAF50',
    padding: 30,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  amount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  amountSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 8,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  methodCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8f4',
  },
  methodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodIconText: {
    fontSize: 24,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 13,
    color: '#666',
  },
  selectedIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 10,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  payButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  payButtonSubtext: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
});
