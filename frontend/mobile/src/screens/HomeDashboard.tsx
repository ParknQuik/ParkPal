import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { searchListings, getMyBookings } from '../store/slices/marketplaceSlice';
import { getCurrentLocation } from '../store/slices/locationSlice';
import { colors, typography, spacing, borderRadius } from '../theme';
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
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const { user } = useAppSelector((state) => state.auth);
  const { currentLocation } = useAppSelector((state) => state.location);
  const { listings, bookings, filters, loading, error } = useAppSelector((state) => state.marketplace);

  const userName = user?.name || 'Guest';

  const fetchData = useCallback(async () => {
    try {
      const lat = currentLocation?.latitude || 14.5995;
      const lon = currentLocation?.longitude || 120.9842;
      await dispatch(searchListings({ latitude: lat, longitude: lon, radius: 10 })).unwrap();
      if (user?.id) {
        await dispatch(getMyBookings()).unwrap();
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, [dispatch, currentLocation, user?.id]);

  useEffect(() => {
    dispatch(getCurrentLocation());
  }, [dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const lat = currentLocation?.latitude || 14.5995;
      const lon = currentLocation?.longitude || 120.9842;
      await dispatch(searchListings({ latitude: lat, longitude: lon, radius: 10 }));
      if (user?.id) {
        await dispatch(getMyBookings());
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setRefreshing(false);
  }, [dispatch, currentLocation, user?.id]);

  const debouncedSearch = useDebouncedCallback((query: string) => {
    if (currentLocation) {
      dispatch(
        searchListings({
          q: query,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          radius: 5,
          sortBy: filters.sortBy,
        })
      );
    }
  }, 500);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleSpotPress = useCallback(async (listingId: string) => {
    await haptics.light();
    navigation.navigate('ParkingDetail' as never, { spotId: listingId } as never);
  }, [navigation]);

  const handleNotificationPress = useCallback(async () => {
    await haptics.light();
    navigation.navigate('Notifications' as never);
  }, [navigation]);

  const handleExplorePress = useCallback(async () => {
    await haptics.light();
    navigation.navigate('Explore' as never);
  }, [navigation]);

  const handleActivityPress = useCallback(async () => {
    await haptics.light();
    navigation.navigate('MyBookings' as never);
  }, [navigation]);

  const handleProfilePress = useCallback(async () => {
    await haptics.light();
    navigation.navigate('Profile' as never);
  }, [navigation]);

  const handleAddPress = useCallback(async () => {
    await haptics.medium();
    navigation.navigate('ListSpot' as never);
  }, [navigation]);

  const handleSeeAllPress = useCallback(async () => {
    await haptics.light();
    navigation.navigate('Explore' as never);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />
      
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
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.headerAvatar} contentFit="cover" />
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
          <Text style={styles.parkPalTitle}>ParkPal</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>search</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for parking nearby..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={handleSearch}
              {...accessibility.textInput('Search parking')}
            />
            <TouchableOpacity style={styles.filterButton}>
              <Text style={styles.filterIcon}>tune</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 183, 127, 0.1)' }]}>
              <Text style={[styles.statIcon, { color: colors.primary }]}>account_balance_wallet</Text>
            </View>
            <Text style={styles.statLabel}>Balance</Text>
            <Text style={styles.statValue}>${user?.totalSpent?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Text style={[styles.statIcon, { color: colors.secondary }]}>bookmark</Text>
            </View>
            <Text style={styles.statLabel}>Bookings</Text>
            <Text style={styles.statValue}>{bookings.length}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(250, 204, 21, 0.1)' }]}>
              <Text style={[styles.statIcon, { color: colors.accent }]}>local_parking</Text>
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

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading nearby parking...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>error_outline</Text>
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
              <Image 
                source={{ uri: parking.photos?.[0] || 'https://via.placeholder.com/96' }} 
                style={styles.parkingImage}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.parkingInfo}>
                <View style={styles.parkingTopRow}>
                  <Text style={styles.parkingName} numberOfLines={1}>{parking.title || parking.address}</Text>
                  <View style={styles.ratingContainer}>
                    <Text style={styles.starIcon}>star</Text>
                    <Text style={styles.ratingText}>{parking.rating?.toFixed(1) || 'N/A'}</Text>
                  </View>
                </View>
                <View style={styles.parkingMiddleRow}>
                  <Text style={styles.distanceText}>location_on {parking.distance ? `${parking.distance.toFixed(1)} km away` : 'Nearby'}</Text>
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
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>search_off</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  greetingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  greetingSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  parkPalTitle: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '800',
  },
  header: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl + spacing.xl,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    ...typography.h5,
    color: colors.white,
    fontWeight: '700',
  },
  appSubtitle: {
    ...typography.small,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationIcon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 20,
    color: colors.white,
  },
  greetingContainer: {
    marginTop: spacing.sm,
  },
  greeting: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '700',
  },
  greetingSubtitle: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 80,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 20,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterIcon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 18,
    color: colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 20,
  },
  statLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  seeAll: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  parkingList: {
    paddingHorizontal: spacing.xl,
  },
  parkingCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  parkingImage: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.lg,
  },
  parkingInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  parkingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  parkingName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starIcon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 16,
    color: colors.accent,
  },
  ratingText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  parkingMiddleRow: {
    marginTop: spacing.xs,
  },
  distanceText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
  },
  parkingBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceText: {
    ...typography.h6,
    color: colors.primary,
    fontWeight: '700',
  },
  priceUnit: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '400',
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
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  availableText: {
    color: colors.primary,
  },
  limitedText: {
    color: colors.secondary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  errorIcon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 48,
    color: colors.error,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  retryText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyIcon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 48,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
