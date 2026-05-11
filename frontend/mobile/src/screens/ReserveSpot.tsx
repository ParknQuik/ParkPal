import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { marketplaceAPI, vehiclesAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

type PickerMode = 'date' | 'time';
type PickerTarget = 'startDate' | 'endDate';

export const ReserveSpot: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { spotId } = (route.params || {}) as { spotId?: string };
  const { colors } = useTheme();

  const [spot, setSpot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const [startDate, setStartDate] = useState(now);
  const [endDate, setEndDate] = useState(oneHourLater);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>('date');
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>('startDate');
  const [isBooking, setIsBooking] = useState(false);
  const [rentalMode, setRentalMode] = useState<'fixed' | 'open'>('fixed');
  const MAX_DURATION_HOURS = 12;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [spotRes, vehiclesRes] = await Promise.all([
          marketplaceAPI.getListingById(Number(spotId)),
          vehiclesAPI.getVehicles(),
        ]);
        setSpot(spotRes.data?.data || spotRes.data);
        const vehicleList = vehiclesRes.data?.data || vehiclesRes.data || [];
        setVehicles(vehicleList);
        if (vehicleList.length > 0) {
          setSelectedVehicle(String(vehicleList[0].id));
        }
      } catch (err) {
        ;
      } finally {
        setLoading(false);
      }
    };
    if (spotId) fetchData();
  }, [spotId]);

  const openPicker = (target: PickerTarget) => {
    setPickerTarget(target);
    setPickerMode('date');
    setShowPicker(true);
  };

  const onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      setShowPicker(false);
      return;
    }

    const currentValue =
      pickerTarget === 'startDate' ? startDate : endDate;

    if (pickerMode === 'date') {
      const merged = new Date(selectedDate);
      merged.setHours(currentValue.getHours());
      merged.setMinutes(currentValue.getMinutes());

      if (Platform.OS === 'ios') {
        if (pickerTarget === 'startDate') {
          setStartDate(merged);
        } else {
          setEndDate(merged);
        }
      } else {
        if (pickerTarget === 'startDate') {
          setStartDate(merged);
        } else {
          setEndDate(merged);
        }
        setPickerMode('time');
        setShowPicker(true);
      }
    } else {
      const merged = new Date(currentValue);
      merged.setHours(selectedDate.getHours());
      merged.setMinutes(selectedDate.getMinutes());

      if (pickerTarget === 'startDate') {
        setStartDate(merged);
      } else {
        setEndDate(merged);
      }
      setShowPicker(false);
    }
  };

  const hours = rentalMode === 'fixed'
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)))
    : MAX_DURATION_HOURS; // Show max price estimate for open mode

  const pricePerHour = spot?.price || spot?.pricePerHour || 0;
  const parkingFee = hours * pricePerHour;
  const serviceFee = 25;
  const tax = parkingFee * 0.05;
  const total = parkingFee + serviceFee + tax;

  const priceLabel = rentalMode === 'open'
    ? `Estimated max (${MAX_DURATION_HOURS}hrs)`
    : 'Total';

  const handleProceedToPayment = async () => {
    if (startDate <= new Date()) {
      Alert.alert('Invalid Date', 'Start date/time must be in the future.');
      return;
    }
    if (rentalMode === 'fixed' && endDate <= startDate) {
      Alert.alert('Invalid Date', 'End date/time must be after start date/time.');
      return;
    }
    if (!selectedVehicle) {
      Alert.alert('No Vehicle', 'Please select a vehicle.');
      return;
    }

    setIsBooking(true);
    try {
      // Navigate to Payment first - booking will be created after payment
      (navigation as any).navigate('Payment', {
        bookingId: undefined, // Will be created after payment
        amount: total,
        spotId,
        spotName: spot?.title || spot?.address || 'Parking Spot',
        spotAddress: spot?.address || '',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        rentalMode,
        maxDuration: rentalMode === 'open' ? MAX_DURATION_HOURS : undefined,
        createBookingOnSuccess: true, // Flag to create booking after payment
      });
    } catch (err: any) {
      ;
      const errorMessage = err.response?.data?.error || err.message || 'Unable to create booking';

      if (err.response?.status === 409) {
        Alert.alert(
          'Slot Unavailable',
          err.response?.data?.error || 'This slot is already booked for the selected time. Please choose a different time.',
          [{ text: 'OK' }]
        );
      } else if (err.response?.status === 400 && errorMessage.includes('not available')) {
        Alert.alert('Slot Unavailable', 'This slot is no longer available. Please choose another spot.');
      } else {
        Alert.alert('Booking Failed', 'Unable to create booking. Please try again.');
      }
    } finally {
      setIsBooking(false);
    }
  };

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary,
    },
    spotCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    spotInfo: {
      flexDirection: 'row',
      gap: 16,
    },
    spotDetails: {
      flex: 2,
    },
    spotLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1,
      marginBottom: 4,
    },
    spotName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    spotLocation: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    viewMapButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.primary}15`,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    viewMapText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    spotImage: {
      width: 100,
      height: 100,
      borderRadius: 12,
      backgroundColor: colors.border,
    },
    spotImagePlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 12,
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    rentalModeContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    rentalModeOption: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    rentalModeOptionActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    rentalModeIcon: {
      marginBottom: 8,
    },
    rentalModeText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    rentalModeTextActive: {
      color: colors.primary,
    },
    rentalModeDescription: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    dateTimeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    inputGroup: {
      width: '48%',
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 6,
      paddingLeft: 4,
    },
    inputContainer: {
      position: 'relative',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    inputText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    vehicleList: {
      gap: 10,
      marginBottom: 12,
    },
    vehicleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
    },
    vehicleItemSelected: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}08`,
    },
    vehicleIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    vehicleInfo: {
      flex: 1,
    },
    vehicleName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    vehiclePlate: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 16,
    },
    addVehicleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      borderStyle: 'dashed',
    },
    addVehicleIcon: {
      fontSize: 18,
      color: colors.primary,
      marginRight: 8,
      fontWeight: '600',
    },
    addVehicleText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    priceBreakdown: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    priceLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    priceValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    totalValue: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.primary,
    },
    bottomSpacer: {
      height: 20,
    },
    footer: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    confirmButton: {
      backgroundColor: colors.primary,
      paddingVertical: 18,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    confirmButtonDisabled: {
      opacity: 0.7,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.white,
    },
    termsText: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    preAuthContainer: {
      backgroundColor: `${colors.warning}20`,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    preAuthLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.warning,
      marginBottom: 4,
    },
    preAuthText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    preAuthNote: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Reserve Spot" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading spot details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const spotName = spot?.name || spot?.title || 'Parking Spot';
  const spotAddress =
    spot?.address || spot?.location?.address || 'Address unavailable';
  const spotImage =
    spot?.photos?.[0] || spot?.image || spot?.imageUrl || null;
  const spotLevel = spot?.level || '';
  const spotNumber = spot?.spotNumber || spot?.slotNumber || '';

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Reserve Spot" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.spotCard}>
          <View style={styles.spotInfo}>
            <View style={styles.spotDetails}>
              <Text style={styles.spotLabel}>PARKING SUMMARY</Text>
              <Text style={styles.spotName}>{spotName}</Text>
              <Text style={styles.spotLocation}>
                {[spotLevel, spotNumber].filter(Boolean).join(', ') ||
                  spotAddress}
              </Text>
              <TouchableOpacity style={styles.viewMapButton}>
                <MaterialCommunityIcons name="map-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.viewMapText}>View Map</Text>
              </TouchableOpacity>
            </View>
            {spotImage ? (
              <Image source={{ uri: spotImage }} style={styles.spotImage} />
            ) : (
              <View style={styles.spotImagePlaceholder}>
                <MaterialCommunityIcons name="parking" size={40} color={colors.textTertiary} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rental Mode</Text>
          <View style={styles.rentalModeContainer}>
            <TouchableOpacity
              style={[
                styles.rentalModeOption,
                rentalMode === 'fixed' && styles.rentalModeOptionActive
              ]}
              onPress={() => setRentalMode('fixed')}
            >
              <View style={styles.rentalModeIcon}>
                <MaterialCommunityIcons name="timer-outline" size={32} color={colors.textPrimary} />
              </View>
              <Text style={[
                styles.rentalModeText,
                rentalMode === 'fixed' && styles.rentalModeTextActive
              ]}>Fixed Duration</Text>
              <Text style={styles.rentalModeDescription}>
                Set specific start and end times
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rentalModeOption,
                rentalMode === 'open' && styles.rentalModeOptionActive
              ]}
              onPress={() => setRentalMode('open')}
            >
              <View style={styles.rentalModeIcon}>
                <MaterialCommunityIcons name="lock-open-outline" size={32} color={colors.textPrimary} />
              </View>
              <Text style={[
                styles.rentalModeText,
                rentalMode === 'open' && styles.rentalModeTextActive
              ]}>Open Time</Text>
              <Text style={styles.rentalModeDescription}>
                Pay when you checkout (max {MAX_DURATION_HOURS}hrs)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date & Time</Text>
          <View style={styles.dateTimeGrid}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Entry Date</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => openPicker('startDate')}
              >
                <Text style={styles.inputText}>{formatDate(startDate)}</Text>
                <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Entry Time</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => {
                  setPickerTarget('startDate');
                  setPickerMode('time');
                  setShowPicker(true);
                }}
              >
                <Text style={styles.inputText}>{formatTime(startDate)}</Text>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {rentalMode === 'fixed' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Exit Date</Text>
                  <TouchableOpacity
                    style={styles.inputContainer}
                    onPress={() => openPicker('endDate')}
                  >
                    <Text style={styles.inputText}>{formatDate(endDate)}</Text>
                    <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Exit Time</Text>
                  <TouchableOpacity
                    style={styles.inputContainer}
                    onPress={() => {
                      setPickerTarget('endDate');
                      setPickerMode('time');
                      setShowPicker(true);
                    }}
                  >
                    <Text style={styles.inputText}>{formatTime(endDate)}</Text>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
          {showPicker && (
            <DateTimePicker
              value={pickerTarget === 'startDate' ? startDate : endDate}
              mode={pickerMode}
              minimumDate={
                pickerTarget === 'startDate' ? new Date() : startDate
              }
              onChange={onPickerChange}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Vehicle</Text>
          <View style={styles.vehicleList}>
            {vehicles.length === 0 && (
              <Text style={styles.emptyText}>
                No vehicles found. Add a vehicle to continue.
              </Text>
            )}
            {vehicles.map((vehicle: any) => (
              <TouchableOpacity
                key={String(vehicle.id)}
                style={[
                  styles.vehicleItem,
                  selectedVehicle === String(vehicle.id) &&
                    styles.vehicleItemSelected,
                ]}
                onPress={() => setSelectedVehicle(String(vehicle.id))}
              >
                <View style={styles.vehicleIconContainer}>
                  <MaterialCommunityIcons name="car-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={styles.vehiclePlate}>
                    {vehicle.licensePlate || vehicle.plate}
                  </Text>
                </View>
                {selectedVehicle === String(vehicle.id) && (
                  <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.addVehicleButton}
            onPress={() => (navigation as any).navigate('MyVehicles')}
          >
            <Text style={styles.addVehicleIcon}>+</Text>
            <Text style={styles.addVehicleText}>Add New Vehicle</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.priceBreakdown}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              Parking Fee ({hours}h x ₱{pricePerHour})
            </Text>
            <Text style={styles.priceValue}>₱{parkingFee.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service Fee</Text>
            <Text style={styles.priceValue}>₱{serviceFee.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tax</Text>
            <Text style={styles.priceValue}>₱{tax.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{priceLabel}</Text>
            <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
          </View>
          {rentalMode === 'open' && (
            <View style={styles.preAuthContainer}>
              <Text style={styles.preAuthLabel}>Pre-Authorization Hold</Text>
              <Text style={styles.preAuthText}>
                ₱{(pricePerHour * MAX_DURATION_HOURS * 1.5).toFixed(0)} (estimated max × 1.5)
              </Text>
              <Text style={styles.preAuthNote}>
                You will be charged based on actual usage. This hold will be released after check-out.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, isBooking && styles.confirmButtonDisabled]}
          onPress={handleProceedToPayment}
          disabled={isBooking}
        >
          {isBooking ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.confirmButtonText}>
              Confirm & Pay ₱{total.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.termsText}>
          By clicking "Confirm & Pay", you agree to ParknQuik's Terms of Service
          and Cancellation Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
};
