import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Toast } from '../components/Toast';
import { colors, typography, spacing, borderRadius } from '../theme';

export const ListSpotScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const navigation = useNavigation();

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

  const amenitiesOptions = [
    'Security',
    'Covered',
    'EV Charging',
    'Accessible',
    'Lighting',
    'CCTV',
  ];

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
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

  const handleSubmit = () => {
    // TODO: Implement API call to create parking spot
    setShowToast(true);
    setTimeout(() => {
      navigation.navigate('Home' as never);
    }, 2000);
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Location Details</Text>
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
          {amenitiesOptions.map((amenity) => (
            <Chip
              key={amenity}
              label={amenity}
              selected={selectedAmenities.includes(amenity)}
              onPress={() => toggleAmenity(amenity)}
            />
          ))}
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
        Add up to 5 photos of your parking spot
      </Text>

      <View style={styles.imagesGrid}>
        {images.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Photo {index + 1}</Text>
            </View>
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
            <Text style={styles.addImageText}>+</Text>
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
          title={currentStep === 3 ? 'Submit' : 'Next'}
          variant="gradient"
          onPress={currentStep === 3 ? handleSubmit : handleNext}
          style={styles.button}
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
