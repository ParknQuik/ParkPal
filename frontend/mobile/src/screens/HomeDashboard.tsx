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
  ActivityIndicator,
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

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const HomeDashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation() as any;
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const { currentLocation } = useAppSelector((state) => state.location);
  const { listings, bookings, filters, loading, error } = useAppSelector((state) => state.marketplace);
  const userName = user?.name || 'Guest';
  // Force re-render when user is updated (for profile image changes)
  const [, forceUpdate] = useState(0);

  // Hook calls at the top level - before any returns
  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [user?.profileImageUrl]);

  const statusBarStyle = useStatusBarStyle();

  useEffect(() => {
    const init = async () => {
      let lat = 14.5995;
      let lon = 120.9842;
      try {
        const result = await dispatch(getCurrentLocation()).unwrap();
        lat = result.latitude;
        lon = result.longitude;
      } catch {
        // permission denied or error — fall back to Manila
      }
      dispatch(searchListings({ latitude: lat, longitude: lon, radius: 3 }));
      if (user?.id) {
        dispatch(getMyBookings());
      }
    };
    init();
  }, [dispatch, user?.id]);

  const fetchData = useCallback(async () => {
    try {
      const lat = currentLocation?.latitude || 14.5995;
      const lon = currentLocation?.longitude || 120.9842;
      await dispatch(searchListings({ latitude: lat, longitude: lon, radius: 3 })).unwrap();
      if (user?.id) {
        await dispatch(getMyBookings()).unwrap();
      }
    } catch (err) {
      // silently handle error
    }
  }, [dispatch, currentLocation, user?.id]);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setSearchQuery(''); // Clear search query on refresh
    setRefreshing(true);
    const lat = currentLocation?.latitude || 14.5995;
    const lon = currentLocation?.longitude || 120.9842;
    const fetches: Promise<any>[] = [
      dispatch(searchListings({ latitude: lat, longitude: lon, radius: 3 })),
    ];
    if (user?.id) {
      fetches.push(dispatch(getMyBookings()));
    }
    Promise.allSettled(fetches).finally(() => {
      setRefreshing(false);
    });
  }, [dispatch, currentLocation, user?.id, refreshing]);

  const debouncedSearch = useDebouncedCallback((query: string) => {
    if (currentLocation && query.trim()) {
      dispatch(
        searchListings({
          q: query.trim(),
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          radius: 3,
          sortBy: filters.sortBy,
        })
      );
    } else if (!query.trim() && currentLocation) {
      dispatch(searchListings({ latitude: currentLocation.latitude, longitude: currentLocation.longitude, radius: 3 }));
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      marginBottom: spacing.md,
    },
    greetingLeft: {
      gap: spacing.md,
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
    },
    header: {
      backgroundColor: colors.primary,
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
    loadingContainer: {
      paddingVertical: spacing.xxl * 2,
      alignItems: 'center',
    },
    loadingText: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    errorContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    errorIcon: {
      fontSize: 48,
    },
    errorText: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      marginTop: spacing.md,
    },
    retryText: {
      ...typography.body,
      color: colors.white,
      fontWeight: '600',
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
    },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.primary} />
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
            <View>
              <Text style={styles.greetingTitle}>{getGreeting()}, {userName.split(' ')[0]}</Text>
              <Text style={styles.greetingSubtitle}>Find your perfect parking spot</Text>
            </View>
          </View>
          <Text style={styles.parkPalTitle}>ParknQuik</Text>
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
          <Text style={styles.greeting}>Parking near {currentLocation ? 'you' : 'Manila'}</Text>
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
            <Text style={styles.statValue}>{listings.length}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Parking</Text>
          <TouchableOpacity onPress={handleSeeAllPress}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing && listings.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading nearby parking...</Text>
          </View>
        ) : error && listings.length === 0 ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={colors.error}
              style={{ marginBottom: spacing.md }}
            />
            <Text style={styles.errorText}>Failed to load parking spots</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={listings}
            scrollEnabled={false}
            nestedScrollEnabled={true}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item: parking }) => (
              <TouchableOpacity
                style={styles.parkingCard}
                onPress={() => handleSpotPress(String(parking.id))}
                {...accessibility.button(parking.title || parking.address, `View details for ${parking.title || parking.address}`)}
              >
                {parking.photos && parking.photos[0] ? (
                  <Image
                    source={{ uri: parking.photos[0] }}
                    style={styles.parkingImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.parkingImage, styles.parkingImagePlaceholder]}>
                    <MaterialCommunityIcons name="car-outline" size={32} color="#94a3b8" />
                  </View>
                )}
                <View style={styles.parkingInfo}>
                  <View style={styles.parkingTopRow}>
                    <Text style={styles.parkingName} numberOfLines={1}>{parking.title || parking.address}</Text>
                    <View style={styles.ratingContainer}>
                      <MaterialCommunityIcons name="star" size={14} color={colors.accent} />
                      <Text style={styles.ratingText}>{parking.rating?.toFixed(1) || 'N/A'}</Text>
                    </View>
                  </View>
                  <View style={styles.parkingMiddleRow}>
                    <View style={styles.distanceRow}>
                      <MaterialCommunityIcons name="map-marker" size={14} color={colors.textSecondary} />
                      <Text style={styles.distanceText}> {parking.distance ? `${parking.distance.toFixed(1)} km away` : 'Nearby'}</Text>
                    </View>
                  </View>
                  <View style={styles.parkingBottomRow}>
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
                  </View>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.parkingList}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !loading && listings.length === 0 && error === null ? (
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
