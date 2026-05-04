import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';

export const BookingConfirmed: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { paymentId, bookingId, amount, spotName, spotAddress, startTime, endTime, paymentMethod, rentalMode } = route.params as any;
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const displayData = {
    locationName: spotName || 'Parking Spot',
    locationAddress: spotAddress || 'Address not available',
    checkIn: startTime ? formatDate(startTime) : 'N/A',
    checkInTime: startTime ? formatTime(startTime) : 'N/A',
    checkOut: endTime ? formatDate(endTime) : 'N/A',
    checkOutTime: endTime ? formatTime(endTime) : 'N/A',
    totalPaid: amount ? `₱${Number(amount).toFixed(2)}` : '₱0.00',
  };

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    navigation.navigate('MainTabs' as never);
  };

  const handleViewBooking = () => {
    navigation.navigate('MainTabs', { screen: 'MyBookings' } as never);
  };

  const handleDownloadReceipt = () => {
    Alert.alert('Receipt', 'Receipt downloading...');
  };

  const handleScanToCheckIn = () => {
    navigation.navigate('QRScanner' as never, {
      mode: 'checkin',
      bookingId: bookingId,
    } as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
            <Text style={styles.headerButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{paymentMethod === 'cash' ? 'Booking Confirmed' : 'Payment Success'}</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Success Animation */}
        <Animated.View
          style={[
            styles.successContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.successCircle}>
            <MaterialCommunityIcons name="check" size={48} color={colors.white} />
          </View>
        </Animated.View>

        {/* Content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>Booking Confirmed!</Text>
            <Text style={styles.subtitle}>
              {paymentMethod === 'cash' ? 'Please pay in cash when you arrive at the parking location.' : 'Your parking spot has been reserved successfully'}
            </Text>
            <View style={styles.bookingIdBadge}>
              <Text style={styles.bookingIdLabel}>Booking ID</Text>
              <Text style={styles.bookingIdValue}>{bookingId}</Text>
            </View>
          </View>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            {/* Location */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.locationName}>{displayData.locationName}</Text>
              <View style={styles.addressRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6, marginTop: 2 }} />
                <Text style={styles.addressText}>{displayData.locationAddress}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Dates */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Dates</Text>
              <View style={styles.datesContainer}>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateLabel}>From</Text>
                  <Text style={styles.dateValue}>{displayData.checkIn}</Text>
                  <Text style={styles.timeValue}>{displayData.checkInTime}</Text>
                </View>
                <View style={styles.dateArrow}>
                  <MaterialCommunityIcons name="arrow-right" size={16} color={colors.textSecondary} />
                </View>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateLabel}>To</Text>
                  <Text style={styles.dateValue}>{displayData.checkOut}</Text>
                  <Text style={styles.timeValue}>{displayData.checkOutTime}</Text>
                </View>
              </View>
            </View>

        {paymentMethod !== 'cash' && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Total Paid</Text>
                  <Text style={styles.totalPaid}>{displayData.totalPaid}</Text>
                </View>
              </>
        )}
          </View>

          {/* QR Code Section */}
        <View style={styles.qrSection}>
              <Text style={styles.qrSectionTitle}>Check-in QR Code</Text>
              <View style={styles.qrContainer}>
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PARKPAL:${bookingId}` }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.qrInstruction}>
                Show this QR code at check-in
              </Text>
            </View>
        </Animated.View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.scanCheckInButton}
          onPress={handleScanToCheckIn}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={18} color="#ffffff" style={styles.scanCheckInButtonIcon} />
          <Text style={styles.scanCheckInButtonText}>Scan to Check In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleViewBooking}
        >
          <Text style={styles.primaryButtonText}>View Booking</Text>
        </TouchableOpacity>

        {paymentMethod !== 'cash' && (
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={handleDownloadReceipt}
          >
            <Text style={styles.outlineButtonText}>Download Receipt</Text>
          </TouchableOpacity>
        )}

        <View style={styles.supportRow}>
          <Text style={styles.supportText}>Questions? </Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:support@parkpal.com')}>
            <Text style={styles.supportLink}>Contact support</Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 20,
    color: '#1e293b',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successCheck: {
    fontSize: 50,
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  bookingIdBadge: {
    backgroundColor: PRIMARY + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  bookingIdLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  bookingIdValue: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailSection: {
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIcon: {
    fontSize: 14,
    marginRight: 6,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  datesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBlock: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 13,
    color: '#64748b',
  },
  dateArrow: {
    paddingHorizontal: 16,
  },
  dateArrowText: {
    fontSize: 20,
    color: '#cbd5e1',
  },
  totalPaid: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIMARY,
  },
  qrSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  qrSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  qrContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrInstruction: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PRIMARY,
    marginBottom: 16,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
  },
  supportRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportText: {
    fontSize: 14,
    color: '#64748b',
  },
  supportLink: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY,
  },
  scanCheckInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scanCheckInButtonIcon: {
    marginRight: 8,
  },
  scanCheckInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
