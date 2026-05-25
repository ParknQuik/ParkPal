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
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../store';
import { createListing } from '../store/slices/marketplaceSlice';
import { mediaAPI } from '../services/mediaApi';
import { marketplaceAPI } from '../services/api';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { AppHeader } from '../components/AppHeader';

const AMENITIES = [
  { key: 'covered', label: 'Covered', icon: 'garage' },
  { key: 'cctv', label: 'CCTV', icon: 'cctv' },
  { key: 'security', label: 'Security', icon: 'shield-check-outline' },
  { key: 'ev_charging', label: 'EV Charging', icon: 'ev-station' },
  { key: 'accessible', label: 'Accessible', icon: 'wheelchair-accessibility' },
  { key: '24_7_access', label: '24/7 Access', icon: 'clock-outline' },
];

export const ListYourSpot: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const statusBarStyle = useStatusBarStyle();

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
          ;
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

          ;

          if (localPhotos.length > 0 && newListingId) {
            const uploadedUrls: string[] = [];
            for (const photoUri of localPhotos) {
              try {
                ;
                const uploadResult = await mediaAPI.uploadListingPhoto(newListingId, photoUri);
                ;
                // Store the original URL from the result
                if (uploadResult.original) {
                  uploadedUrls.push(uploadResult.original);
                }
              } catch (uploadError: any) {
                ;
              }
            }

            // Update listing with photo URLs if any uploaded
            if (uploadedUrls.length > 0) {
              try {
                await marketplaceAPI.updateListing(newListingId, { photos: uploadedUrls });
                ;
              } catch (updateError) {
                ;
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
       ;
       Alert.alert('Error', error?.message || 'Failed to save listing. Please try again.');
     } finally {
       setLoading(false);
     }
   }, [spotName, address, price, lat, lon, slotType, description, selectedAmenities, photos, dispatch, navigation, isEditMode, listingId]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      backgroundColor: colors.appHeaderBackground,
    },
    contentArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    progressSection: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    progressTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    progressText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    progressBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: `${colors.primary}14`,
    },
    progressBadgeText: {
      ...typography.tiny,
      color: colors.primary,
      fontWeight: '700',
    },
    progressBar: {
      height: 4,
      backgroundColor: colors.surfaceSecondary,
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    sectionIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: `${colors.primary}14`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      ...typography.h6,
      color: colors.textPrimary,
      fontWeight: '700',
      flex: 1,
    },
    photoSection: {
      gap: spacing.md,
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
      backgroundColor: colors.surfaceSecondary,
    },
    addPhotoButton: {
      width: 100,
      height: 100,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: `${colors.primary}90`,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${colors.primary}10`,
    },
    photoCount: {
      ...typography.bodySmall,
      color: colors.textSecondary,
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
      backgroundColor: colors.surfaceSecondary,
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.surfaceSecondary,
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
      gap: spacing.md,
    },
    slotTypeContainer: {
      gap: spacing.sm,
    },
    slotTypeOption: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    slotTypeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary}12`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotTypeCopy: {
      flex: 1,
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
      backgroundColor: colors.surface,
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
  }), [colors]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={`${statusBarStyle}-content`}
        backgroundColor={colors.appHeaderBackground}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader title={isEditMode ? 'Edit Listing' : 'List Your Spot'} onBack={handleBack} />
      </SafeAreaView>

      <View style={styles.contentArea}>
        <View style={styles.progressSection}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressText}>Listing details</Text>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>Step 2 of 3</Text>
            </View>
          </View>
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
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIcon}>
                <MaterialCommunityIcons name="camera-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Photos</Text>
            </View>
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
                <MaterialCommunityIcons name="plus" size={32} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.photoCount}>{photos.length}/5 photos</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons name="parking" size={18} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Spot Details</Text>
          </View>

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
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons name="star-four-points-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Amenities</Text>
          </View>
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
                  <MaterialCommunityIcons
                    name={amenity.icon as any}
                    size={16}
                    color={isSelected ? colors.white : colors.primary}
                  />
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
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Location</Text>
          </View>

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
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons name="cash" size={18} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Pricing</Text>
          </View>

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
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons name="shape-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Spot Type</Text>
          </View>
          <View style={styles.slotTypeContainer}>
            {[
              { key: 'roadside_qr', label: 'Roadside (QR)', desc: 'Street parking with QR code', icon: 'qrcode-scan' },
              { key: 'commercial_manual', label: 'Commercial', desc: 'Managed lot with manual entry', icon: 'office-building-outline' },
              { key: 'commercial_iot', label: 'Smart Lot', desc: 'IoT-enabled smart parking', icon: 'access-point-network' },
            ].map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[styles.slotTypeOption, slotType === type.key && styles.slotTypeOptionSelected]}
                onPress={() => setSlotType(type.key as any)}
              >
                <View style={styles.slotTypeIcon}>
                  <MaterialCommunityIcons
                    name={type.icon as any}
                    size={21}
                    color={slotType === type.key ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.slotTypeCopy}>
                  <Text style={[styles.slotTypeLabel, slotType === type.key && styles.slotTypeLabelSelected]}>
                    {type.label}
                  </Text>
                  <Text style={styles.slotTypeDesc}>{type.desc}</Text>
                </View>
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
      </View>
    </View>
  );
};
