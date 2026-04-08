import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { marketplaceAPI } from '../services/api';
import { colors } from '../theme';
import type { RootStackParamList } from '../types';

const { width } = Dimensions.get('window');

type ParkingDetailsRouteProp = RouteProp<RootStackParamList, 'ParkingDetail'>;

export const ParkingDetails: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ParkingDetailsRouteProp>();
  const spotId = route.params?.spotId;
  // Debug: log the params for debugging
  console.log("[ParkingDetails] route.params:", route.params);
  console.log("[ParkingDetails] spotId:", spotId);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: heroImage }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Header Overlay */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.headerButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Parking Details</Text>
            <TouchableOpacity style={styles.headerButton}>
              <Text style={styles.headerButtonText}>↗</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
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

          {/* Map Section */}
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapPlaceholder}>
              <View style={styles.mapIconContainer}>
                <Text style={styles.mapIcon}>🗺️</Text>
              </View>
              <Text style={styles.mapText}>View on Map</Text>
              <Text style={styles.mapAddress}>{location}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.scanQRButton}
          onPress={() => navigation.navigate('QRScanner' as never, {
            mode: 'generic',
            spotId,
          } as never)}
        >
          <Text style={styles.scanQRIcon}>📱</Text>
          <Text style={styles.scanQRText}>Scan QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reserveButton}
          onPress={() => navigation.navigate('Reservation', { spotId })}
        >
          <Text style={styles.reserveButtonText}>Reserve Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8f7',
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
    color: '#ffffff',
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
  headerOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 20,
    color: '#1e293b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    color: '#1e293b',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#64748b',
  },
  badgeRow: {
    flexDirection: 'row',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b77f20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b77f',
    marginRight: 6,
  },
  availableText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b77f',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickInfoValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  quickInfoLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  amenitiesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  amenityIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  amenityLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
  },
  reviewsSection: {
    marginBottom: 24,
  },
  reviewsPlaceholder: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reviewsPlaceholderText: {
    fontSize: 14,
    color: '#64748b',
  },
  mapSection: {
    marginBottom: 24,
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mapIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f6f8f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapIcon: {
    fontSize: 28,
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  mapAddress: {
    fontSize: 13,
    color: '#64748b',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
    gap: 12,
  },
  scanQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#10b77f',
    gap: 6,
  },
  scanQRIcon: {
    fontSize: 18,
  },
  scanQRText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b77f',
  },
  reserveButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reserveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
