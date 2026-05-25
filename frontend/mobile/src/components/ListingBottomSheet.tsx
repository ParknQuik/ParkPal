import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface ListingBottomSheetProps {
  listing: any | null;
  zoneAvailability: any | null;
  onViewDetails: () => void;
  onDirections: () => void;
  onQuickBook: () => void;
  onClose: () => void;
}

const AMENITY_ICONS: Record<string, string> = {
  cctv: 'cctv',
  'covered parking': 'car-parking',
  'ev charging': 'flash',
  'car wash': 'water-pump',
  security: 'shield-check',
  'wheelchair accessible': 'wheelchair',
};

const getAmenityIcon = (amenity: string): string => {
  const key = amenity.toLowerCase();
  for (const [match, icon] of Object.entries(AMENITY_ICONS)) {
    if (key.includes(match)) {
      return icon;
    }
  }
  return 'check-circle';
};

export const ListingBottomSheet: React.FC<ListingBottomSheetProps> = ({
  listing,
  zoneAvailability,
  onViewDetails,
  onDirections,
  onQuickBook,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const [snapIndex, setSnapIndex] = useState(0);
  const { colors } = useTheme();

  const snapPoints = useMemo(() => ['18%', '55%'], []);

  useEffect(() => {
    if (listing) {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [listing]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      } else {
        setSnapIndex(index);
        try {
          Haptics.selectionAsync();
        } catch {}
      }
    },
    [onClose]
  );

  const photoUri = listing?.photos?.[0] || 'https://via.placeholder.com/200';
  const title = listing?.title || listing?.address || 'Untitled';
  const distance = listing?.distance ? `${listing.distance.toFixed(1)} km away` : 'Nearby';
  const rating = listing?.rating ? listing.rating.toFixed(1) : 'N/A';
  const reviewCount = listing?.reviewCount || 0;
  const pricePerHour = listing?.pricePerHour != null ? `₱${listing.pricePerHour}` : '—';
  const amenities = listing?.amenities || [];
  const canBook = listing?.canBook !== false;
  const isPreviewCandidate = listing?.source === 'google_candidate' && listing?.isPreview;

  const occupancyPercentage = zoneAvailability?.occupancyPercentage;
  const availableSlots = zoneAvailability?.available;
  const totalSlots = zoneAvailability?.totalSlots;
  const circlingTime = zoneAvailability?.estimatedCirclingTime
    ? Math.ceil(zoneAvailability.estimatedCirclingTime / 60)
    : null;

  const styles = useMemo(() => StyleSheet.create({
    sheetContent: { flex: 1 },
    handleIndicator: { backgroundColor: colors.border, width: 40, height: 4 },
    background: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    collapsedContainer: { paddingHorizontal: 16, paddingBottom: 12 },
    collapsedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    collapsedTextContainer: { flex: 1, marginRight: 12 },
    collapsedTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    collapsedMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 },
    collapsedRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    collapsedRatingText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    collapsedReviews: { fontSize: 12, color: colors.textTertiary },
    collapsedDistance: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    collapsedDistanceText: { fontSize: 12, color: colors.textSecondary },
    collapsedPrice: { alignItems: 'flex-end' },
    collapsedPriceText: { fontSize: 18, fontWeight: '800', color: colors.primary },
    collapsedPriceUnit: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
    previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warning + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    previewBadgeText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
    expandedScrollView: { flex: 1 },
    expandedContent: { paddingHorizontal: 16 },
    expandedImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 16 },
    expandedBody: {},
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    titleContainer: { flex: 1, marginRight: 12 },
    expandedTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    distanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    expandedDistance: { fontSize: 13, color: colors.textSecondary },
    expandedAddress: { fontSize: 13, color: colors.textTertiary, marginTop: 2 },
    priceBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    priceBadgeText: { fontSize: 18, fontWeight: '800', color: colors.primary },
    priceBadgeUnit: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },
    ratingSection: { marginTop: 12 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ratingValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    ratingCount: { fontSize: 14, color: colors.textTertiary },
    amenitiesSection: { marginTop: 16 },
    amenitiesTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
    amenitiesScroll: { gap: 8 },
    amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
    amenityText: { fontSize: 12, fontWeight: '500', color: colors.textPrimary },
    zoneAvailability: { marginTop: 16 },
    availInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    availBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    availBadgeOpen: { backgroundColor: colors.success + '20' },
    availBadgeMid: { backgroundColor: colors.warning + '20' },
    availBadgeFull: { backgroundColor: colors.error + '20' },
    availBadgeText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
    circlingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    circlingText: { fontSize: 13, color: colors.textSecondary },
    progressContainer: { width: '100%' },
    progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
    progressFill: { height: '100%', borderRadius: 3 },
    progressLabel: { fontSize: 11, color: colors.textSecondary },
    actionButtons: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
    bookNowButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, gap: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    bookNowText: { fontSize: 16, fontWeight: '700', color: colors.white },
    directionsButtonExpanded: { width: 50, height: 50, borderRadius: 12, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    detailsButtonExpanded: { flex: 1, height: 50, borderRadius: 12, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    detailsTextExpanded: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  }), [colors]);

  const getAvailabilityStyle = () => {
    if (occupancyPercentage == null) return styles.availBadgeOpen;
    if (occupancyPercentage >= 80) return styles.availBadgeFull;
    if (occupancyPercentage >= 50) return styles.availBadgeMid;
    return styles.availBadgeOpen;
  };

  const collapsedContent = useMemo(() => (
    <View style={styles.collapsedContainer}>
      <View style={styles.collapsedHeader}>
        <View style={styles.collapsedTextContainer}>
          <Text style={styles.collapsedTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.collapsedMeta}>
            {canBook && (
              <View style={styles.collapsedRating}>
                <MaterialCommunityIcons name="star" size={12} color="#FBBF24" />
                <Text style={styles.collapsedRatingText}>{rating}</Text>
                <Text style={styles.collapsedReviews}>({reviewCount})</Text>
              </View>
            )}
            <View style={styles.collapsedDistance}>
              <MaterialCommunityIcons name="map-marker" size={12} color={colors.textSecondary} />
              <Text style={styles.collapsedDistanceText}>{distance}</Text>
            </View>
          </View>
        </View>
        {canBook ? (
          <View style={styles.collapsedPrice} accessible accessibilityLabel={`${pricePerHour} per hour`}>
            <Text style={styles.collapsedPriceText}>{pricePerHour}</Text>
            <Text style={styles.collapsedPriceUnit}>/hr</Text>
          </View>
        ) : (
          <View style={styles.previewBadge} accessible accessibilityLabel="Preview parking candidate, not bookable">
            <MaterialCommunityIcons name="map-marker-question" size={14} color={colors.textPrimary} />
            <Text style={styles.previewBadgeText}>Preview</Text>
          </View>
        )}
      </View>
    </View>
  ), [title, rating, reviewCount, distance, pricePerHour, canBook, colors]);

  const expandedContent = useMemo(() => {
    if (!listing) return null;
    return (<ScrollView style={styles.expandedScrollView} showsVerticalScrollIndicator={false} removeClippedSubviews contentContainerStyle={[styles.expandedContent, { paddingBottom: insets.bottom + 16 }]}>
      <Image source={{ uri: photoUri }} style={styles.expandedImage} contentFit="cover" transition={200} accessible accessibilityLabel={`Photo of ${title}`} accessibilityRole="image" />
      <View style={styles.expandedBody}>
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.expandedTitle} numberOfLines={2}>{title}</Text>
            <View style={styles.distanceRow}>
              <MaterialCommunityIcons name="map-marker" size={14} color={colors.textSecondary} />
              <Text style={styles.expandedDistance}>{distance}</Text>
            </View>
            {listing?.address && listing.address !== title && <Text style={styles.expandedAddress} numberOfLines={1}>{listing.address}</Text>}
          </View>
          {canBook ? (
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>{pricePerHour}</Text>
              <Text style={styles.priceBadgeUnit}>/hr</Text>
            </View>
          ) : (
            <View style={styles.previewBadge} accessible accessibilityLabel="Preview parking candidate, not bookable">
              <MaterialCommunityIcons name="map-marker-question" size={14} color={colors.textPrimary} />
              <Text style={styles.previewBadgeText}>{isPreviewCandidate ? 'Preview' : 'Verified'}</Text>
            </View>
          )}
        </View>
        {canBook && (
        <View style={styles.ratingSection}>
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={18} color="#FBBF24" />
            <Text style={styles.ratingValue}>{rating}</Text>
            <Text style={styles.ratingCount}>({reviewCount} reviews)</Text>
          </View>
        </View>
        )}
        {amenities.length > 0 && (
          <View style={styles.amenitiesSection}>
            <Text style={styles.amenitiesTitle}>Amenities</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.amenitiesScroll}>
              {amenities.map((amenity: string, idx: number) => (
                <View key={`${amenity}-${idx}`} style={styles.amenityChip} accessible accessibilityLabel={amenity}>
                  <MaterialCommunityIcons name={getAmenityIcon(amenity) as any} size={16} color={colors.primary} />
                  <Text style={styles.amenityText} numberOfLines={1}>{amenity}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        {zoneAvailability && (
          <View style={styles.zoneAvailability}>
            <View style={styles.availInfoRow}>
              <View style={[styles.availBadge, getAvailabilityStyle()]}>
                <Text style={styles.availBadgeText}>{availableSlots}/{totalSlots} open</Text>
              </View>
              {circlingTime != null && (
                <View style={styles.circlingRow}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.circlingText}>~{circlingTime} min to park</Text>
                </View>
              )}
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(occupancyPercentage ?? 0, 100)}%`, backgroundColor: (occupancyPercentage ?? 0) >= 80 ? '#ef4444' : (occupancyPercentage ?? 0) >= 50 ? '#f59e0b' : '#10b77f' }]} />
              </View>
              <Text style={styles.progressLabel}>{occupancyPercentage != null ? `${occupancyPercentage}% occupied` : 'No data'}</Text>
            </View>
          </View>
        )}
        <View style={styles.actionButtons}>
          {canBook && (
            <TouchableOpacity style={styles.bookNowButton} onPress={onQuickBook} activeOpacity={0.8} accessibilityLabel="Book this parking spot now" accessibilityRole="button">
              <MaterialCommunityIcons name="calendar-check" size={20} color={colors.white} />
              <Text style={styles.bookNowText}>Book Now</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.directionsButtonExpanded} onPress={onDirections} activeOpacity={0.7} accessibilityLabel="Get directions to this spot" accessibilityRole="button">
            <MaterialCommunityIcons name="navigation" size={20} color={colors.primary} />
          </TouchableOpacity>
          {canBook && (
            <TouchableOpacity style={styles.detailsButtonExpanded} onPress={onViewDetails} activeOpacity={0.7} accessibilityLabel="View full details for this spot" accessibilityRole="button">
              <Text style={styles.detailsTextExpanded}>Details</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>);
  }, [photoUri, title, distance, rating, reviewCount, pricePerHour, amenities, zoneAvailability, occupancyPercentage, availableSlots, totalSlots, circlingTime, insets.bottom, onQuickBook, onDirections, onViewDetails, listing, canBook, isPreviewCandidate, colors]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={listing ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.background}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} pressBehavior="close" />
      )}
      onChange={handleSheetChanges}
    >
      <BottomSheetView style={styles.sheetContent}>
        {snapIndex === 0 && collapsedContent}
        {snapIndex === 1 && expandedContent}
      </BottomSheetView>
    </BottomSheet>
  );
};
