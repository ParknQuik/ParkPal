import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme';

const MOCK_PHOTOS = [
  'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=400',
  'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=400',
  'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=400',
];

const AMENITIES = [
  { key: 'covered', label: 'Covered' },
  { key: 'cctv', label: 'CCTV' },
  { key: 'security', label: 'Security' },
  { key: 'ev_charging', label: 'EV Charging' },
  { key: 'accessible', label: 'Accessible' },
  { key: '24_7_access', label: '24/7 Access' },
];

export const ListYourSpot: React.FC = () => {
  const navigation = useNavigation();
  const [spotName, setSpotName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>(MOCK_PHOTOS);

  const toggleAmenity = useCallback((key: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(key)
        ? prev.filter((a) => a !== key)
        : [...prev, key]
    );
  }, []);

  const handleAddMorePhotos = useCallback(() => {
    Alert.alert('Add Photos', 'Photo picker would open here');
  }, []);

  const handleContinue = useCallback(() => {
    Alert.alert('Continue', 'Proceeding to next step');
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>List Your Spot</Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </LinearGradient>

      <View style={styles.progressSection}>
        <Text style={styles.progressText}>Step 2 of 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '66.67%' }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photoSection}>
            <View style={styles.photosGrid}>
              {photos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.photoThumbnail}
                  resizeMode="cover"
                />
              ))}
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handleAddMorePhotos}
              >
                <Text style={styles.addPhotoIcon}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.photoCount}>3/5 photos</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spot Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Spot Name</Text>
            <TextInput
              style={styles.textInput}
              value={spotName}
              onChangeText={setSpotName}
              placeholder="e.g., Downtown Parking Garage"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your parking spot..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {AMENITIES.map((amenity) => {
              const isSelected = selectedAmenities.includes(amenity.key);
              return (
                <TouchableOpacity
                  key={amenity.key}
                  style={[
                    styles.amenityPill,
                    isSelected && styles.amenityPillSelected,
                  ]}
                  onPress={() => toggleAmenity(amenity.key)}
                >
                  <Text
                    style={[
                      styles.amenityText,
                      isSelected && styles.amenityTextSelected,
                    ]}
                  >
                    {amenity.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f6f6',
  },
  headerGradient: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.white,
    fontWeight: '700',
  },
  headerPlaceholder: {
    width: 40,
  },
  progressSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  photoSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 183, 127, 0.05)',
  },
  addPhotoIcon: {
    fontSize: 32,
    color: colors.primary,
    fontWeight: '300',
  },
  photoCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenityPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amenityPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  amenityText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  amenityTextSelected: {
    color: colors.white,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  continueButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
});
