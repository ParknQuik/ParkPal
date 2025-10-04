import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchParkingSpots, setSelectedSpot } from '../store/slices/parkingSlice';
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
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const { spots, selectedSpot } = useAppSelector((state) => state.parking);
  const { currentLocation } = useAppSelector((state) => state.location);

  useEffect(() => {
    dispatch(getCurrentLocation());
  }, []);

  useEffect(() => {
    if (currentLocation) {
      dispatch(fetchParkingSpots(currentLocation));
    }
  }, [currentLocation]);

  const handleMarkerPress = (spotId: string) => {
    const spot = spots.find((s) => s.id === spotId);
    if (spot) {
      dispatch(setSelectedSpot(spot));
    }
  };

  const handleReserve = () => {
    if (selectedSpot) {
      dispatch(setSelectedSpot(null));
      navigation.navigate('Reservation' as never, { spotId: selectedSpot.id } as never);
    }
  };

  const toggleFilter = (filter: string) => {
    setSelectedFilters((prev) =>
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
            latitude: currentLocation?.latitude || 37.7749,
            longitude: currentLocation?.longitude || -122.4194,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {spots.map((spot) => (
            <Marker
              key={spot.id}
              coordinate={{
                latitude: spot.latitude,
                longitude: spot.longitude,
              }}
              onPress={() => handleMarkerPress(spot.id)}
            >
              <View style={styles.markerContainer}>
                <View
                  style={[
                    styles.marker,
                    spot.availability === 'available'
                      ? styles.markerAvailable
                      : styles.markerOccupied,
                  ]}
                >
                  <Text style={styles.markerText}>
                    {formatCurrency(spot.price)}
                  </Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      <View style={styles.filterContainer}>
        <View style={styles.filterScroll}>
          {filterOptions.map((filter) => (
            <Chip
              key={filter}
              label={filter}
              selected={selectedFilters.includes(filter)}
              onPress={() => toggleFilter(filter)}
            />
          ))}
        </View>
      </View>

      <BottomSheet
        visible={!!selectedSpot}
        onClose={() => dispatch(setSelectedSpot(null))}
        height={400}
      >
        {selectedSpot && (
          <View style={styles.sheetContent}>
            <Text style={styles.spotTitle}>{selectedSpot.title}</Text>
            <Text style={styles.spotAddress}>
              {selectedSpot.address}, {selectedSpot.city}
            </Text>

            <View style={styles.spotDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rating</Text>
                <Text style={styles.detailValue}>
                  ★ {selectedSpot.rating} ({selectedSpot.reviews} reviews)
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={styles.priceText}>
                  {formatCurrency(selectedSpot.price)}/{selectedSpot.priceUnit}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Availability</Text>
                <Badge
                  text={selectedSpot.availability}
                  variant={
                    selectedSpot.availability === 'available'
                      ? 'success'
                      : 'error'
                  }
                />
              </View>
            </View>

            <View style={styles.amenities}>
              {selectedSpot.amenities.slice(0, 4).map((amenity) => (
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
                  dispatch(setSelectedSpot(null));
                  navigation.navigate('ParkingDetail' as never, {
                    spotId: selectedSpot.id,
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
  },
  marker: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
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
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
