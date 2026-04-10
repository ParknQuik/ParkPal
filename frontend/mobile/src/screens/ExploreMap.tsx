import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAppDispatch, useAppSelector } from '../store';
import { searchListings } from '../store/slices/marketplaceSlice';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// SVG-based price marker — Android-safe, no View/Text clipping issues.
//
// Strategy (Option C): Build the entire marker as an inline SVG string with
// explicit width/height. react-native-svg renders it at exact pixel dimensions,
// so Android knows the canvas size before the first paint and never clips.
// tracksViewChanges is locked to false immediately after mount so the JS bridge
// is only crossed once per marker.
// ---------------------------------------------------------------------------

const PriceMarker = React.memo(({ listing, selected, onPress }: {
  listing: any;
  selected: boolean;
  onPress: (id: any) => void;
}) => {
  const [tracksChanges, setTracksChanges] = React.useState(true);
  const price = listing.pricePerHour != null ? `P${listing.pricePerHour}` : 'P—';
  const bg = selected ? '#10b77f' : '#ffffff';
  const textColor = selected ? '#ffffff' : '#10b77f';

  return (
    <Marker
      coordinate={{ latitude: listing.latitude, longitude: listing.longitude }}
      onPress={() => onPress(listing.id)}
      tracksViewChanges={tracksChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        collapsable={false}
        style={{ width: 80, height: 36 }}
        onLayout={() => setTracksChanges(false)}
      >
        <Svg width={80} height={36}>
          <Rect
            x={2} y={2} width={76} height={32}
            rx={8} ry={8}
            fill={bg}
            stroke="#10b77f"
            strokeWidth={2}
          />
          <SvgText
            x={40} y={22}
            textAnchor="middle"
            fontSize={13}
            fontWeight="bold"
            fill={textColor}
          >
            {price}
          </SvgText>
        </Svg>
      </View>
    </Marker>
  );
});

export const ExploreMap: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const mapRef = useRef<MapView>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMovedMap, setHasMovedMap] = useState(false);

  const [region, setRegion] = useState({
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [locationReady, setLocationReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const { listings, loading } = useAppSelector((state) => state.marketplace);

  const selectedListing = selectedMarker !== null
    ? listings.find((l: any) => l.id === selectedMarker)
    : null;

  // Fetch listings for a given region
  const fetchListings = useCallback(async (lat: number, lon: number) => {
    try {
      await dispatch(searchListings({
        latitude: lat,
        longitude: lon,
        radius: 10,
        ...(searchQuery ? { q: searchQuery } : {}),
      })).unwrap();
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    }
  }, [dispatch, searchQuery]);

  const centerOnUser = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 500);
        fetchListings(location.coords.latitude, location.coords.longitude);
      } else {
        fetchListings(region.latitude, region.longitude);
      }
    } catch {
      fetchListings(region.latitude, region.longitude);
    } finally {
      setLocationReady(true);
    }
  }, [fetchListings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Center on user every time this tab is focused
  useFocusEffect(
    useCallback(() => {
      centerOnUser();
    }, [centerOnUser])
  );

  // Debounced search when searchQuery changes
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      fetchListings(region.latitude, region.longitude);
    }, 400);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchListings(region.latitude, region.longitude);
    setRefreshing(false);
  }, [fetchListings]);

  const handleRecenter = useCallback(() => {
    centerOnUser();
  }, [centerOnUser]);

  const handleZoomIn = () => {
    const newRegion = {
      ...region,
      latitudeDelta: region.latitudeDelta * 0.5,
      longitudeDelta: region.longitudeDelta * 0.5,
    };
    mapRef.current?.animateToRegion(newRegion, 300);
    setRegion(newRegion);
  };

  const handleZoomOut = () => {
    const newRegion = {
      ...region,
      latitudeDelta: Math.min(region.latitudeDelta * 2, 180),
      longitudeDelta: Math.min(region.longitudeDelta * 2, 360),
    };
    mapRef.current?.animateToRegion(newRegion, 300);
    setRegion(newRegion);
  };

  const handleMarkerPress = (markerId: string | number) => {
    setSelectedMarker(markerId);
    const listing = listings.find((l: any) => l.id === markerId);
    if (listing) {
      mapRef.current?.animateToRegion({
        latitude: listing.latitude,
        longitude: listing.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleViewDetails = () => {
    if (selectedListing) {
      navigation.navigate('ParkingDetail', { spotId: selectedListing.id });
    }
  };

  const handleDirections = () => {
    console.log('Navigate to directions');
  };

  const handleFilterPress = () => {
    console.log('Filter pressed - to be implemented');
    Alert.alert('Filters', 'Filter options coming soon!');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search parking spots..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={handleFilterPress}
          activeOpacity={0.7}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Map Background */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onMapReady={() => { setMapReady(true); centerOnUser(); }}
          onRegionChangeComplete={(r) => { setRegion(r); setHasMovedMap(true); }}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {listings.map((listing: any) => (
            <PriceMarker
              key={listing.id}
              listing={listing}
              selected={selectedMarker === listing.id}
              onPress={handleMarkerPress}
            />
          ))}
        </MapView>

        {/* Search this area button */}
        {hasMovedMap && (
          <TouchableOpacity
            style={styles.searchAreaButton}
            onPress={async () => {
              setHasMovedMap(false);
              await fetchListings(region.latitude, region.longitude);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.searchAreaText}>Search this area</Text>
          </TouchableOpacity>
        )}

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Empty State */}
        {!loading && listings.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No parking spots found</Text>
          </View>
        )}

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn} activeOpacity={0.7}>
            <Text style={styles.controlIcon}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.controlBorder]} onPress={handleZoomOut} activeOpacity={0.7}>
            <Text style={styles.controlIcon}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, styles.myLocationButton]}
            onPress={handleRecenter}
            activeOpacity={0.7}
          >
            <Text style={styles.myLocationIcon}>📍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet Preview */}
      {selectedListing ? (
        <TouchableOpacity
          style={styles.bottomSheet}
          activeOpacity={0.9}
          onPress={handleViewDetails}
        >
          <View style={styles.dragHandle} />
          <View style={styles.spotPreview}>
            <Image
              source={{ uri: selectedListing.photos?.[0] || 'https://via.placeholder.com/96' }}
              style={styles.spotImage}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.spotInfo}>
              <View style={styles.spotHeader}>
                <View style={styles.spotHeaderText}>
                  <Text style={styles.spotName} numberOfLines={1}>{selectedListing.title || selectedListing.address}</Text>
                  <Text style={styles.spotDistance}>
                    {selectedListing.distance ? `📍 ${selectedListing.distance.toFixed(1)} km away` : '📍 Nearby'}
                  </Text>
                </View>
              </View>
              <View style={styles.ratingRow}>
                <View style={styles.rating}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.ratingText}>{selectedListing.rating?.toFixed(1) || 'N/A'}</Text>
                </View>
                <Text style={styles.reviewsText}>({selectedListing.reviewCount || 0} reviews)</Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.directionsButton}
                  onPress={handleDirections}
                  activeOpacity={0.7}
                >
                  <Text style={styles.directionsIcon}>🧭</Text>
                  <Text style={styles.directionsText}>Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={handleViewDetails}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBarContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  searchAreaButton: {
    position: 'absolute',
    top: 190,
    alignSelf: 'center',
    backgroundColor: '#10b77f',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchAreaText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filterIcon: {
    fontSize: 20,
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    position: 'absolute',
    top: height * 0.35,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: height * 0.45,
    gap: 8,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  controlBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  controlIcon: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  myLocationButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
  },
  myLocationIcon: {
    fontSize: 20,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dragHandle: {
    width: 48,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  spotPreview: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  spotImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
  },
  spotInfo: {
    flex: 1,
    marginLeft: 16,
  },
  spotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spotHeaderText: {
    flex: 1,
  },
  spotName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  spotDistance: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  favoriteIcon: {
    fontSize: 22,
  },
  favoriteActive: {
    color: colors.error,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 14,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  directionsIcon: {
    fontSize: 16,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  viewDetailsButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    paddingVertical: 10,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  shareButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 18,
  },
});

export default ExploreMap;
