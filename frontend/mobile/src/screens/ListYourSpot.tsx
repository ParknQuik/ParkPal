import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../store';
import { createListing } from '../store/slices/marketplaceSlice';
import { mediaAPI } from '../services/mediaApi';
import { marketplaceAPI } from '../services/api';
import { colors, typography, spacing, borderRadius } from '../theme';

const AMENITIES = [
  { key: 'covered', label: 'Covered' },
  { key: 'cctv', label: 'CCTV' },
  { key: 'security', label: 'Security' },
  { key: 'ev_charging', label: 'EV Charging' },
  { key: 'accessible', label: 'Accessible' },
  { key: '24_7_access', label: '24/7 Access' },
];

export const ListYourSpot: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  
  // Get params from navigation (passed when editing)
  const listingId = route.params?.listingId;
  const isEditMode = !!listingId;

  // State for form fields
  const [spotName, setSpotName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [lat, setLat] = useState(14.5995);
  const [lon, setLon] = useState(120.9822);
  const [slotType, setSlotType] = useState<'roadside_qr' | 'commercial_manual' | 'commercial_iot'>('roadside_qr');
  const [loading, setLoading] = useState(false);

  // Fetch listing data if in edit mode
  useEffect(() => {
    if (isEditMode && listingId) {
      const fetchListing = async () => {
        try {
          setLoading(true);
          const response = await marketplaceAPI.getListingById(listingId);
          const listing = response.data?.data || response.data;

           if (listing) {
            setSpotName(listing.title || listing.address || '');
            setDescription(listing.description || '');
            setAddress(listing.address || '');
            setPrice(listing.price?.toString() || '');
            setLat(listing.lat || listing.latitude || 14.5995);
            setLon(listing.lon || listing.longitude || 120.9822);
            setSlotType(listing.slotType || 'roadside_qr');
            
            // Parse amenities
            if (listing.amenities) {
              try {
                const parsed = typeof listing.amenities === 'string' 
                  ? JSON.parse(listing.amenities) 
                  : listing.amenities;
                setSelectedAmenities(parsed || []);
              } catch (e) {
                // Ignore parse errors
              }
            }
            
            // Parse photos
            if (listing.photos) {
              try {
                const parsed = typeof listing.photos === 'string' 
                  ? JSON.parse(listing.photos) 
                  : listing.photos;
                setPhotos(parsed || []);
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch listing:', error);
          Alert.alert('Error', 'Failed to load listing data');
        } finally {
          setLoading(false);
        }
      };
      
      fetchListing();
    }
  }, [isEditMode, listingId]);

  const toggleAmenity = useCallback((key: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(key)
        ? prev.filter((a) => a !== key)
        : [...prev, key]
    );
  }, []);

  const handleAddMorePhotos = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  }, []);

   const handleContinue = useCallback(async () => {
     if (!spotName.trim()) {
       Alert.alert('Required', 'Please enter a spot name.');
       return;
     }
     if (!address.trim()) {
       Alert.alert('Required', 'Please enter an address.');
       return;
     }
     if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
       Alert.alert('Required', 'Please enter a valid price.');
       return;
     }

     setLoading(true);
     try {
       const listingData = {
         title: spotName.trim(),
         description: description.trim(),
         address: address.trim(),
         latitude: Number(lat) || 14.5995,
         longitude: Number(lon) || 120.9822,
         pricePerHour: Number(price),
         slotType,
         amenities: selectedAmenities,
         photos: photos.filter(p => !p.includes('unsplash')),
       };

        let result: any;
        if (isEditMode && listingId) {
          // Update existing listing via API - convert to backend field names
          const updateData = {
            title: spotName.trim(),
            description: description.trim(),
            address: address.trim(),
            lat: Number(lat) || 14.5995,
            lon: Number(lon) || 120.9822,
            price: Number(price),
            slotType,
            amenities: selectedAmenities,
            photos: photos.filter(p => !p.includes('unsplash')),
          };
          result = await marketplaceAPI.updateListing(listingId, updateData);
          Alert.alert(
            'Updated! 🎉',
            'Your parking spot has been updated.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
         // Create new listing via Redux
         result = await dispatch(createListing(listingData)).unwrap();
         
// Upload local photos if any (only file:// URIs, not existing GCS URLs)
          const newListingId = result.id || result.data?.id;
          const localPhotos = photos.filter(p => p.startsWith('file://'));
          
          console.log('[ListYourSpot] Photos to upload:', localPhotos.length, 'listingId:', newListingId);
          
          if (localPhotos.length > 0 && newListingId) {
            const uploadedUrls: string[] = [];
            for (const photoUri of localPhotos) {
              try {
                console.log('[ListYourSpot] Uploading photo:', photoUri);
                const uploadResult = await mediaAPI.uploadListingPhoto(newListingId, photoUri);
                console.log('[ListYourSpot] Upload result:', uploadResult);
                // Store the original URL from the result
                if (uploadResult.original) {
                  uploadedUrls.push(uploadResult.original);
                }
              } catch (uploadError: any) {
                console.error('[ListYourSpot] Failed to upload photo:', uploadError?.message || uploadError);
              }
            }
            
            // Update listing with photo URLs if any uploaded
            if (uploadedUrls.length > 0) {
              try {
                await marketplaceAPI.updateListing(newListingId, { photos: uploadedUrls });
                console.log('[ListYourSpot] Listing updated with photos');
              } catch (updateError) {
                console.error('[ListYourSpot] Failed to update listing with photos:', updateError);
              }
            }
          }
         
         Alert.alert(
           'Success! 🎉',
           'Your parking spot has been listed.',
           [{ text: 'OK', onPress: () => navigation.goBack() }]
         );
       }
     } catch (error: any) {
       console.error('Listing error:', error);
       Alert.alert('Error', error?.message || 'Failed to save listing. Please try again.');
     } finally {
       setLoading(false);
     }
   }, [spotName, address, price, lat, lon, slotType, description, selectedAmenities, photos, dispatch, navigation, isEditMode, listingId]);

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
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Listing' : 'List Your Spot'}</Text>
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
              {photos.map((photo) => (
                <Image
                  key={photo}
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
            <Text style={styles.photoCount}>{photos.length}/5 photos</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address *</Text>
            <TextInput
              style={styles.textInput}
              value={address}
              onChangeText={setAddress}
              placeholder="Full address (e.g., 123 Main Street, Makati City)"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Latitude</Text>
              <TextInput
                style={styles.textInput}
                value={String(lat)}
                onChangeText={(t) => setLat(Number(t) || 14.5995)}
                placeholder="14.5995"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: spacing.md }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Longitude</Text>
              <TextInput
                style={styles.textInput}
                value={String(lon)}
                onChangeText={(t) => setLon(Number(t) || 120.9822)}
                placeholder="120.9822"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Price per Hour (PHP) *</Text>
            <TextInput
              style={styles.textInput}
              value={price}
              onChangeText={setPrice}
              placeholder="50"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spot Type</Text>
          <View style={styles.slotTypeContainer}>
            {[
              { key: 'roadside_qr', label: 'Roadside (QR)', desc: 'Street parking with QR code' },
              { key: 'commercial_manual', label: 'Commercial', desc: 'Managed lot with manual entry' },
              { key: 'commercial_iot', label: 'Smart Lot', desc: 'IoT-enabled smart parking' },
            ].map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[styles.slotTypeOption, slotType === type.key && styles.slotTypeOptionSelected]}
                onPress={() => setSlotType(type.key as any)}
              >
                <Text style={[styles.slotTypeLabel, slotType === type.key && styles.slotTypeLabelSelected]}>
                  {type.label}
                </Text>
                <Text style={styles.slotTypeDesc}>{type.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[styles.continueButton, loading && styles.continueButtonDisabled]} 
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.continueButtonText}>
            {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update' : 'Continue')}
          </Text>
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
  inputRow: {
    flexDirection: 'row',
  },
  slotTypeContainer: {
    gap: spacing.sm,
  },
  slotTypeOption: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotTypeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  slotTypeLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  slotTypeLabelSelected: {
    color: colors.primary,
  },
  slotTypeDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
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
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
});
