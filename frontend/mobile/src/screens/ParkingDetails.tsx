import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Share,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { marketplaceAPI } from '../services/api';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../types';
import { AppHeader } from '../components/AppHeader';

const { width } = Dimensions.get('window');

type ParkingDetailsRouteProp = RouteProp<RootStackParamList, 'ParkingDetail'>;

export const ParkingDetails: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { spotId, fromBooking, bookingId, bookingStatus, startTime, endTime, totalAmount, rentalMode } = route.params || {};
  const showReserveButton = fromBooking !== true;

  const [spot, setSpot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpot = async () => {
      try {
        setLoading(true);
        const response = await marketplaceAPI.getListingById(Number(spotId));
        setSpot(response.data?.data || response.data);
      } catch (err: any) {
        setError(err?.response?.data?.error || err.message || 'Listing not found or removed');
      } finally {
        setLoading(false);
      }
    };
    if (spotId) {
      fetchSpot();
    } else {
      setLoading(false);
      setError('Booking does not have a valid listing');
    }
  }, [spotId]);

  const handleBack = () => navigation.goBack();

  const handleShare = () => {
    Share.share({
      title: title,
      message: `Check out this parking spot: ${title}\nAddress: ${location}\nPrice: ₱${price}/hour`,
      url: `https://parkpal.app/spot/${spotId}`,
    });
  };

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      color: colors.error,
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: colors.secondary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '600',
    },
    heroContainer: {
      position: 'relative',
    },
    heroImage: {
      width: width,
      height: 280,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      padding: 20,
    },
    titleSection: {
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    locationText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    badgeRow: {
      flexDirection: 'row',
    },
    availableBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    availableDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginRight: 6,
    },
    availableText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    unavailableBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    unavailableDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.error,
      marginRight: 6,
    },
    unavailableText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.error,
    },
    quickInfoSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
      gap: 12,
    },
    quickInfoCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    quickInfoValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    quickInfoLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    amenitiesSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    amenitiesRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    amenityPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    amenityIcon: {
      fontSize: 16,
      marginRight: 6,
    },
    amenityLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    reviewsSection: {
      marginBottom: 24,
    },
    reviewsPlaceholder: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    reviewsPlaceholderText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    mapSection: {
      marginBottom: 24,
    },
    mapPreviewContainer: {
      width: '100%',
      height: 200,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.border,
    },
    mapPreviewPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mapPlaceholder: {
      height: 180,
      backgroundColor: colors.surface,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapIconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    mapText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    mapAddress: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    footer: {
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 5,
    },
    reserveButton: {
      backgroundColor: colors.secondary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    reserveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.white,
    },
    bookingInfoSection: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    bookingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bookingIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    bookingHeaderText: {
      flex: 1,
      marginLeft: 12,
    },
    bookingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    bookingId: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: '#fef3c7',
    },
    statusCompleted: {
      backgroundColor: '#dcfce7',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#92400e',
    },
    bookingDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    bookingGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    bookingGridItem: {
      alignItems: 'center',
      flex: 1,
    },
    bookingGridLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    bookingGridValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 4,
      textAlign: 'center',
    },
    bookingFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    bookingFooterItem: {
      alignItems: 'center',
      flex: 1,
    },
    bookingFooterLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    bookingFooterValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
      marginTop: 4,
    },
    embeddedMap: {
      width: '100%',
      height: '100%',
    },
    mapContainer: {
      width: '100%',
      height: 250,
      borderRadius: 16,
      overflow: 'hidden',
    },
    mapOverlay: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    mapOverlayText: {
      color: colors.white,
      fontSize: 10,
      fontWeight: '500',
    },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !spot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Parking spot not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              marketplaceAPI.getListingById(Number(spotId))
                .then((res) => setSpot(res.data?.data || res.data))
                .catch((err) => setError(err.message || 'Failed to load parking spot'))
                .finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const title = spot.address || spot.title || 'Parking Spot';
  const location = spot.address || '';
  const status = spot.status || 'available';
  const price = spot.price ?? spot.pricePerHour ?? 0;
  const amenities: any[] = Array.isArray(spot?.amenities) ? spot.amenities : [];
  const heroImage = spot.photos?.[0] || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&h=400&fit=crop';
  const spotLat = spot.lat || spot.latitude || 0;
  const spotLon = spot.lon || spot.longitude || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <AppHeader
          title="Parking Details"
          onBack={handleBack}
          rightAction={
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <MaterialCommunityIcons name="share-variant" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          }
        />

        {/* Hero Image */}
        <View style={styles.heroContainer}>
           <Image
             source={{ uri: heroImage }}
             style={styles.heroImage}
             resizeMode="cover"
           />
         </View>

         <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.locationText}>{location}</Text>
            </View>

            <View style={styles.badgeRow}>
              <View style={status === 'available' ? styles.availableBadge : styles.unavailableBadge}>
                <View style={status === 'available' ? styles.availableDot : styles.unavailableDot} />
                <Text style={status === 'available' ? styles.availableText : styles.unavailableText}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Booking Details - Show first when viewing from booking */}
          {bookingId && (
            <View style={styles.bookingInfoSection}>
              <View style={styles.bookingHeader}>
                <View style={styles.bookingIconContainer}>
                  <MaterialCommunityIcons name="calendar-check" size={24} color={colors.primary} />
                </View>
                <View style={styles.bookingHeaderText}>
                  <Text style={styles.bookingTitle}>Your Booking</Text>
                  <Text style={styles.bookingId}>#{bookingId}</Text>
                </View>
                <View style={[styles.statusBadge, bookingStatus === 'completed' && styles.statusCompleted]}>
                  <Text style={styles.statusText}>{bookingStatus}</Text>
                </View>
              </View>

              <View style={styles.bookingDivider} />

              <View style={styles.bookingGrid}>
                <View style={styles.bookingGridItem}>
                  <MaterialCommunityIcons name="clock-start" size={18} color={colors.primary} />
                  <Text style={styles.bookingGridLabel}>Start</Text>
                  <Text style={styles.bookingGridValue}>
                    {startTime ? new Date(startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </Text>
                </View>
                <View style={styles.bookingGridItem}>
                  <MaterialCommunityIcons name="clock-end" size={18} color={colors.primary} />
                  <Text style={styles.bookingGridLabel}>End</Text>
                  <Text style={styles.bookingGridValue}>
                    {endTime ? new Date(endTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingDivider} />

              <View style={styles.bookingFooter}>
                <View style={styles.bookingFooterItem}>
                  <Text style={styles.bookingFooterLabel}>Total Paid</Text>
                  <Text style={styles.bookingFooterValue}>₱{totalAmount}</Text>
                </View>
                <View style={styles.bookingFooterItem}>
                  <Text style={styles.bookingFooterLabel}>Duration</Text>
                  <Text style={styles.bookingFooterValue}>{rentalMode === 'open' ? 'Open' : 'Fixed'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Quick Info Cards */}
          <View style={styles.quickInfoSection}>
            <View style={styles.quickInfoCard}>
              <Text style={styles.quickInfoValue}>₱{Number(price).toFixed(2)}</Text>
              <Text style={styles.quickInfoLabel}>/hr</Text>
            </View>
            <View style={styles.quickInfoCard}>
              <Text style={styles.quickInfoValue}>24/7</Text>
              <Text style={styles.quickInfoLabel}>Access</Text>
            </View>
            <View style={styles.quickInfoCard}>
              <Text style={styles.quickInfoValue}>{amenities.length}</Text>
              <Text style={styles.quickInfoLabel}>Amenities</Text>
            </View>
          </View>

          {/* Amenities */}
          {amenities.length > 0 && (
            <View style={styles.amenitiesSection}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesRow}>
                {amenities.map((amenity: any, index: number) => (
                  <View key={typeof amenity === 'string' ? amenity : index} style={styles.amenityPill}>
                    <Text style={styles.amenityLabel}>
                      {typeof amenity === 'string' ? amenity : amenity.label || amenity}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reviews */}
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.reviewsPlaceholder}>
              <Text style={styles.reviewsPlaceholderText}>No reviews yet</Text>
            </View>
          </View>

          {/* Map Section - Navigate to Explore Map */}
          <TouchableOpacity
            style={styles.mapSection}
            activeOpacity={0.7}
            onPress={() => {
              navigation.navigate('Explore' as never, {
                latitude: spotLat,
                longitude: spotLon,
                focusSpotId: spotId,
              } as never);
            }}
          >
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapPreviewContainer}>
              <View style={styles.mapPreviewPlaceholder}>
                <View style={styles.mapIconContainer}>
                  <MaterialCommunityIcons name="map-outline" size={28} color={colors.primary} />
                </View>
                <Text style={styles.mapText}>View on Map</Text>
                <Text style={styles.mapAddress}>{location}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      {showReserveButton && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.reserveButton}
            onPress={() => navigation.navigate('Reservation', { spotId })}
          >
            <Text style={styles.reserveButtonText}>Reserve Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};
