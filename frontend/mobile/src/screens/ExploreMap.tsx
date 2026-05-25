import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { useAnalyticsGeofencing } from '../hooks/useAnalyticsGeofencing';
import { analyticsService } from '../services/analytics';
import { marketplaceAPI } from '../services/api';
import { ListingBottomSheet } from '../components/ListingBottomSheet';
import { FilterModal, FilterConfig } from '../components/FilterModal';
import { FilterChips, SortOption } from '../components/FilterChips';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { useAutocomplete } from '../hooks/useAutocomplete';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { clusterMarkers, ClusteredMarker } from '../utils/clusterMarkers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import type { ParkingCandidateDiscoveryPin } from '../types';

const { width, height } = Dimensions.get('window');

const CACHE_KEY = 'parkpal_cached_listings';
const NEUTRAL_REGION = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 80,
  longitudeDelta: 80,
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#838383' }] },
  { featureType: 'road', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', stylers: [{ color: '#0f1a14' }] },
];

const getOccupancyColor = (percentage: number): string => {
  if (percentage >= 80) return '#ef4444';
  if (percentage >= 50) return '#f59e0b';
  return '#10b77f';
};

const PriceMarker = React.memo(({ listing, selected, onPress, occupancyColor }: {
  listing: any;
  selected: boolean;
  onPress: (id: any) => void;
  occupancyColor: string | null;
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
        accessible
        accessibilityLabel={`${listing.title || listing.address}: ${price} per hour`}
        accessibilityRole="button"
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
        {occupancyColor && (
          <View
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: occupancyColor,
              borderWidth: 1,
              borderColor: '#fff',
            }}
          />
        )}
      </View>
    </Marker>
  );
});

