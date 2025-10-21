import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { searchListings } from '../store/slices/marketplaceSlice';
import { getCurrentLocation } from '../store/slices/locationSlice';
import { SearchBar } from '../components/SearchBar';
import { ParkingCard } from '../components/ParkingCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { colors, typography, spacing, borderRadius } from '../theme';

export const HomeScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const { user } = useAppSelector((state) => state.auth);
  const { listings, loading, filters } = useAppSelector((state) => state.marketplace);
  const { currentLocation, loading: locationLoading, error: locationError } = useAppSelector((state) => state.location);

  useEffect(() => {
    dispatch(getCurrentLocation());

    // Fallback: Load listings after 3 seconds even without location
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
  }, [dispatch]);

  useEffect(() => {
    if (currentLocation) {
      dispatch(
        searchListings({
          lat: currentLocation.latitude,
          lon: currentLocation.longitude,
          radius: 5,
          sortBy: filters.sortBy,
        })
      );
    }
  }, [currentLocation, filters.sortBy, dispatch]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (currentLocation) {
      dispatch(
        searchListings({
          lat: currentLocation.latitude,
          lon: currentLocation.longitude,
          radius: 5,
          sortBy: filters.sortBy,
        })
      );
    }
  }, [currentLocation, filters.sortBy, dispatch]);

  const handleSpotPress = useCallback((listingId: number) => {
    navigation.navigate('ParkingDetail' as never, { spotId: listingId.toString() } as never);
  }, [navigation]);

  const handleLocationRefresh = useCallback(() => {
    dispatch(getCurrentLocation());
  }, [dispatch]);

  // Memoize transformed listings to prevent unnecessary recalculations
  const transformedListings = useMemo(() => {
    return listings.map((listing) => ({
      id: listing.id.toString(),
      title: listing.title,
      address: listing.address,
      city: '',
      state: '',
      zipCode: '',
      latitude: listing.latitude,
      longitude: listing.longitude,
      price: listing.pricePerHour,
      priceUnit: 'hour' as const,
      rating: listing.rating,
      reviews: listing.reviewCount,
      distance: listing.distance,
      availability: listing.availability ? 'available' : 'occupied' as const,
      images: listing.photos,
      amenities: listing.amenities,
      description: listing.description,
      ownerId: listing.hostId.toString(),
      ownerName: listing.hostName,
      ownerRating: listing.rating,
      features: {
        covered: listing.amenities.includes('covered'),
        security: listing.amenities.includes('security'),
        evCharging: listing.amenities.includes('ev_charging'),
        accessible: listing.amenities.includes('accessible'),
        lighting: listing.amenities.includes('lighting'),
        cctv: listing.amenities.includes('cctv'),
      },
    }));
  }, [listings]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={colors.gradientPrimary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
          </View>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleLocationRefresh}
          >
            {locationLoading ? (
              <Text style={styles.locationText}>📍 Getting location...</Text>
            ) : locationError ? (
              <Text style={styles.locationText}>📍 Tap to enable</Text>
            ) : currentLocation ? (
              <Text style={styles.locationText}>
                📍 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              </Text>
            ) : (
              <Text style={styles.locationText}>📍 Get Location</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user?.totalBookings || 0}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${user?.totalSpent ? user.totalSpent.toFixed(0) : '0'}
            </Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{listings.length}</Text>
            <Text style={styles.statLabel}>Nearby</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search parking spots..."
          />
        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Weather Alert</Text>
            <Text style={styles.alertText}>
              Heavy rain expected today. Consider covered parking.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Parking</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <LoadingSpinner />
          ) : listings.length === 0 ? (
            <EmptyState
              title="No parking spots found"
              message="Try adjusting your search or location"
            />
          ) : (
            transformedListings.map((spot) => (
              <ParkingCard
                key={spot.id}
                spot={spot}
                onPress={() => handleSpotPress(parseInt(spot.id))}
              />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  greeting: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
  },
  userName: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  locationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  locationText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h4,
    color: colors.white,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.small,
    color: colors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    marginTop: -spacing.xl,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  alertCard: {
    backgroundColor: '#FFF3CD',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: '#856404',
    marginBottom: spacing.xs,
  },
  alertText: {
    ...typography.small,
    color: '#856404',
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
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
});
