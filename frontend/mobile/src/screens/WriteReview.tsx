import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { marketplaceAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';

const { width } = Dimensions.get('window');

const HERO_IMAGE = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&h=400&fit=crop';

export const WriteReview: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { spotId } = (route.params || {}) as { spotId?: string | number };
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    spotCard: {
      backgroundColor: colors.surface,
      margin: 16,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    spotImage: {
      width: '100%',
      height: 140,
    },
    spotContent: {
      padding: 16,
    },
    badgeRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    pastBookingBadge: {
      backgroundColor: colors.secondary + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    pastBookingText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.secondary,
    },
    spotName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    starsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    starButton: {
      padding: 4,
    },
    starIcon: {
      fontSize: 40,
      color: colors.border,
    },
    starFilled: {
      color: colors.accent,
    },
    promptBox: {
      backgroundColor: colors.primary + '15',
      marginHorizontal: 16,
      marginBottom: 20,
      padding: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    promptText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.primary,
    },
    textArea: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 15,
      color: colors.textPrimary,
      minHeight: 140,
      borderWidth: 1,
      borderColor: colors.border,
    },
    photoUpload: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
    },
    photoIconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    photoIcon: {
      fontSize: 28,
    },
    photoUploadText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    photosGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    photoContainer: {
      position: 'relative',
    },
    photoThumbnail: {
      width: 80,
      height: 80,
      borderRadius: 8,
    },
    removePhotoButton: {
      position: 'absolute',
      top: -8,
      right: -8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
    },
    removePhotoText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: 'bold',
    },
    photoCount: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
    },
    bottomSpacer: {
      height: 20,
    },
    footer: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    submitButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.white,
    },
  }), [colors]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      await marketplaceAPI.createReview({
        slotId: Number(spotId),
        rating,
        comment: reviewText,
      });
      Alert.alert('Success', 'Your review has been submitted!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = async () => {
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
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Text style={[styles.starIcon, star <= rating && styles.starFilled]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <AppHeader title="Write a Review" onBack={() => navigation.goBack()} />

        {/* Spot Card */}
        <View style={styles.spotCard}>
          <Image
            source={{ uri: HERO_IMAGE }}
            style={styles.spotImage}
            resizeMode="cover"
          />
          <View style={styles.spotContent}>
            <View style={styles.badgeRow}>
              <View style={styles.pastBookingBadge}>
                <Text style={styles.pastBookingText}>Past Booking</Text>
              </View>
            </View>
            <Text style={styles.spotName}>Parking Spot #{spotId}</Text>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How was your experience?</Text>
          {renderStars()}
        </View>

        {/* Prompt Box */}
        <View style={styles.promptBox}>
          <Text style={styles.promptText}>What did you love about this spot?</Text>
        </View>

        {/* Review Text Area */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Review</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Share details of your experience..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={reviewText}
            onChangeText={setReviewText}
          />
        </View>

        {/* Photo Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Photos</Text>
          <View style={styles.photosGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photoThumbnail} />
                <TouchableOpacity 
                  style={styles.removePhotoButton} 
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={styles.photoUpload} onPress={handlePhotoUpload}>
                <View style={styles.photoIconContainer}>
                  <Text style={styles.photoIcon}>📷</Text>
                </View>
                <Text style={styles.photoUploadText}>Tap to add photos</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.photoCount}>{photos.length}/5 photos</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};