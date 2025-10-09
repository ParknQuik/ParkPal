import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { searchListings } from '../store/slices/marketplaceSlice';
import { getCurrentLocation } from '../store/slices/locationSlice';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Chip } from '../components/Chip';
import { colors, typography, spacing, borderRadius } from '../theme';
import { formatCurrency } from '../utils/helpers';

const { width, height } = Dimensions.get('window');

// Conditional import for react-native-maps (only on native)
let MapView: any;
let Marker: any;
let PROVIDER_GOOGLE: any;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

export const MapViewScreen: React.FC = () => {
  const [showFilters, setShowFilters] = useState<string[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const { listings, filters } = useAppSelector((state) => state.marketplace);
  const { currentLocation } = useAppSelector((state) => state.location);

  useEffect(() => {
    dispatch(getCurrentLocation());

    // Fallback: Use default location after 3 seconds if user location not available
    const fallbackTimer = setTimeout(() => {
      if (!currentLocation) {
        // Use default Manila location if user location not available
        dispatch(
          searchListings({
            lat: 14.5995,
            lon: 120.9842,
            radius: 10,
            status: 'available',
            sortBy: filters.sortBy,
          })
        );
      }
    }, 3000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    if (currentLocation) {
      dispatch(
        searchListings({
          lat: currentLocation.latitude,
          lon: currentLocation.longitude,
          radius: 10,
          status: 'available',
          sortBy: filters.sortBy,
        })
      );
    }
  }, [currentLocation]);

  const handleMarkerPress = (listingId: number) => {
    const listing = listings.find((l: any) => l.id === listingId);
    if (listing) {
      setSelectedSpot(listing);
    }
  };

  const handleReserve = () => {
    if (selectedSpot) {
      setSelectedSpot(null);
      navigation.navigate('Reservation' as never, { spotId: selectedSpot.id.toString() } as never);
    }
  };

  const toggleFilter = (filter: string) => {
    setShowFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  const filterOptions = ['Security', 'Covered', 'EV Charging', 'Accessible'];

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.webPlaceholder}>
          <Text style={styles.placeholderText}>
            Map view is only available on mobile devices
          </Text>
          <Text style={styles.placeholderSubtext}>
            Please use the Expo Go app on your phone to view the map
          </Text>
        </View>
      ) : (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: currentLocation?.latitude || 14.8136,
            longitude: currentLocation?.longitude || 121.0453,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          showsUserLocation
          showsMyLocationButton
          mapPadding={{
            top: 120,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          {listings.map((listing: any) => (
            <Marker
              key={listing.id}
              coordinate={{
                latitude: listing.lat,
                longitude: listing.lon,
              }}
              title={`₱${listing.price}/hr`}
              description={listing.address}
              pinColor={listing.status === 'available' ? '#22c55e' : '#ef4444'}
              onPress={() => handleMarkerPress(listing.id)}
            />
          ))}
        </MapView>
      )}

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filterOptions.map((filter) => (
            <Chip
              key={filter}
              label={filter}
              selected={showFilters.includes(filter)}
              onPress={() => toggleFilter(filter)}
            />
          ))}
        </ScrollView>
      </View>

      <BottomSheet
        visible={!!selectedSpot}
        onClose={() => setSelectedSpot(null)}
        height={400}
      >
        {selectedSpot && (
          <View style={styles.sheetContent}>
            <Text style={styles.spotTitle}>{selectedSpot.description || selectedSpot.address}</Text>
            <Text style={styles.spotAddress}>
              {selectedSpot.address}
            </Text>

            <View style={styles.spotDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rating</Text>
                <Text style={styles.detailValue}>
                  ★ {selectedSpot.rating?.toFixed(1) || '0.0'} ({selectedSpot.reviews?.length || 0} reviews)
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={styles.priceText}>
                  ₱{selectedSpot.price}/hour
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Availability</Text>
                <Badge
                  text={selectedSpot.status}
                  variant={
                    selectedSpot.status === 'available'
                      ? 'success'
                      : 'error'
                  }
                />
              </View>
            </View>

            <View style={styles.amenities}>
              {(Array.isArray(selectedSpot.amenities) ? selectedSpot.amenities : JSON.parse(selectedSpot.amenities || '[]')).slice(0, 4).map((amenity: string) => (
                <View key={amenity} style={styles.amenityChip}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="View Details"
                variant="outline"
                onPress={() => {
                  setSelectedSpot(null);
                  navigation.navigate('ParkingDetail' as never, {
                    spotId: selectedSpot.id.toString(),
                  } as never);
                }}
                style={styles.button}
              />
              <Button
                title="Reserve Now"
                variant="gradient"
                onPress={handleReserve}
                style={styles.button}
              />
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width,
    height,
  },
  webPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  placeholderText: {
    ...typography.h4,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  placeholderSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerAvailable: {
    backgroundColor: colors.success,
    borderColor: colors.white,
  },
  markerOccupied: {
    backgroundColor: colors.error,
    borderColor: colors.white,
  },
  markerText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
  filterContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
  },
  filterScroll: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterScrollContent: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetContent: {
    flex: 1,
  },
  spotTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  spotAddress: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  spotDetails: {
    marginBottom: spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  priceText: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  amenityChip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  amenityText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});
