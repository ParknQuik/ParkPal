import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

const COLORS = {
  primary: '#10b77f',
  secondary: colors.secondary,
  accent: '#facc15',
  background: '#f6f8f7',
  white: '#ffffff',
  textPrimary: '#1a1a1a',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
};

const categories = [
  { id: 'all', label: 'All Items', icon: '📦' },
  { id: 'indoor', label: 'Indoor Plants', icon: '🪴' },
  { id: 'seeds', label: 'Organic Seeds', icon: '🌱' },
  { id: 'tools', label: 'Gardening Tools', icon: '🔧' },
  { id: 'fertilizers', label: 'Fertilizers', icon: '🧪' },
];

const amenities = [
  { id: 'cctv', label: 'CCTV', icon: '📹' },
  { id: 'ev', label: 'EV Charging', icon: '⚡' },
  { id: 'covered', label: 'Covered', icon: '🏠' },
  { id: 'security', label: 'Security', icon: '👮' },
  { id: 'accessible', label: 'Accessible', icon: '♿' },
];

const distances = [
  { id: '1km', label: 'Under 1km' },
  { id: '2km', label: 'Under 2km' },
  { id: '5km', label: 'Under 5km' },
  { id: 'any', label: 'Any Distance' },
];

const ratings = [2, 3, 4, 5];

const SearchFilters: React.FC = () => {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedDistance, setSelectedDistance] = useState('any');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 15, max: 250 });

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleClearAll = () => {
    setSelectedCategory('all');
    setSelectedAmenities([]);
    setSelectedDistance('any');
    setSelectedRating(null);
    setPriceRange({ min: 15, max: 250 });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search & Filters</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search plants, tools, seeds..."
              placeholderTextColor={COLORS.textSecondary}
            />
            <TouchableOpacity style={styles.micButton}>
              <Text style={styles.micIcon}>🎤</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Categories</Text>
          <View style={styles.chipContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.chip,
                  selectedCategory === category.id && styles.chipSelected,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={styles.chipIcon}>{category.icon}</Text>
                <Text
                  style={[
                    styles.chipLabel,
                    selectedCategory === category.id && styles.chipLabelSelected,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>${priceRange.min} - ${priceRange.max}</Text>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    {
                      left: `${(priceRange.min / 300) * 100}%`,
                      right: `${100 - (priceRange.max / 300) * 100}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.sliderButtons}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setPriceRange((p) => ({ ...p, min: Math.max(0, p.min - 25) }))}
                >
                  <Text style={styles.sliderButtonText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setPriceRange((p) => ({ ...p, max: Math.min(300, p.max + 25) }))}
                >
                  <Text style={styles.sliderButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Minimum Rating</Text>
          <View style={styles.ratingContainer}>
            {ratings.map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingChip,
                  selectedRating === rating && styles.ratingChipSelected,
                ]}
                onPress={() => setSelectedRating(rating)}
              >
                <Text style={styles.stars}>
                  {'★'.repeat(rating)}
                  {'☆'.repeat(5 - rating)}
                </Text>
                <Text
                  style={[
                    styles.ratingText,
                    selectedRating === rating && styles.ratingTextSelected,
                  ]}
                >
                  {rating}+
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesContainer}>
            {amenities.map((amenity) => (
              <TouchableOpacity
                key={amenity.id}
                style={[
                  styles.amenityPill,
                  selectedAmenities.includes(amenity.id) && styles.amenityPillSelected,
                ]}
                onPress={() => toggleAmenity(amenity.id)}
              >
                <Text style={styles.amenityIcon}>{amenity.icon}</Text>
                <Text
                  style={[
                    styles.amenityLabel,
                    selectedAmenities.includes(amenity.id) && styles.amenityLabelSelected,
                  ]}
                >
                  {amenity.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance</Text>
          <View style={styles.distanceContainer}>
            {distances.map((distance) => (
              <TouchableOpacity
                key={distance.id}
                style={[
                  styles.distanceChip,
                  selectedDistance === distance.id && styles.distanceChipSelected,
                ]}
                onPress={() => setSelectedDistance(distance.id)}
              >
                <Text
                  style={[
                    styles.distanceLabel,
                    selectedDistance === distance.id && styles.distanceLabelSelected,
                  ]}
                >
                  {distance.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.showResultsButton}>
          <Text style={styles.showResultsText}>Show Results</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  micButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 18,
  },
  micIcon: {
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  chipSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  chipLabelSelected: {
    color: COLORS.white,
  },
  priceContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  sliderContainer: {
    gap: 12,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonText: {
    fontSize: 20,
    color: COLORS.white,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.accent,
    gap: 6,
  },
  ratingChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  stars: {
    fontSize: 14,
    color: COLORS.accent,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  ratingTextSelected: {
    color: COLORS.textPrimary,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amenityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  amenityPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  amenityIcon: {
    fontSize: 14,
  },
  amenityLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  amenityLabelSelected: {
    color: COLORS.white,
  },
  distanceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  distanceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  distanceChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  distanceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  distanceLabelSelected: {
    color: COLORS.white,
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  showResultsButton: {
    flex: 2,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  showResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default SearchFilters;
