import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { useAppDispatch, useAppSelector } from '../store';
import { searchListings } from '../store/slices/marketplaceSlice';
import api from '../services/api';
import { colors, typography, spacing, borderRadius } from '../theme';

const { width, height } = Dimensions.get('window');

export const ExploreScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const mapRef = useRef<MapView>(null);
  const autocompleteRef = useRef<any>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [searchText, setSearchText] = useState('');
  const [location, setLocation] = useState('');
  const [listViewDisplayed, setListViewDisplayed] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [hideResults, setHideResults] = useState(false);

  const [region, setRegion] = useState({
    latitude: 14.5995,  // Manila default
    longitude: 120.9842,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const { listings, loading } = useAppSelector((state) => state.marketplace);

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['25%', '60%', '95%'], []);

  // Debug logging
  useEffect(() => {
    console.log('📊 Listings updated:', listings.length, 'items');
    if (listings.length > 0) {
      console.log('📍 First listing:', {
        id: listings[0].id,
        address: listings[0].address,
        lat: listings[0].latitude,
        lon: listings[0].longitude,
        price: listings[0].pricePerHour,
      });
    }
  }, [listings]);

  useEffect(() => {
    const fetchApiKey = async (retryCount = 0) => {
      try {
        console.log('Fetching Google Maps API key...');
        const response = await api.get('/config/maps-api-key');
        console.log('API key received:', response.data.apiKey);
        setGoogleMapsApiKey(response.data.apiKey);
        setApiKeyError(null);
      } catch (error: any) {
        // Only log error, don't show to user - retry silently
        if (retryCount < 2) {
          console.log(`Retrying Google Maps API key fetch (${retryCount + 1}/2)...`);
          setTimeout(() => fetchApiKey(retryCount + 1), 2000); // Retry after 2 seconds
          return;
        }
        console.error('Failed to fetch Google Maps API key after retries:', error);
        setApiKeyError(`Unable to load map: ${error.message || 'Network Error'}`);
      }
    };
    fetchApiKey();
  }, []);

  const handleSearch = (lat: number, lon: number, locationName: string) => {
    console.log('🔍 Searching:', locationName, `(${lat}, ${lon})`);
    const newRegion = {
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };

    setRegion(newRegion);
    setLocation(locationName);

    // Animate map to new location
    console.log('🗺️  Animating map to:', newRegion);
    mapRef.current?.animateToRegion(newRegion, 1000);

    // Search for listings with larger radius
    console.log('📡 Dispatching search with 10km radius');
    dispatch(searchListings({
      lat,
      lon,
      radius: 10, // Increased from 5km to 10km
    }));

    // Expand sheet to show results
    bottomSheetRef.current?.snapToIndex(1);
  };

  const handleRecenter = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to show your location');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location');
    }
  };

  const handleClearSearch = () => {
    setLocation('');
    setSearchText('');
    setListViewDisplayed(false);
    if (autocompleteRef.current) {
      autocompleteRef.current.setAddressText('');
    }
  };

  const handleMarkerPress = (listing: any) => {
    setSelectedListing(listing);
    bottomSheetRef.current?.snapToIndex(1);

    // Center map on selected marker
    mapRef.current?.animateToRegion({
      latitude: listing.latitude,
      longitude: listing.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  };

  const renderListingCard = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.listingCard}
      onPress={() => {
        navigation.navigate('ParkingDetail' as never, { spotId: item.id.toString() } as never);
      }}
      activeOpacity={0.9}
    >
      <Image
        source={{
          uri: item.photos?.[0] || 'https://via.placeholder.com/300x200?text=Parking+Spot',
        }}
        style={styles.listingImage}
      />
      <View style={styles.listingInfo}>
        <View style={styles.listingHeader}>
          <Text style={styles.listingTitle} numberOfLines={1}>
            {item.address || item.title}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {item.rating?.toFixed(1) || '5.0'}</Text>
          </View>
        </View>

        <Text style={styles.listingType} numberOfLines={1}>
          {item.slotType === 'roadside_qr' && '🅿️ Roadside Parking'}
          {item.slotType === 'commercial_manual' && '🏢 Commercial Parking'}
          {item.slotType === 'commercial_iot' && '🤖 Smart Parking'}
        </Text>

        <View style={styles.amenitiesRow}>
          {item.amenities && Array.isArray(item.amenities) && item.amenities.slice(0, 3).map((amenity: string, index: number) => (
            <View key={index} style={styles.amenityBadge}>
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₱{item.pricePerHour}</Text>
          <Text style={styles.priceUnit}>/hour</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, item.availability && styles.statusAvailable]} />
            <Text style={styles.statusText}>{item.availability ? 'available' : 'occupied'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), [navigation]);

  const renderSheetHeader = useCallback(() => (
    <View style={styles.sheetHeader}>
      <Text style={styles.sheetTitle}>
        {loading ? 'Searching...' : `${listings.length} parking spots`}
      </Text>
      {location && (
        <Text style={styles.sheetSubtitle}>{location}</Text>
      )}
    </View>
  ), [loading, listings.length, location]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {/* API Key Error Overlay */}
        {apiKeyError && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>📡</Text>
              <Text style={styles.errorTitle}>Map Unavailable</Text>
              <Text style={styles.errorText}>{apiKeyError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setApiKeyError(null);
                  const fetchApiKey = async () => {
                    try {
                      const response = await api.get('/config/maps-api-key');
                      setGoogleMapsApiKey(response.data.apiKey);
                      setApiKeyError(null);
                    } catch (error) {
                      setApiKeyError('Unable to load map. Please check your connection.');
                    }
                  };
                  fetchApiKey();
                }}
                accessibilityLabel="Retry loading map"
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Map */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          showsMyLocationButton={false}
          mapPadding={{
            top: 180,              // Search bar + SafeArea + buffer (increased)
            right: 16,             // Horizontal breathing room
            bottom: height * 0.28, // Bottom sheet collapsed state + buffer
            left: 16,              // Horizontal breathing room
          }}
          legalLabelInsets={{ top: 180, right: 0, bottom: 0, left: 0 }}
        >
          {listings.map((listing: any) => (
            <Marker
              key={listing.id}
              coordinate={{
                latitude: listing.latitude,
                longitude: listing.longitude,
              }}
              onPress={() => handleMarkerPress(listing)}
            >
              <View style={[
                styles.markerContainer,
                selectedListing?.id === listing.id && styles.markerSelected
              ]}>
                <Text style={styles.markerPrice}>₱{listing.pricePerHour}</Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Search Bar Overlay */}
        <SafeAreaView style={styles.searchOverlay} edges={['top']}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <GooglePlacesAutocomplete
                ref={autocompleteRef}
                placeholder="Where do you need parking?"
                onPress={(data, details = null) => {
                  console.log('🎯 GooglePlaces onPress triggered');
                  console.log('📍 Data:', data.description);
                  console.log('📍 Details:', details ? 'exists' : 'NULL');
                  console.log('📍 Geometry:', details?.geometry?.location);

                  setSearchText(data.description);
                  setHideResults(true);

                  if (details?.geometry?.location) {
                    handleSearch(
                      details.geometry.location.lat,
                      details.geometry.location.lng,
                      data.description
                    );
                  } else {
                    console.log('⚠️ No details.geometry.location - cannot search');
                  }

                  // Blur to dismiss keyboard
                  setTimeout(() => {
                    if (autocompleteRef.current) {
                      autocompleteRef.current.blur();
                    }
                  }, 100);
                }}
                query={{
                  key: googleMapsApiKey,
                  language: 'en',
                  components: 'country:ph',
                }}
                fetchDetails={true}
                enablePoweredByContainer={false}
                keyboardShouldPersistTaps="handled"
                listViewDisplayed={hideResults ? false : 'auto'}
                suppressDefaultStyles={false}
                textInputProps={{
                  onChangeText: (text) => {
                    setSearchText(text);
                    setHideResults(false);
                  },
                  value: searchText,
                  onFocus: () => {
                    setHideResults(false);
                  },
                }}
                styles={{
                  container: {
                    flex: 1,
                  },
                  textInputContainer: {
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                    height: 48,
                  },
                  textInput: {
                    ...typography.body,
                    color: colors.textPrimary,
                    backgroundColor: colors.white,
                    borderRadius: borderRadius.full,
                    paddingHorizontal: spacing.lg,
                    height: 48,
                    fontSize: 15,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3,
                  },
                  listView: {
                    backgroundColor: colors.white,
                    borderRadius: borderRadius.lg,
                    marginTop: spacing.sm,
                    maxHeight: 300,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 5,
                    position: 'absolute',
                    top: 48,
                    left: 0,
                    right: 0,
                  },
                  row: {
                    padding: spacing.md,
                    backgroundColor: colors.white,
                  },
                  description: {
                    ...typography.body,
                    color: colors.textPrimary,
                  },
                }}
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearSearch}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  accessibilityHint="Clears the current search text"
                >
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {/* Add filter functionality */}}
              accessibilityLabel="Filter parking spots"
              accessibilityRole="button"
              accessibilityHint="Opens filtering options"
            >
              <Text style={styles.filterIcon}>⚙</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Recenter Button */}
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={handleRecenter}
          accessibilityLabel="Center map on your location"
          accessibilityRole="button"
        >
          <Text style={styles.recenterIcon}>📍</Text>
        </TouchableOpacity>

        {/* Bottom Sheet with Listings */}
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          index={0}
          enablePanDownToClose={false}
          handleIndicatorStyle={styles.handleIndicator}
          backgroundStyle={styles.bottomSheetBackground}
        >
          {renderSheetHeader()}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : listings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🅿️</Text>
              <Text style={styles.emptyTitle}>No parking spots found</Text>
              <Text style={styles.emptyText}>
                Try searching a different location or adjusting your filters
              </Text>
            </View>
          ) : (
            <BottomSheetFlatList
              data={listings}
              renderItem={renderListingCard}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
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
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    pointerEvents: 'box-none',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Subtle scrim for better contrast
    paddingBottom: spacing.md, // Extra padding for visual weight
  },
  searchInputWrapper: {
    flex: 1,
    position: 'relative',
    pointerEvents: 'auto',
  },
  clearButton: {
    position: 'absolute',
    right: 8,
    top: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  filterIcon: {
    fontSize: 20,
  },
  recenterButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: height * 0.35,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  recenterIcon: {
    fontSize: 24,
  },
  markerContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerSelected: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.1 }],
  },
  markerPrice: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  handleIndicator: {
    backgroundColor: colors.border,
    width: 40,
    height: 4,
  },
  bottomSheetBackground: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.h5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h6,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  listingImage: {
    width: 120,
    height: 120,
    backgroundColor: colors.border,
  },
  listingInfo: {
    flex: 1,
    padding: spacing.md,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  listingTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  listingType: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  amenityBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  amenityText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  price: {
    ...typography.h6,
    fontWeight: '700',
    color: colors.primary,
  },
  priceUnit: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  statusAvailable: {
    backgroundColor: colors.success,
  },
  statusText: {
    ...typography.small,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  errorContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xxxl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    maxWidth: 320,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h6,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 120,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
});
