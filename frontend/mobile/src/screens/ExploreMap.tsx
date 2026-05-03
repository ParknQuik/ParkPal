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
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../store';
import { searchListings } from '../store/slices/marketplaceSlice';
import { fetchZoneAvailability } from '../store/slices/analyticsSlice';
import { colors } from '../theme/colors';
import { useAnalyticsGeofencing } from '../hooks/useAnalyticsGeofencing';
import { analyticsService } from '../services/analytics';
import { ListingBottomSheet } from '../components/ListingBottomSheet';
import { FilterModal, FilterConfig } from '../components/FilterModal';

const { width, height } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Native View-based price marker — simpler, better performance than SVG.
// Uses a View wrapper with borderRadius + Text for the price display.
// collapsable={false} ensures Android doesn't optimize away the View.
// tracksViewChanges is locked to false after first render for performance.
// ---------------------------------------------------------------------------

const PriceMarker = React.memo(({ listing, selected, onPress }: {
  listing: any;
  selected: boolean;
  onPress: (id: any) => void;
}) => {
  const [tracksChanges, setTracksChanges] = React.useState(true);
  const price = listing.pricePerHour != null ? `₱${listing.pricePerHour}` : '₱—';
  const bg = selected ? '#10b77f' : '#ffffff';
  const textColor = selected ? '#ffffff' : '#10b77f';
  const borderColor = selected ? '#059669' : '#10b77f';

  return (
    <Marker
      coordinate={{ latitude: listing.latitude, longitude: listing.longitude }}
      onPress={() => onPress(listing.id)}
      tracksViewChanges={tracksChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        collapsable={false}
        style={{
          backgroundColor: bg,
          borderWidth: 2,
          borderColor,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 3,
        }}
        onLayout={() => setTracksChanges(false)}
      >
        <Text
          style={{
            color: textColor,
            fontSize: 13,
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          {price}
        </Text>
      </View>
    </Marker>
  );
});

export const ExploreMap: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { latitude, longitude, focusSpotId } = route.params || {};
  const dispatch = useAppDispatch();
  const mapRef = useRef<MapView>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMovedMap, setHasMovedMap] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterConfig>({});
  const insets = useSafeAreaInsets();

  const [region, setRegion] = useState(latitude && longitude ? {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [locationReady, setLocationReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const { listings, loading } = useAppSelector((state) => state.marketplace);
  const { zoneAvailability } = useAppSelector((state) => state.analytics);

  // Analytics zones overlay
  const [analyticsZones, setAnalyticsZones] = useState<any[]>([]);
  
  useEffect(() => {
    const loadZones = async () => {
      const zones = await analyticsService.getZones();
      setAnalyticsZones(zones);
    };
    loadZones();
  }, []);

  // Initialize geofencing hook
  const { currentZone, sessionId } = useAnalyticsGeofencing(
    analyticsZones.map(z => ({
      id: z.id,
      name: z.name,
      centerLat: z.centroidLat,
      centerLon: z.centroidLon,
      radius: 300,
    })),
    true
  );

  const selectedListing = selectedMarker !== null
    ? listings.find((l: any) => l.id === selectedMarker)
    : null;

  // Fetch zone availability when a listing is selected and has a zoneId
  useEffect(() => {
    if (selectedListing?.zoneId) {
      dispatch(fetchZoneAvailability(selectedListing.zoneId));
    }
  }, [selectedListing?.zoneId]);

  const selectedZoneAvail = selectedListing?.zoneId
    ? zoneAvailability[selectedListing.zoneId]
    : null;

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  // Fetch listings for a given region
  const fetchListings = useCallback(async (lat: number, lon: number, filters?: FilterConfig) => {
    try {
      const params: any = {
        latitude: lat,
        longitude: lon,
        radius: 3,
        ...(searchQuery ? { q: searchQuery } : {}),
      };
      
      if (filters) {
        if (filters.minPrice != null) params.minPrice = filters.minPrice;
        if (filters.maxPrice != null) params.maxPrice = filters.maxPrice;
        if (filters.slotTypes?.length) params.slotType = filters.slotTypes.join(',');
        if (filters.amenities?.length) params.amenities = filters.amenities.join(',');
        if (filters.availableNow) params.status = 'available';
      }
      
      await dispatch(searchListings(params)).unwrap();
    } catch (err) {
      ;
    }
  }, [dispatch, searchQuery]);

  const handleApplyFilters = (filters: FilterConfig) => {
    setActiveFilters(filters);
    fetchListings(region.latitude, region.longitude, filters);
  };

  const centerOnUser = useCallback(async () => {
    // If params were passed from ParkingDetails, use those instead
    if (latitude && longitude) {
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
      
      // Fetch listings for this location
      fetchListings(latitude, longitude);
      
      // If focusSpotId provided, select it after listings load
      if (focusSpotId) {
        setTimeout(() => setSelectedMarker(focusSpotId), 1000);
      }
      setLocationReady(true);
      return;
    }
    
    // Otherwise, use user's current location (original behavior)
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
  }, [fetchListings, latitude, longitude, focusSpotId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      fetchListings(region.latitude, region.longitude, activeFilters);
    }, 400);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchListings(region.latitude, region.longitude, activeFilters);
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
    if (!selectedListing) return;
    const lat = selectedListing.latitude;
    const lng = selectedListing.longitude;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const label = selectedListing.title || selectedListing.address;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  const handleFilterPress = () => {
    setFilterModalVisible(true);
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    fetchListings(region.latitude, region.longitude);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar */}
      <View style={[styles.searchBarContainer, { top: insets.top + 8 }]}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
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
          <MaterialCommunityIcons 
            name="tune" 
            size={20} 
            color={hasActiveFilters ? colors.primary : colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      {/* Clear Filters Chip */}
      {hasActiveFilters && (
        <TouchableOpacity
          style={[styles.clearFiltersChip, { top: insets.top + 64 }]}
          onPress={handleClearFilters}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="close" size={14} color={colors.error} />
          <Text style={styles.clearFiltersText}>Clear Filters</Text>
        </TouchableOpacity>
      )}

      {/* Analytics Zone Indicator */}
      {currentZone && (
        <View style={styles.zoneIndicator}>
          <View style={styles.zoneIndicatorDot} />
          <Text style={styles.zoneIndicatorText}>
            In {currentZone.name}
          </Text>
        </View>
      )}

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
          <Circle
            center={{
              latitude: region.latitude,
              longitude: region.longitude,
            }}
            radius={3000}
            fillColor="rgba(16, 183, 127, 0.1)"
            strokeColor="rgba(16, 183, 127, 0.5)"
            strokeWidth={2}
          />
          {/* Analytics Zone Overlays */}
          {analyticsZones.map((zone: any) => (
            <React.Fragment key={zone.id}>
              <Circle
                center={{
                  latitude: zone.centroidLat,
                  longitude: zone.centroidLon,
                }}
                radius={300}
                fillColor={currentZone?.id === zone.id ? 'rgba(16, 183, 127, 0.2)' : 'rgba(100, 116, 139, 0.1)'}
                strokeColor={currentZone?.id === zone.id ? 'rgba(16, 183, 127, 0.7)' : 'rgba(100, 116, 139, 0.4)'}
                strokeWidth={currentZone?.id === zone.id ? 3 : 2}
              />
              {/* Zone label */}
              <Marker
                coordinate={{
                  latitude: zone.centroidLat,
                  longitude: zone.centroidLon,
                }}
                title={zone.name}
                description={currentZone?.id === zone.id ? `Active session: ${sessionId}` : 'Tap for availability'}
              />
            </React.Fragment>
          ))}
        </MapView>

        {/* Search this area button */}
        {hasMovedMap && (
          <TouchableOpacity
            style={[styles.searchAreaButton, { top: insets.top + 110 }]}
            onPress={async () => {
              setHasMovedMap(false);
              await fetchListings(region.latitude, region.longitude, activeFilters);
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
            <MaterialCommunityIcons name="map-marker-off-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No parking spots found</Text>
          </View>
        )}

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="plus" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.controlBorder]} onPress={handleZoomOut} activeOpacity={0.7}>
            <MaterialCommunityIcons name="minus" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, styles.myLocationButton]}
            onPress={handleRecenter}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet Preview */}
      <ListingBottomSheet
        listing={selectedListing}
        zoneAvailability={selectedZoneAvail}
        onViewDetails={handleViewDetails}
        onDirections={handleDirections}
        onQuickBook={() => navigation.navigate('ParkingDetail', { spotId: selectedListing?.id, quickBook: true })}
        onClose={() => setSelectedMarker(null)}
      />

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />
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
  clearFiltersChip: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  searchAreaButton: {
    position: 'absolute',
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
  zoneIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 183, 127, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 100,
  },
  zoneIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  zoneIndicatorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ExploreMap;
