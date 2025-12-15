import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { getMyListings } from '../store/slices/marketplaceSlice';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { colors, typography, spacing, borderRadius } from '../theme';
import { formatCurrency } from '../utils/helpers';
import { MarketplaceListing } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 3) / 2;

export const MyListingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { myListings, loading } = useAppSelector((state) => state.marketplace);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    await dispatch(getMyListings());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadListings();
    setRefreshing(false);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCreateListing = () => {
    navigation.navigate('ListSpot' as never);
  };

  const handleEditListing = (listing: MarketplaceListing) => {
    // Navigate to edit listing screen (ListSpotScreen with edit mode)
    navigation.navigate('ListSpot' as never, { listingId: listing.id, mode: 'edit' } as never);
  };

  const handleDeleteListing = (listing: MarketplaceListing) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${listing.title || listing.address}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement delete listing API call
            Alert.alert('Success', 'Listing deleted successfully');
            loadListings();
          },
        },
      ]
    );
  };

  const handleToggleAvailability = (listing: MarketplaceListing) => {
    const newStatus = listing.availability ? 'paused' : 'available';
    Alert.alert(
      listing.availability ? 'Pause Listing' : 'Activate Listing',
      `Do you want to ${listing.availability ? 'pause' : 'activate'} this listing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            // TODO: Implement toggle availability API call
            Alert.alert(
              'Success',
              `Listing ${listing.availability ? 'paused' : 'activated'} successfully`
            );
            loadListings();
          },
        },
      ]
    );
  };

  const getStatusBadgeColor = (listing: MarketplaceListing) => {
    if (!listing.availability) return colors.textTertiary;
    return colors.success;
  };

  const getStatusText = (listing: MarketplaceListing) => {
    if (!listing.availability) return 'Paused';
    return 'Active';
  };

  if (loading && !myListings.length) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Stats Summary */}
          {myListings.length > 0 && (
            <Card style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{myListings.length}</Text>
                  <Text style={styles.statLabel}>Total Listings</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {myListings.filter((l) => l.availability).length}
                  </Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {myListings.reduce((sum, l) => sum + (l.reviewCount || 0), 0)}
                  </Text>
                  <Text style={styles.statLabel}>Total Bookings</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Empty State */}
          {myListings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                title="No Listings Yet"
                message="Start hosting by creating your first parking spot listing"
              />
              <Button
                title="Create Your First Listing"
                variant="gradient"
                onPress={handleCreateListing}
                style={styles.emptyButton}
              />
            </View>
          ) : (
            <>
              {/* Grid View */}
              <View style={styles.gridContainer}>
                {myListings.map((listing) => (
                  <Card key={listing.id} style={styles.listingCard}>
                    {/* Image */}
                    <View style={styles.imageContainer}>
                      {listing.photos && listing.photos.length > 0 ? (
                        <Image
                          source={{ uri: listing.photos[0] }}
                          style={styles.listingImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.listingImage, styles.placeholderImage]}>
                          <Text style={styles.placeholderText}>P</Text>
                        </View>
                      )}
                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusBadgeColor(listing) },
                        ]}
                      >
                        <Text style={styles.statusText}>{getStatusText(listing)}</Text>
                      </View>
                    </View>

                    {/* Info */}
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingAddress} numberOfLines={2}>
                        {listing.address}
                      </Text>
                      <Text style={styles.listingPrice}>
                        {formatCurrency(listing.pricePerHour)}/hr
                      </Text>

                      {/* Quick Stats */}
                      <View style={styles.quickStats}>
                        <View style={styles.quickStat}>
                          <Text style={styles.quickStatIcon}>⭐</Text>
                          <Text style={styles.quickStatText}>
                            {listing.rating.toFixed(1)}
                          </Text>
                        </View>
                        <View style={styles.quickStat}>
                          <Text style={styles.quickStatIcon}>📅</Text>
                          <Text style={styles.quickStatText}>
                            {listing.reviewCount || 0}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditListing(listing)}
                      >
                        <Text style={styles.actionIcon}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleToggleAvailability(listing)}
                      >
                        <Text style={styles.actionIcon}>
                          {listing.availability ? '⏸️' : '▶️'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteListing(listing)}
                      >
                        <Text style={styles.actionIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {myListings.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateListing}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 32,
    color: colors.textPrimary,
    fontWeight: '300',
  },
  headerTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },
  content: {
    padding: spacing.lg,
  },
  statsCard: {
    marginBottom: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  statValue: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl,
  },
  emptyButton: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.xl,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  listingCard: {
    width: CARD_WIDTH,
    marginBottom: spacing.lg,
    padding: 0,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  listingImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.background,
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  placeholderText: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.tiny,
    color: colors.white,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listingInfo: {
    padding: spacing.md,
  },
  listingAddress: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    minHeight: 36,
  },
  listingPrice: {
    ...typography.h6,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  quickStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickStatIcon: {
    fontSize: 12,
  },
  quickStatText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  actionIcon: {
    fontSize: 18,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: colors.white,
    fontWeight: '300',
    marginTop: -2,
  },
});
