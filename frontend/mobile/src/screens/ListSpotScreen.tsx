import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { createListing } from '../store/slices/marketplaceSlice';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Toast } from '../components/Toast';
import { colors, typography, spacing, borderRadius } from '../theme';

const { width } = Dimensions.get('window');

export const ListSpotScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { error } = useAppSelector((state) => state.marketplace);

  // Form state
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState<'hour' | 'day'>('hour');
  const [description, setDescription] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number>(14.5995);
  const [longitude, setLongitude] = useState<number>(120.9842);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [gettingAddress, setGettingAddress] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lon = location.coords.longitude;
      setLatitude(lat);
      setLongitude(lon);
      setMapRegion({
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      // Get address for current location
      reverseGeocode(lat, lon);
    }
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    setGettingAddress(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (results.length > 0) {
        const result = results[0];
        setAddress(result.street || result.name || '');
        setCity(result.city || '');
        setState(result.region || result.isoCountryCode || '');
        setZipCode(result.postalCode || '');
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    } finally {
      setGettingAddress(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude: lat, longitude: lon } = event.nativeEvent.coordinate;
    setLatitude(lat);
    setLongitude(lon);
    reverseGeocode(lat, lon);
  };

  const amenitiesOptions = [
    'security',
    'covered',
    'ev_charging',
    'accessible',
    'lighting',
    'cctv',
    'wifi',
    'restroom',
  ];

  const handleImagePick = async () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: handleCamera,
        },
        {
          text: 'Choose from Library',
          onPress: handleGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => asset.uri);
      setImages([...images, ...newImages].slice(0, 5));
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => asset.uri);
      setImages([...images, ...newImages].slice(0, 5));
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!title || !address || !price || !latitude || !longitude) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    // Check minimum photo requirement
    if (images.length < 2) {
      Alert.alert(
        'More Photos Needed',
        'Please add at least 2 photos of your parking spot for verification.'
      );
      return;
    }

    setLoading(true);
    try {
      const fullAddress = `${address}, ${city}, ${state} ${zipCode}`.trim();

      const result = await dispatch(
        createListing({
          lat: latitude,
          lon: longitude,
          price: parseFloat(price),
          address: fullAddress,
          slotType: 'roadside_qr',
          description: description || title,
          amenities: selectedAmenities,
          photos: images,
        })
      ).unwrap();

      // Show verification feedback
      const verification = result.verification;
      if (verification) {
        const { score, autoApproved, issues, requiresReview } = verification;

        if (autoApproved) {
          Alert.alert(
            'Listing Approved! ✅',
            `Your listing has been auto-approved with a quality score of ${score}/100. It's now live!`,
            [{ text: 'Great!', onPress: () => navigation.navigate('Home' as never) }]
          );
        } else if (requiresReview) {
          const issueMessages = issues
            .filter((i: any) => i.severity === 'high')
            .map((i: any) => `• ${i.message}`)
            .join('\n');

          Alert.alert(
            'Pending Review ⏳',
            `Your listing needs admin review (Score: ${score}/100).\n\nIssues to fix:\n${issueMessages}`,
            [{ text: 'OK', onPress: () => navigation.navigate('Home' as never) }]
          );
        } else {
          Alert.alert(
            'Listing Submitted! ✓',
            `Your listing is pending approval (Score: ${score}/100). We'll notify you once it's approved.`,
            [{ text: 'OK', onPress: () => navigation.navigate('Home' as never) }]
          );
        }
      } else {
        setShowToast(true);
        setTimeout(() => {
          navigation.navigate('Home' as never);
        }, 2000);
      }
    } catch (err: any) {
      console.error('Create listing error:', err);

      let errorMessage = 'Failed to create listing';

      // Handle verification errors
      if (err.response?.data?.verification) {
        const { score, issues } = err.response.data.verification;
        const highIssues = issues
          .filter((i: any) => i.severity === 'high')
          .map((i: any) => `• ${i.message}`)
          .join('\n');

        errorMessage = `Verification Failed (Score: ${score}/100)\n\nPlease fix:\n${highIssues}`;
      } else if (err.message === 'Network Error') {
        errorMessage = 'Cannot connect to server. Make sure the backend is running at http://localhost:3001';
      } else if (err.response?.status === 401) {
        errorMessage = 'You need to login first to create a listing. Please go to the Profile tab and login.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Location Details</Text>
      <Text style={styles.mapInstructions}>
        📍 Tap on the map to pin your parking location
      </Text>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={mapRegion}
          onPress={handleMapPress}
          onRegionChangeComplete={setMapRegion}
        >
          <Marker
            coordinate={{ latitude, longitude }}
            draggable
            onDragEnd={(e) => {
              const { latitude: lat, longitude: lon } = e.nativeEvent.coordinate;
              setLatitude(lat);
              setLongitude(lon);
              reverseGeocode(lat, lon);
            }}
            title="Parking Location"
            description="Drag to adjust position"
          />
        </MapView>
        {gettingAddress && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.mapLoadingText}>Getting address...</Text>
          </View>
        )}
      </View>

      <Input
        label="Parking Spot Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g., Downtown Parking Garage"
      />
      <Input
        label="Address"
        value={address}
        onChangeText={setAddress}
        placeholder="123 Main St"
      />
      <View style={styles.row}>
        <Input
          label="City"
          value={city}
          onChangeText={setCity}
          placeholder="San Francisco"
          style={styles.halfInput}
        />
        <Input
          label="State"
          value={state}
          onChangeText={setState}
          placeholder="CA"
          style={styles.halfInput}
        />
      </View>
      <Input
        label="Zip Code"
        value={zipCode}
        onChangeText={setZipCode}
        placeholder="94102"
      />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Pricing & Amenities</Text>
      <Input
        label="Price"
        value={price}
        onChangeText={setPrice}
        placeholder="10.00"
      />
      <View style={styles.priceUnitContainer}>
        <Text style={styles.label}>Price Per</Text>
        <View style={styles.priceUnitOptions}>
          <TouchableOpacity
            style={[
              styles.priceUnitOption,
              priceUnit === 'hour' && styles.priceUnitOptionActive,
            ]}
            onPress={() => setPriceUnit('hour')}
          >
            <Text
              style={[
                styles.priceUnitText,
                priceUnit === 'hour' && styles.priceUnitTextActive,
              ]}
            >
              Hour
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.priceUnitOption,
              priceUnit === 'day' && styles.priceUnitOptionActive,
            ]}
            onPress={() => setPriceUnit('day')}
          >
            <Text
              style={[
                styles.priceUnitText,
                priceUnit === 'day' && styles.priceUnitTextActive,
              ]}
            >
              Day
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.amenitiesSection}>
        <Text style={styles.label}>Amenities</Text>
        <View style={styles.amenitiesGrid}>
          {amenitiesOptions.map((amenity) => {
            const displayLabels: Record<string, string> = {
              security: 'Security',
              covered: 'Covered',
              ev_charging: 'EV Charging',
              accessible: 'Accessible',
              lighting: 'Lighting',
              cctv: 'CCTV',
              wifi: 'WiFi',
              restroom: 'Restroom',
            };
            return (
              <Chip
                key={amenity}
                label={displayLabels[amenity] || amenity}
                selected={selectedAmenities.includes(amenity)}
                onPress={() => toggleAmenity(amenity)}
              />
            );
          })}
        </View>
      </View>

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Describe your parking spot..."
      />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Photos</Text>
      <Text style={styles.subtitle}>
        Add up to 5 photos of your parking spot (Recommended for better visibility)
      </Text>

      <View style={styles.imagesGrid}>
        {images.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setImages(images.filter((_, i) => i !== index))}
            >
              <Text style={styles.removeImageText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {images.length < 5 && (
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={handleImagePick}
          >
            <Text style={styles.addImageText}>📷</Text>
            <Text style={styles.addImageLabel}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Title</Text>
          <Text style={styles.summaryValue}>{title || '-'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Location</Text>
          <Text style={styles.summaryValue}>
            {city && state ? `${city}, ${state}` : '-'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Price</Text>
          <Text style={styles.summaryValue}>
            {price ? `$${price}/${priceUnit}` : '-'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amenities</Text>
          <Text style={styles.summaryValue}>
            {selectedAmenities.length || 0}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Photos</Text>
          <Text style={styles.summaryValue}>{images.length}</Text>
        </View>
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>List Your Spot</Text>
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={[
                styles.progressDot,
                step <= currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          title={currentStep === 1 ? 'Cancel' : 'Back'}
          variant="outline"
          onPress={handleBack}
          style={styles.button}
        />
        <Button
          title={currentStep === 3 ? (loading ? 'Creating...' : 'Submit') : 'Next'}
          variant="gradient"
          onPress={currentStep === 3 ? handleSubmit : handleNext}
          style={styles.button}
          disabled={loading}
          loading={loading}
        />
      </View>

      <Toast
        visible={showToast}
        message="Parking spot listed successfully!"
        type="success"
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressDot: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  stepTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  mapInstructions: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  mapContainer: {
    height: 250,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  priceUnitContainer: {
    marginBottom: spacing.lg,
  },
  priceUnitOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  priceUnitOption: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  priceUnitOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  priceUnitText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  priceUnitTextActive: {
    color: colors.white,
  },
  amenitiesSection: {
    marginBottom: spacing.lg,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  imageContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    backgroundColor: colors.error,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 32,
    color: colors.textSecondary,
  },
  addImageLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  summaryCard: {
    marginTop: spacing.xl,
  },
  summaryTitle: {
    ...typography.h6,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
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
  button: {
    flex: 1,
  },
});
