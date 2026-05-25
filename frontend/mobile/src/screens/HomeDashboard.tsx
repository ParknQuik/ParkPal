import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../store';
import { searchListings, getMyBookings } from '../store/slices/marketplaceSlice';
import { getCurrentLocation } from '../store/slices/locationSlice';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { haptics } from '../utils/haptics';
import { accessibility } from '../utils/accessibility';
import { useDebouncedCallback } from '../utils/performance';
import { ListLoadingState, RetryableFailureState } from '../components/ListState';
import { marketplaceAPI } from '../services/api';
import type { MarketplaceListing, ParkingCandidateDiscoveryPin } from '../types';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

type HomeListingItem = MarketplaceListing & {
  kind: 'listing';
  canBook: true;
};

type HomeCandidateItem = ParkingCandidateDiscoveryPin & {
  kind: 'candidate';
  canBook: false;
  pricePerHour: null;
  rating: null;
  photos: [];
};

type HomeParkingItem = HomeListingItem | HomeCandidateItem;

type NearbyLocation = {
  latitude: number;
  longitude: number;
};

const getDistanceKm = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) => {
  const earthRadiusKm = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const normalizeHomeListing = (listing: MarketplaceListing): HomeListingItem => ({
  ...listing,
  kind: 'listing',
  canBook: true,
});

const normalizeHomeCandidate = (
  candidate: ParkingCandidateDiscoveryPin,
  origin: { latitude: number; longitude: number }
): HomeCandidateItem => ({
  ...candidate,
  source: 'google_candidate',
  canBook: false,
  isPreview: true,
  kind: 'candidate',
  distance: candidate.distance ?? getDistanceKm(origin, candidate),
  pricePerHour: null,
  rating: null,
  photos: [],
});

export const HomeDashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [candidateItems, setCandidateItems] = useState<HomeCandidateItem[]>([]);
  const [resolvedLocation, setResolvedLocation] = useState<NearbyLocation | null>(null);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const navigation = useNavigation() as any;
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const { currentLocation } = useAppSelector((state) => state.location);
  const { listings, bookings, filters, loading, error } = useAppSelector((state) => state.marketplace);
  const userName = user?.name || 'Guest';
  const nearbyLocation = currentLocation || resolvedLocation;
  const homeParkingItems = useMemo<HomeParkingItem[]>(() => {
    const listingItems = listings.map(normalizeHomeListing);
    const candidates = [...candidateItems].sort(
      (a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY)
    );

    return [...listingItems, ...candidates];
  }, [listings, candidateItems]);
  const needsLocation = !nearbyLocation && !resolvingLocation;
  const showInitialLoading = (resolvingLocation || loading) && !needsLocation && !refreshing && homeParkingItems.length === 0;
  const showInitialFailure = Boolean(error) && homeParkingItems.length === 0;
  // Force re-render when user is updated (for profile image changes)
  const [, forceUpdate] = useState(0);

  // Hook calls at the top level - before any returns
  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [user?.profileImageUrl]);

  const statusBarStyle = useStatusBarStyle();

  const fetchDiscoveryCandidates = useCallback(async (lat: number, lon: number) => {
    try {
      const response = await marketplaceAPI.getDiscoveryCandidates({ lat, lon, radius: 3 });
      const origin = { latitude: lat, longitude: lon };
      const candidates = (response.data?.data || []).map((candidate) =>
        normalizeHomeCandidate(candidate, origin)
      );
      setCandidateItems(candidates);
    } catch {
      setCandidateItems([]);
    }
  }, []);

  const resolveNearbyLocation = useCallback(async (): Promise<NearbyLocation | null> => {
    if (currentLocation) {
      setResolvedLocation(currentLocation);
      return currentLocation;
    }

    try {
      setResolvingLocation(true);
      const result = await dispatch(getCurrentLocation()).unwrap();
      const location = {
        latitude: result.latitude,
        longitude: result.longitude,
      };
      setResolvedLocation(location);
      return location;
    } catch {
      setResolvedLocation(null);
      setCandidateItems([]);
      return null;
    } finally {
      setResolvingLocation(false);
    }
  }, [currentLocation, dispatch]);

  useEffect(() => {
    const init = async () => {
      const location = await resolveNearbyLocation();
      if (location) {
        dispatch(searchListings({ latitude: location.latitude, longitude: location.longitude, radius: 3 }));
        fetchDiscoveryCandidates(location.latitude, location.longitude);
      }
      if (user?.id) {
        dispatch(getMyBookings());
      }
    };
    init();
  }, [dispatch, user?.id]);

  const fetchData = useCallback(async () => {
    try {
      const location = await resolveNearbyLocation();
      if (location) {
        await Promise.allSettled([
          dispatch(searchListings({ latitude: location.latitude, longitude: location.longitude, radius: 3 })).unwrap(),
          fetchDiscoveryCandidates(location.latitude, location.longitude),
        ]);
      }
      if (user?.id) {
        await dispatch(getMyBookings()).unwrap();
      }
    } catch (err) {
      // silently handle error
    }
  }, [dispatch, fetchDiscoveryCandidates, resolveNearbyLocation, user?.id]);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setSearchQuery(''); // Clear search query on refresh
    setRefreshing(true);
    const refresh = async () => {
      const fetches: Promise<any>[] = [];
      const location = await resolveNearbyLocation();
      if (location) {
        fetches.push(dispatch(searchListings({ latitude: location.latitude, longitude: location.longitude, radius: 3 })));
        fetches.push(fetchDiscoveryCandidates(location.latitude, location.longitude));
      }
      if (user?.id) {
        fetches.push(dispatch(getMyBookings()));
      }
      await Promise.allSettled(fetches);
    };
    refresh().finally(() => {
      setRefreshing(false);
    });
  }, [dispatch, currentLocation, user?.id, refreshing]);

  const debouncedSearch = useDebouncedCallback((query: string) => {
    if (nearbyLocation && query.trim()) {
      dispatch(
        searchListings({
          q: query.trim(),
          latitude: nearbyLocation.latitude,
          longitude: nearbyLocation.longitude,
          radius: 3,
          sortBy: filters.sortBy,
        })
      );
      fetchDiscoveryCandidates(nearbyLocation.latitude, nearbyLocation.longitude);
    } else if (!query.trim() && nearbyLocation) {
      dispatch(searchListings({ latitude: nearbyLocation.latitude, longitude: nearbyLocation.longitude, radius: 3 }));
      fetchDiscoveryCandidates(nearbyLocation.latitude, nearbyLocation.longitude);
    }
  }, 500);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleSpotPress = useCallback(async (listingId: string) => {
    await haptics.light();
    navigation.navigate('ParkingDetail', { spotId: listingId });
  }, [navigation]);

  const handleCandidatePress = useCallback(async (candidate: HomeCandidateItem) => {
    await haptics.light();
    navigation.navigate('Explore', {
      candidateId: candidate.id,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    });
  }, [navigation]);

  const handleNotificationPress = useCallback(async () => {
    navigation.navigate('Notifications' as never);
  }, [navigation]);

  const handleExplorePress = useCallback(async () => {
    navigation.navigate('Explore' as never);
  }, [navigation]);

  const handleActivityPress = useCallback(async () => {
    navigation.navigate('MyBookings' as never);
  }, [navigation]);

  const handleProfilePress = useCallback(async () => {
    navigation.navigate('Profile' as never);
  }, [navigation]);

  const handleAddPress = useCallback(async () => {
    await haptics.medium();
    navigation.navigate('ListSpot' as never);
  }, [navigation]);

  const handleSeeAllPress = useCallback(async () => {
    navigation.navigate('Explore' as never);
  }, [navigation]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    greetingHeader: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      marginBottom: spacing.md,
    },
    greetingLeft: {
      gap: spacing.sm,
    },
    greetingBrandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    headerAvatarText: {
      ...typography.h5,
      color: colors.white,
      fontWeight: '700',
    },
    greetingTitle: {
      ...typography.h2,
      color: colors.textPrimary,
    },
    greetingSubtitle: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginTop: 2,
    },
    parkPalTitle: {
      ...typography.h4,
      color: colors.primary,
      fontWeight: '800',
      flexShrink: 1,
    },
    header: {
      backgroundColor: colors.appHeaderBackground,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl + spacing.xl,
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xxl,
      paddingHorizontal: spacing.xl,
    },
    headerLeft: {
      flex: 1,
    },
    avatarContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    avatar: {
      width: '100%',
      height: '100%',
    },
    appTitle: {
      ...typography.h3,
      color: colors.white,
      fontWeight: '800',
      marginTop: 4,
    },
    appSubtitle: {
      ...typography.bodySmall,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    notificationButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    notificationIcon: {
      fontSize: 20,
      color: colors.white,
    },
    greetingContainer: {
      marginTop: spacing.xs,
      paddingHorizontal: spacing.xl,
    },
    greeting: {
      ...typography.h2,
       color: colors.textPrimary,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 20,
      backgroundColor: colors.background,
    },
    searchContainer: {
      marginTop: -spacing.xs,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    searchBar: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      borderColor: colors.border,
      borderWidth: 1,
    },
    searchIcon: {
      marginLeft: spacing.sm,
    },
    searchInput: {
      ...typography.body,
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
    },
    filterButton: {
      padding: spacing.sm + 2,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterIcon: {
      fontSize: 18,
      color: colors.white,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.xl,
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    statCard: {
      flex: 1,
      minWidth: 100,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    statIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    statIcon: {
      fontSize: 20,
    },
    statLabel: {
      ...typography.tiny,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: colors.textSecondary,
    },
    statValue: {
      ...typography.h4,
      color: colors.textPrimary,
      fontWeight: '700',
      marginTop: spacing.xs,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
      marginTop: spacing.lg,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    seeAll: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.primary,
    },
    parkingList: {
      paddingHorizontal: spacing.xl,
    },
    parkingCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      flexDirection: 'row',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    candidateCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    parkingImage: {
      width: 96,
      height: 96,
      borderRadius: borderRadius.md,
    },
    parkingImagePlaceholder: {
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    candidateImagePlaceholder: {
      backgroundColor: colors.surfaceSecondary,
    },
    parkingInfo: {
      marginLeft: spacing.md,
      flex: 1,
    },
    parkingTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    parkingName: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '600',
      flex: 1,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    starIcon: {
      fontSize: 16,
    },
    ratingText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    previewBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      gap: 4,
    },
    previewBadgeText: {
      ...typography.tiny,
      color: colors.secondary,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    parkingMiddleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    distanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    distanceText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    parkingBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    priceText: {
      ...typography.h6,
      color: colors.primary,
    },
    priceUnit: {
      fontWeight: '400',
      fontSize: 12,
    },
    previewStatusText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    availabilityBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    availableBadge: {
      backgroundColor: 'rgba(16, 183, 127, 0.1)',
    },
    limitedBadge: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    availabilityText: {
      ...typography.tiny,
      fontWeight: '600',
    },
    availableText: {
      color: '#10b77f',
    },
    limitedText: {
      color: colors.secondary,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyIcon: {
      fontSize: 48,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    emptyText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.appHeaderBackground} />
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.greetingHeader}>
          <View style={styles.greetingLeft}>
            <View style={styles.greetingBrandRow}>
              {user?.profileImageUrl ? (
                <Image
                  source={{ uri: user.profileImageUrl + '?t=' + Date.now() }}
                  style={styles.headerAvatar}
                  contentFit="cover"
                  cachePolicy="none"
                />
              ) : (
                <View style={styles.headerAvatar}>
                  <Text style={styles.headerAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.parkPalTitle}>ParknQuik</Text>
            </View>
            <View>
              <Text style={styles.greetingTitle}>{getGreeting()}, {userName.split(' ')[0]}</Text>
              <Text style={styles.greetingSubtitle}>Find your perfect parking spot</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for parking nearby..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={handleSearch}
              {...accessibility.textInput('Search parking')}
            />
            <TouchableOpacity style={styles.filterButton} onPress={() => {}}>
              <MaterialCommunityIcons name="tune" size={20} color={colors.white} style={styles.filterIcon} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Parking near {nearbyLocation ? 'you' : 'your area'}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 183, 127, 0.1)' }]}>
              <MaterialCommunityIcons name="wallet-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.statLabel}>Balance</Text>
            <Text style={styles.statValue}>${user?.totalSpent?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <MaterialCommunityIcons name="bookmark-outline" size={24} color={colors.secondary} />
            </View>
            <Text style={styles.statLabel}>Bookings</Text>
            <Text style={styles.statValue}>{bookings.length}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(250, 204, 21, 0.1)' }]}>
              <MaterialCommunityIcons name="map-marker-outline" size={24} color={colors.accent} />
            </View>
            <Text style={styles.statLabel}>Nearby</Text>
            <Text style={styles.statValue}>{homeParkingItems.length}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Parking</Text>
          <TouchableOpacity onPress={handleSeeAllPress}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {needsLocation ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="map-marker-question-outline" size={48} color={colors.textSecondary} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>Enable location or search an area to find nearby parking.</Text>
          </View>
        ) : showInitialLoading ? (
          <View style={styles.parkingList}>
            <ListLoadingState
              variant="parking"
              accessibilityLabel="Loading nearby parking"
              testID="home-parking-loading-skeleton"
            />
          </View>
        ) : showInitialFailure ? (
          <View style={styles.parkingList}>
            <RetryableFailureState
              title="Unable to load parking spots"
              message={error || 'Something went wrong while loading nearby parking. Please try again.'}
              retryLabel="Retry loading parking spots"
              onRetry={fetchData}
              testID="home-parking-failure"
            />
          </View>
        ) : (
          <FlatList
            data={homeParkingItems}
            scrollEnabled={false}
            nestedScrollEnabled={true}
            keyExtractor={(item) => `${item.kind}-${item.id}`}
            renderItem={({ item: parking }) => (
              <TouchableOpacity
                style={[
                  styles.parkingCard,
                  parking.kind === 'candidate' && styles.candidateCard,
                ]}
                onPress={() => parking.kind === 'listing'
                  ? handleSpotPress(String(parking.id))
                  : handleCandidatePress(parking)}
                {...accessibility.button(
                  parking.kind === 'candidate'
                    ? `${parking.title}. Preview parking candidate, not bookable`
                    : (parking.title || parking.address),
                  parking.kind === 'candidate'
                    ? 'Preview parking candidate, not bookable'
                    : `View details for ${parking.title || parking.address}`
                )}
              >
                {parking.kind === 'listing' && parking.photos && parking.photos[0] ? (
                  <Image
                    source={{ uri: parking.photos[0] }}
                    style={styles.parkingImage}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.parkingImage,
                      styles.parkingImagePlaceholder,
                      parking.kind === 'candidate' && styles.candidateImagePlaceholder,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={parking.kind === 'candidate' ? 'map-marker-question' : 'car-outline'}
                      size={32}
                      color={parking.kind === 'candidate' ? colors.secondary : '#94a3b8'}
                    />
                  </View>
                )}
                <View style={styles.parkingInfo}>
                  <View style={styles.parkingTopRow}>
                    <Text style={styles.parkingName} numberOfLines={1}>{parking.title || parking.address}</Text>
                    {parking.kind === 'candidate' ? (
                      <View style={styles.previewBadge}>
                        <MaterialCommunityIcons name="eye-outline" size={12} color={colors.secondary} />
                        <Text style={styles.previewBadgeText}>Preview</Text>
                      </View>
                    ) : (
                      <View style={styles.ratingContainer}>
                        <MaterialCommunityIcons name="star" size={14} color={colors.accent} />
                        <Text style={styles.ratingText}>{parking.rating?.toFixed(1) || 'N/A'}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.parkingMiddleRow}>
                    <View style={styles.distanceRow}>
                      <MaterialCommunityIcons name="map-marker" size={14} color={colors.textSecondary} />
                      <Text style={styles.distanceText}> {parking.distance ? `${parking.distance.toFixed(1)} km away` : 'Nearby'}</Text>
                    </View>
                  </View>
                  <View style={styles.parkingBottomRow}>
                    {parking.kind === 'candidate' ? (
                      <Text style={styles.previewStatusText}>Not bookable yet</Text>
                    ) : (
                      <>
                        <Text style={styles.priceText}>
                          ₱{parking.pricePerHour?.toFixed(2) || '0.00'}
                          <Text style={styles.priceUnit}>/hr</Text>
                        </Text>
                        <View style={[
                          styles.availabilityBadge,
                          parking.availability
                            ? styles.availableBadge
                            : styles.limitedBadge
                        ]}>
                          <Text style={[
                            styles.availabilityText,
                            parking.availability
                              ? styles.availableText
                              : styles.limitedText
                          ]}>
                            {parking.availability ? 'Available' : 'Limited'}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.parkingList}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !loading && homeParkingItems.length === 0 && error === null ? (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons
                    name="map-marker-off-outline"
                    size={48}
                    color={colors.textSecondary}
                    style={{ marginBottom: spacing.md }}
                  />
                  <Text style={styles.emptyText}>No parking spots found nearby</Text>
                </View>
              ) : null
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
