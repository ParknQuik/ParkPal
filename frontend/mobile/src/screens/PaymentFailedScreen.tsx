import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { colors } from '../theme';

const orderData = {
  image: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=400',
  name: 'Downtown Secure Parking',
  address: '123 Main Street, Downtown, CA 90210',
  checkIn: 'Mar 20, 2026',
  checkInTime: '10:00 AM',
  checkOut: 'Mar 22, 2026',
  checkOutTime: '10:00 AM',
  subtotal: 75.00,
  serviceFee: 10.00,
  total: 85.00,
};

export const PaymentFailedScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { error, bookingId } = route.params as { error: string; bookingId: number };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleTryAgain = () => {
    navigation.goBack();
  };

  const handleUseDifferentPayment = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Text style={styles.headerButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Failed</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Error Icon */}
        <View style={styles.errorIconContainer}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIconText}>✕</Text>
          </View>
        </View>

        {/* Error Heading */}
        <Text style={styles.errorHeading}>Payment Failed</Text>

        {/* Error Message */}
        <Text style={styles.errorMessage}>
          {error || 'There was an issue processing your payment'}
        </Text>

        {/* Order Details Card */}
        <View style={styles.orderCard}>
          <Image
            source={{ uri: orderData.image }}
            style={styles.orderImage}
            resizeMode="cover"
          />
          <View style={styles.orderInfo}>
            <Text style={styles.orderName}>{orderData.name}</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>{orderData.address}</Text>
            </View>
          </View>

          <View style={styles.datesContainer}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateValue}>{orderData.checkIn}</Text>
              <Text style={styles.timeValue}>{orderData.checkInTime}</Text>
            </View>
            <View style={styles.dateArrow}>
              <Text style={styles.dateArrowText}>→</Text>
            </View>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateValue}>{orderData.checkOut}</Text>
              <Text style={styles.timeValue}>{orderData.checkOutTime}</Text>
            </View>
          </View>

          <View style={styles.divider} />

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
      </ScrollView>

      {/* Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.tryAgainButton}
          onPress={handleTryAgain}
        >
          <Text style={styles.tryAgainButtonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.differentPaymentButton}
          onPress={handleUseDifferentPayment}
        >
          <Text style={styles.differentPaymentButtonText}>
            Use Different Payment
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  errorIconContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconText: {
    fontSize: 40,
    color: '#ffffff',
    fontWeight: '700',
  },
  errorHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: 16,
  },
  orderInfo: {
    marginBottom: 16,
  },
  orderName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6,
    marginTop: 2,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  datesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  dateBlock: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 12,
    color: '#64748b',
  },
  dateArrow: {
    paddingHorizontal: 8,
  },
  dateArrowText: {
    fontSize: 18,
    color: '#cbd5e1',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
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
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  tryAgainButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  tryAgainButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  differentPaymentButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  differentPaymentButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
});
