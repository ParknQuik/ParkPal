import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { getListingById, getListingReviews } from '../store/slices/marketplaceSlice';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { colors, typography, spacing, borderRadius } from '../theme';
import { formatCurrency } from '../utils/helpers';

const { width } = Dimensions.get('window');

export const ParkingDetailScreen: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const { spotId } = route.params as { spotId: string };
  const { selectedListing, reviews, loading } = useAppSelector((state) => state.marketplace);

  useEffect(() => {
    const listingId = parseInt(spotId);
    dispatch(getListingById(listingId));
    dispatch(getListingReviews(listingId));
  }, [spotId]);

  const handleReserve = () => {
    navigation.navigate('Reservation' as never, { spotId } as never);
  };

  if (loading || !selectedListing) {
    return <LoadingSpinner />;
  }

  const displayImages = selectedListing.photos.length > 0
    ? selectedListing.photos
    : ['https://via.placeholder.com/400x300?text=No+Image'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / width
              );
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {displayImages.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          <View style={styles.imagePagination}>
            {displayImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentImageIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{selectedListing.title}</Text>
              <Badge
                text={selectedListing.status === 'available' ? 'available' : 'occupied'}
                variant={selectedListing.status === 'available' ? 'success' : 'error'}
              />
            </View>
            <Text style={styles.address}>{selectedListing.address}</Text>
          </View>

          {/* Price and Rating */}
          <View style={styles.statsRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                ₱{selectedListing.price}
              </Text>
              <Text style={styles.priceUnit}>/hour</Text>
            </View>
            <View style={styles.ratingContainer}>
              <Text style={styles.rating}>★ {(selectedListing.rating || 0).toFixed(1)}</Text>
              <Text style={styles.reviewsText}>({selectedListing.reviews?.length || 0} reviews)</Text>
            </View>
          </View>

          {/* Amenities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {selectedListing.amenities.length > 0 ? (
                selectedListing.amenities.map((amenity, index) => {
                  const icons: Record<string, string> = {
                    covered: '🏠',
                    security: '🔒',
                    ev_charging: '⚡',
                    accessible: '♿',
                    lighting: '💡',
                    cctv: '📹',
                    wifi: '📶',
                    restroom: '🚻',
                  };
                  return (
                    <View key={index} style={styles.amenityItem}>
                      <Text style={styles.amenityText}>
                        {icons[amenity] || '✓'} {amenity.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noAmenities}>No amenities listed</Text>
              )}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{selectedListing.description}</Text>
          </View>

          {/* Owner Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Host</Text>
            <View style={styles.ownerCard}>
              <Avatar name={selectedListing.owner?.name || 'Host'} uri={selectedListing.owner?.profileImageUrl} size={50} />
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{selectedListing.owner?.name || 'Host'}</Text>
                <Text style={styles.ownerRating}>
                  ★ {(selectedListing.rating || 0).toFixed(1)} rating
                </Text>
              </View>
              <TouchableOpacity style={styles.contactButton}>
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Review' as never, { listingId: selectedListing.id } as never)}
              >
                <Text style={styles.writeReviewText}>Write Review</Text>
              </TouchableOpacity>
            </View>

            {reviews.length > 0 ? (
              <View style={styles.reviewsList}>
                {reviews.slice(0, 3).map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Avatar name={review.userName} uri={review.userAvatar} size={40} />
                      <View style={styles.reviewerInfo}>
                        <Text style={styles.reviewerName}>{review.userName}</Text>
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.reviewRating}>
                        <Text style={styles.reviewRatingText}>★ {review.rating}</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  </View>
                ))}
                {reviews.length > 3 && (
                  <TouchableOpacity style={styles.seeAllReviews}>
                    <Text style={styles.seeAllReviewsText}>
                      See all {reviews.length} reviews
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={styles.noReviews}>No reviews yet. Be the first to review!</Text>
            )}
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapText}>Map View</Text>
              <Text style={styles.coordinates}>
                {(selectedListing.lat || 0).toFixed(4)}, {(selectedListing.lon || 0).toFixed(4)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceContainer}>
          <Text style={styles.bottomPriceLabel}>Total</Text>
          <Text style={styles.bottomPrice}>
            ₱{selectedListing.price}/hour
          </Text>
        </View>
        <Button
          title="Reserve Now"
          variant="gradient"
          onPress={handleReserve}
          style={styles.reserveButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  imageContainer: {
    height: 300,
    position: 'relative',
  },
  image: {
    width,
    height: 300,
  },
  imagePagination: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: colors.white,
    width: 24,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: spacing.xl,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 24,
  },
  content: {
    padding: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.md,
  },
  address: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  priceUnit: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    ...typography.h5,
    color: colors.warning,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  reviewsText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  amenityItem: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amenityText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  ownerInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  ownerName: {
    ...typography.h6,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  ownerRating: {
    ...typography.small,
    color: colors.warning,
  },
  contactButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  contactButtonText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapText: {
    ...typography.h5,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  coordinates: {
    ...typography.small,
    color: colors.textTertiary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomPriceContainer: {
    marginRight: spacing.lg,
  },
  bottomPriceLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  bottomPrice: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
  },
  reserveButton: {
    flex: 1,
  },
  noAmenities: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  writeReviewText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  reviewsList: {
    gap: spacing.lg,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reviewerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  reviewerName: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  reviewDate: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reviewRating: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  reviewRatingText: {
    ...typography.small,
    color: colors.warning,
    fontWeight: '600',
  },
  reviewComment: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  noReviews: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  seeAllReviews: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  seeAllReviewsText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
});