const ClusterMarker = React.memo(({ cluster, onPress }: {
  cluster: ClusteredMarker;
  onPress: () => void;
}) => (
  <Marker
    coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
    onPress={onPress}
    tracksViewChanges={false}
    anchor={{ x: 0.5, y: 0.5 }}
  >
    <View
      accessible
      accessibilityLabel={`${cluster.count} parking spots clustered. Tap to zoom in.`}
      accessibilityRole="button"
      collapsable={false}
      style={{
        backgroundColor: '#10b77f',
        borderWidth: 2,
        borderColor: '#ffffff',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
        {cluster.count}
      </Text>
    </View>
  </Marker>
));

const CandidateMarker = React.memo(({ candidate, selected, onPress }: {
  candidate: ParkingCandidateDiscoveryPin;
  selected: boolean;
  onPress: (candidateKey: string) => void;
}) => {
  const [tracksChanges, setTracksChanges] = React.useState(true);
  const markerKey = `candidate-${candidate.id}`;
  const bg = selected ? '#f59e0b' : '#ffffff';
  const iconColor = selected ? '#ffffff' : '#f59e0b';
  const borderColor = candidate.isPreview ? '#f59e0b' : '#10b77f';

  return (
    <Marker
      coordinate={{ latitude: candidate.latitude, longitude: candidate.longitude }}
      onPress={() => onPress(markerKey)}
      tracksViewChanges={tracksChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        accessible
        accessibilityLabel={`${candidate.title}. Preview parking candidate, not bookable.`}
        accessibilityRole="button"
        collapsable={false}
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: bg,
          borderWidth: 2,
          borderColor,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
        }}
        onLayout={() => setTracksChanges(false)}
      >
        <MaterialCommunityIcons
          name={candidate.isPreview ? 'map-marker-question' : 'map-marker-radius'}
          size={22}
          color={iconColor}
        />
      </View>
    </Marker>
  );
});

export const ExploreMap: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { latitude, longitude, focusSpotId, candidateId } = route.params || {};
  const hasRouteLocation = typeof latitude === 'number' && typeof longitude === 'number';
  const dispatch = useAppDispatch();
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMovedMap, setHasMovedMap] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterConfig>({});
  const [activeSort, setActiveSort] = useState<SortOption>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showZoneOverlays, setShowZoneOverlays] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [zoneIndicatorVisible, setZoneIndicatorVisible] = useState(true);
  const [zoneOccupancyMap, setZoneOccupancyMap] = useState<Record<string, number>>({});
  const [cachedListings, setCachedListings] = useState<any[]>([]);
  const [candidatePins, setCandidatePins] = useState<ParkingCandidateDiscoveryPin[]>([]);
  const insets = useSafeAreaInsets();
  const { history, addToHistory, clearHistory, removeFromHistory } = useSearchHistory();
  const { isConnected } = useNetworkStatus();

  const [region, setRegion] = useState(hasRouteLocation ? {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : NEUTRAL_REGION);
  const [locationReady, setLocationReady] = useState(hasRouteLocation);
  const [hasLocationContext, setHasLocationContext] = useState(hasRouteLocation);
  const [mapReady, setMapReady] = useState(false);

  const { listings, loading } = useAppSelector((state) => state.marketplace);
  const { zoneAvailability } = useAppSelector((state) => state.analytics);

  const suggestions = useAutocomplete(searchQuery, listings);

  const displayItems = searchQuery.trim() ? suggestions : history;

  const [analyticsZones, setAnalyticsZones] = useState<any[]>([]);

  useEffect(() => {
    const loadZones = async () => {
      const zones = await analyticsService.getZones();
      setAnalyticsZones(zones);
    };
    loadZones();
  }, []);

  useEffect(() => {
    const loadZoneMetrics = async () => {
      const metrics: Record<string, number> = {};
      for (const zone of analyticsZones) {
        try {
          const result = await analyticsService.getZoneAvailability(zone.id);
          if (result?.occupancyPercentage != null) {
            metrics[zone.id] = result.occupancyPercentage;
          }
        } catch (e) {
          ;
        }
      }
      setZoneOccupancyMap(metrics);
    };
    if (analyticsZones.length > 0) {
      loadZoneMetrics();
    }
  }, [analyticsZones]);

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

  useEffect(() => {
    if (currentZone) {
      setZoneIndicatorVisible(true);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setZoneIndicatorVisible(false);
      }, 5000);
    }
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [currentZone]);

  const resetZoneIndicatorTimer = useCallback(() => {
    if (currentZone) {
      setZoneIndicatorVisible(true);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setZoneIndicatorVisible(false);
      }, 5000);
    }
  }, [currentZone]);

  const selectedListing = selectedMarker !== null
    ? (isConnected ? listings : cachedListings).find((l: any) => l.id === selectedMarker)
    : null;
  const selectedCandidate = typeof selectedMarker === 'string' && selectedMarker.startsWith('candidate-')
    ? candidatePins.find((candidate) => `candidate-${candidate.id}` === selectedMarker)
    : null;
  const selectedMapEntity = selectedListing || (selectedCandidate ? {
    ...selectedCandidate,
    id: `candidate-${selectedCandidate.id}`,
    description: '',
    photos: [],
    amenities: [],
    rating: null,
    reviewCount: 0,
    distance: null,
    pricePerHour: null,
    canBook: false,
    title: selectedCandidate.title,
    address: selectedCandidate.address,
  } : null);

  useEffect(() => {
    if (selectedListing?.zoneId) {
      dispatch(fetchZoneAvailability(selectedListing.zoneId));
    }
  }, [selectedListing?.zoneId]);

  const selectedZoneAvail = selectedListing?.zoneId
    ? zoneAvailability[selectedListing.zoneId]
    : null;

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  const getListingOccupancyColor = useCallback((listing: any): string | null => {
    if (!listing.zoneId) return null;
    const occupancy = zoneOccupancyMap[listing.zoneId];
    if (occupancy == null) return null;
    return getOccupancyColor(occupancy);
  }, [zoneOccupancyMap]);

  const displayListings = isConnected ? listings : cachedListings;

  const fetchCandidatePins = useCallback(async (lat: number, lon: number) => {
    if (!isConnected) return;
    try {
      const response = await marketplaceAPI.getDiscoveryCandidates({ lat, lon, radius: 3 });
      setCandidatePins(response.data?.data || []);
    } catch (err) {
      setCandidatePins([]);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!candidateId) return;
    const candidateMarkerId = `candidate-${candidateId}`;
    const focusedCandidate = candidatePins.find((candidate) => candidate.id === Number(candidateId));
    if (!focusedCandidate) return;

    setSelectedMarker(candidateMarkerId);
    mapRef.current?.animateToRegion({
      latitude: focusedCandidate.latitude,
      longitude: focusedCandidate.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  }, [candidateId, candidatePins]);

  const sortedListings = useMemo(() => {
    if (!activeSort || !displayListings.length) return displayListings;

    return [...displayListings].sort((a, b) => {
      switch (activeSort) {
        case 'cheapest':
          return (a.pricePerHour ?? Infinity) - (b.pricePerHour ?? Infinity);
        case 'nearest':
          return (a.distance ?? 0) - (b.distance ?? 0);
        case 'top_rated':
          const aRating = a.rating ?? -1;
          const bRating = b.rating ?? -1;
          return bRating - aRating;
        case 'available_now':
          return 0;
        default:
          return 0;
      }
    });
  }, [displayListings, activeSort]);

  const regionKey = useMemo(() => {
    const lat = Math.round(region.latitude * 1000);
    const lon = Math.round(region.longitude * 1000);
    const delta = Math.round(region.latitudeDelta * 1000);
    return `${lat}-${lon}-${delta}`;
  }, [region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta]);

  const clustered = useMemo(() => {
    return clusterMarkers(sortedListings, region);
  }, [sortedListings, regionKey]);

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

      const result = await dispatch(searchListings(params)).unwrap();
      fetchCandidatePins(lat, lon);

      if (result?.length) {
        try {
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
            listings: result,
            timestamp: Date.now(),
            lat,
            lon,
          }));
        } catch (e) {
          ;
        }
      }
    } catch (err) {
      ;
    }
  }, [dispatch, searchQuery, fetchCandidatePins]);

  useEffect(() => {
    if (!isConnected) {
      const loadCached = async () => {
        try {
          const stored = await AsyncStorage.getItem(CACHE_KEY);
          if (stored) {
            const { listings: cached } = JSON.parse(stored);
            setCachedListings(cached);
          }
        } catch (e) {
          ;
        }
      };
      loadCached();
    }
  }, [isConnected]);

  const handleApplyFilters = (filters: FilterConfig) => {
    if (!isConnected || !hasLocationContext) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setActiveFilters(filters);
    fetchListings(region.latitude, region.longitude, filters);
  };

  const centerOnUser = useCallback(async () => {
    if (hasRouteLocation) {
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
      setHasLocationContext(true);

      if (isConnected) {
        fetchListings(latitude, longitude);
      }

      if (candidateId) {
        setTimeout(() => setSelectedMarker(`candidate-${candidateId}`), 1000);
      } else if (focusSpotId) {
        setTimeout(() => setSelectedMarker(focusSpotId), 1000);
      }
      setLocationReady(true);
      return;
    }

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
        setHasLocationContext(true);
        if (isConnected) {
          fetchListings(location.coords.latitude, location.coords.longitude);
        }
      } else {
        setCandidatePins([]);
        setHasLocationContext(false);
      }
    } catch {
      setCandidatePins([]);
      setHasLocationContext(false);
    } finally {
      setLocationReady(true);
    }
  }, [fetchListings, latitude, longitude, candidateId, focusSpotId, isConnected, hasRouteLocation]);

  useFocusEffect(
    useCallback(() => {
      centerOnUser();
    }, [centerOnUser])
  );

  useEffect(() => {
    if (!isConnected || !hasLocationContext) return;
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
  }, [searchQuery, isConnected, hasLocationContext]);

  const handleRefresh = useCallback(async () => {
    if (!isConnected || !hasLocationContext) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    await fetchListings(region.latitude, region.longitude, activeFilters);
    setRefreshing(false);
  }, [fetchListings, isConnected, hasLocationContext]);

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

  const handleMarkerPress = useCallback((markerId: string | number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSelectedMarker(markerId);
    resetZoneIndicatorTimer();
    const listing = typeof markerId === 'string' && markerId.startsWith('candidate-')
      ? candidatePins.find((candidate) => `candidate-${candidate.id}` === markerId)
      : (isConnected ? listings : cachedListings).find((l: any) => l.id === markerId);
    if (listing) {
      mapRef.current?.animateToRegion({
        latitude: listing.latitude,
        longitude: listing.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  }, [listings, cachedListings, candidatePins, isConnected, resetZoneIndicatorTimer]);

  const handleViewDetails = () => {
    if (selectedListing) {
      navigation.navigate('ParkingDetail', { spotId: selectedListing.id });
    }
  };

  const handleDirections = () => {
    if (!selectedMapEntity) return;
    const lat = selectedMapEntity.latitude;
    const lng = selectedMapEntity.longitude;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const label = selectedMapEntity.title || selectedMapEntity.address;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  const handleFilterPress = () => {
    if (!isConnected || !hasLocationContext) return;
    setFilterModalVisible(true);
  };

  const handleClearFilters = () => {
    if (!isConnected || !hasLocationContext) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setActiveFilters({});
    fetchListings(region.latitude, region.longitude);
  };

  const handleSortChange = (sort: SortOption) => {
    setActiveSort(sort);
  };

  const handleSuggestionPress = (suggestion: string) => {
    if (!isConnected) return;
    setSearchQuery(suggestion);
    addToHistory(suggestion);
    setIsFocused(false);
    if (hasLocationContext) {
      fetchListings(region.latitude, region.longitude, activeFilters);
    }
  };

  const handleSubmitEditing = () => {
    if (searchQuery.trim()) {
      addToHistory(searchQuery);
    }
    setIsFocused(false);
  };

  const handleHistoryItemRemove = (item: string) => {
    removeFromHistory(item);
  };

  const handleRegionChangeComplete = useCallback((r: any) => {
    setRegion(r);
    if (regionChangeDebounceRef.current) clearTimeout(regionChangeDebounceRef.current);
    regionChangeDebounceRef.current = setTimeout(() => {
      setHasMovedMap(true);
      resetZoneIndicatorTimer();
    }, 500);
  }, [resetZoneIndicatorTimer]);

  const handleSearchAreaPress = async () => {
    if (!isConnected) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    setHasMovedMap(false);
    setHasLocationContext(true);
    if (searchQuery.trim()) addToHistory(searchQuery);
    await fetchListings(region.latitude, region.longitude, activeFilters);
  };

  const filterChipsTop = insets.top + 64;
  const suggestionsTop = insets.top + 60;
  const clearFiltersTop = hasActiveFilters ? filterChipsTop + 44 : undefined;
  const searchAreaTop = filterChipsTop + 50;
  const offlineBannerTop = insets.top + 16;

  const styles = useMemo(() => StyleSheet.create({
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
    suggestionsDropdown: {
      position: 'absolute',
      left: 16,
      right: 16,
      backgroundColor: colors.white,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      maxHeight: 200,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
      gap: 10,
    },
    suggestionText: {
      flex: 1,
      fontSize: 14,
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
    filterButtonDisabled: {
      opacity: 0.5,
    },
    offlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6b7280',
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 8,
      position: 'absolute',
      left: 16,
      right: 16,
      zIndex: 101,
      borderRadius: 8,
    },
    offlineBannerText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '600',
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
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    searchAreaButtonDisabled: {
      backgroundColor: '#6b7280',
      opacity: 0.7,
    },
    searchAreaText: {
      color: colors.white,
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
      left: 16,
      zIndex: 100,
      gap: 6,
    },
    zoneOccBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    zoneOccText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
    },
    zoneIndicatorText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.searchBarContainer, { top: insets.top + 8 }]} shouldRasterizeIOS>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search parking spots..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onSubmitEditing={handleSubmitEditing}
            accessibilityLabel="Search parking spots"
            accessibilityRole="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => { setSearchQuery(''); inputRef.current?.blur(); }}
              activeOpacity={0.7}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, (!isConnected || !hasLocationContext) && styles.filterButtonDisabled]}
          onPress={handleFilterPress}
          activeOpacity={0.7}
          disabled={!isConnected || !hasLocationContext}
          accessibilityLabel={hasActiveFilters ? "Filter parking spots, filters active" : "Filter parking spots"}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="tune"
            size={20}
            color={hasActiveFilters && isConnected && hasLocationContext ? colors.primary : (isConnected && hasLocationContext ? colors.textSecondary : colors.textTertiary)}
          />
        </TouchableOpacity>
      </View>

      {!isConnected && (
        <View style={[styles.offlineBanner, { top: offlineBannerTop }]} accessibilityLabel="Offline mode: showing cached results" accessible>
          <MaterialCommunityIcons name="wifi-off" size={16} color={colors.white} />
          <Text style={styles.offlineBannerText}>Offline — showing cached results</Text>
        </View>
      )}

      {isFocused && displayItems.length > 0 && (
        <View style={[styles.suggestionsDropdown, { top: suggestionsTop }]}>
          {displayItems.map((item, index) => (
            <TouchableOpacity
              key={`${item}-${index}`}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(item)}
              activeOpacity={0.7}
              accessibilityLabel={`Search for ${item}`}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name={!searchQuery.trim() ? "history" : "magnify"}
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.suggestionText} numberOfLines={1}>
                {item}
              </Text>
              {!searchQuery.trim() && (
                <TouchableOpacity
                  onPress={() => handleHistoryItemRemove(item)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Remove ${item} from search history`}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="close" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FilterChips activeSort={activeSort} onSortChange={handleSortChange} />

      {hasActiveFilters && clearFiltersTop !== undefined && (
        <TouchableOpacity
          style={[styles.clearFiltersChip, { top: clearFiltersTop }]}
          onPress={handleClearFilters}
          activeOpacity={0.7}
          accessibilityLabel="Clear all filters"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="close" size={14} color={colors.error} />
          <Text style={styles.clearFiltersText}>Clear Filters</Text>
        </TouchableOpacity>
      )}

      {currentZone && zoneIndicatorVisible && (
        <TouchableOpacity
          style={[styles.zoneIndicator, { top: isConnected ? insets.top + 16 : offlineBannerTop + 44 }]}
          onPress={() => { setZoneIndicatorVisible(false); if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current); }}
          activeOpacity={0.7}
          accessibilityLabel={`Currently in ${currentZone.name}, ${zoneOccupancyMap[currentZone.id] ?? 'unknown'}% occupancy`}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="map-marker-radius" size={14} color={colors.white} />
          <Text style={styles.zoneIndicatorText}>{currentZone.name}</Text>
          {zoneOccupancyMap[currentZone.id] != null && (
            <View style={styles.zoneOccBadge}>
              <Text style={styles.zoneOccText}>{zoneOccupancyMap[currentZone.id]}%</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.mapContainer} removeClippedSubviews>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onMapReady={() => { setMapReady(true); centerOnUser(); }}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          customMapStyle={isDark ? DARK_MAP_STYLE : []}
        >
          {clustered.map((cm: ClusteredMarker) => {
            if (cm.isCluster) {
              return (
                <ClusterMarker
                  key={cm.id}
                  cluster={cm}
                  onPress={() => {
                    const newRegion = {
                      ...region,
                      latitudeDelta: region.latitudeDelta * 0.5,
                      longitudeDelta: region.longitudeDelta * 0.5,
                    };
                    mapRef.current?.animateToRegion({
                      latitude: cm.latitude,
                      longitude: cm.longitude,
                      latitudeDelta: newRegion.latitudeDelta,
                      longitudeDelta: newRegion.longitudeDelta,
                    }, 400);
                  }}
                />
              );
            }
            const listing = cm.listings[0];
            return (
              <PriceMarker
                key={listing.id}
                listing={listing}
                selected={selectedMarker === listing.id}
                onPress={handleMarkerPress}
                occupancyColor={getListingOccupancyColor(listing)}
              />
            );
          })}
          {isConnected && candidatePins.map((candidate) => (
            <CandidateMarker
              key={`candidate-${candidate.id}`}
              candidate={candidate}
              selected={selectedMarker === `candidate-${candidate.id}`}
              onPress={handleMarkerPress}
            />
          ))}
          {hasLocationContext && (
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
          )}
          {showZoneOverlays && analyticsZones.map((zone: any) => {
            const occupancy = zoneOccupancyMap[zone.id] ?? 50;
            const isActive = currentZone?.id === zone.id;
            return (
              <React.Fragment key={zone.id}>
                <Circle
                  center={{
                    latitude: zone.centroidLat,
                    longitude: zone.centroidLon,
                  }}
                  radius={300}
                  fillColor={isActive ? 'rgba(16, 183, 127, 0.2)' : 'rgba(100, 116, 139, 0.1)'}
                  strokeColor={isActive ? 'rgba(16, 183, 127, 0.7)' : 'rgba(100, 116, 139, 0.4)'}
                  strokeWidth={isActive ? 3 : 2}
                />
                <Marker
                  coordinate={{
                    latitude: zone.centroidLat,
                    longitude: zone.centroidLon,
                  }}
                  title={zone.name}
                  description={isActive ? `Active session: ${sessionId}` : 'Tap for availability'}
                />
              </React.Fragment>
            );
          })}
          {showHeatmap && showZoneOverlays && analyticsZones.map((zone: any) => {
            const occupancy = zoneOccupancyMap[zone.id] ?? 50;
            const fillOpacity = 0.15 + (occupancy / 100) * 0.25;
            const fillColor = occupancy >= 80
              ? `rgba(239, 68, 68, ${fillOpacity})`
              : occupancy >= 50
                ? `rgba(245, 158, 11, ${fillOpacity})`
                : `rgba(16, 183, 127, ${fillOpacity})`;
            return (
              <Circle
                key={`heatmap-${zone.id}`}
                center={{ latitude: zone.centroidLat, longitude: zone.centroidLon }}
                radius={500}
                fillColor={fillColor}
                strokeColor="transparent"
                strokeWidth={0}
              />
            );
          })}
        </MapView>

        {hasMovedMap && (
          <TouchableOpacity
            style={[styles.searchAreaButton, !isConnected && styles.searchAreaButtonDisabled, { top: searchAreaTop }]}
            onPress={handleSearchAreaPress}
            activeOpacity={0.8}
            disabled={!isConnected}
            accessibilityLabel="Search this area for parking spots"
            accessibilityRole="button"
          >
            <Text style={styles.searchAreaText}>
              {isConnected ? 'Search this area' : 'Search unavailable offline'}
            </Text>
          </TouchableOpacity>
        )}

        {!isConnected && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.textSecondary} />
          </View>
        )}

        {loading && isConnected && hasLocationContext && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!loading && !isConnected && displayListings.length === 0 && (
          <View style={styles.emptyState} accessibilityLabel="No cached data available" accessible>
            <MaterialCommunityIcons name="wifi-off" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No cached data available</Text>
          </View>
        )}

        {!loading && locationReady && isConnected && !hasLocationContext && (
          <View style={styles.emptyState} accessibilityLabel="Location needed to find nearby parking" accessible>
            <MaterialCommunityIcons name="map-marker-question-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>Enable location or search an area to find nearby parking.</Text>
          </View>
        )}

        {!loading && isConnected && hasLocationContext && listings.length === 0 && candidatePins.length === 0 && (
          <View style={styles.emptyState} accessibilityLabel="No parking spots found in this area" accessible>
            <MaterialCommunityIcons name="map-marker-off-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No parking spots found</Text>
          </View>
        )}

        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn} activeOpacity={0.7} accessibilityLabel="Zoom in" accessibilityRole="button">
            <MaterialCommunityIcons name="plus" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.controlBorder]} onPress={handleZoomOut} activeOpacity={0.7} accessibilityLabel="Zoom out" accessibilityRole="button">
            <MaterialCommunityIcons name="minus" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, styles.myLocationButton]}
            onPress={handleRecenter}
            activeOpacity={0.7}
            accessibilityLabel="Recenter map"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, showZoneOverlays && { backgroundColor: colors.primary + '15' }]}
            onPress={() => setShowZoneOverlays(!showZoneOverlays)}
            activeOpacity={0.7}
            accessibilityLabel={showZoneOverlays ? "Hide zone overlays" : "Show zone overlays"}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="layers" size={20} color={showZoneOverlays ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
          {showZoneOverlays && (
            <TouchableOpacity
              style={[styles.controlButton, showHeatmap && { backgroundColor: colors.primary + '15' }]}
              onPress={() => setShowHeatmap(!showHeatmap)}
              activeOpacity={0.7}
              accessibilityLabel={showHeatmap ? "Hide heatmap" : "Show heatmap"}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="gradient-vertical" size={20} color={showHeatmap ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ListingBottomSheet
        listing={selectedMapEntity}
        zoneAvailability={selectedListing ? selectedZoneAvail : null}
        onViewDetails={handleViewDetails}
        onDirections={handleDirections}
        onQuickBook={() => {
          if (!selectedListing) return;
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
          navigation.navigate('ParkingDetail', { spotId: selectedListing?.id, quickBook: true });
        }}
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
