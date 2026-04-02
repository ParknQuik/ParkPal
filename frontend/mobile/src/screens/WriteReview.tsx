import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { marketplaceAPI } from '../services/api';

const { width } = Dimensions.get('window');

const PRIMARY = '#10b77f';
const SECONDARY = '#f59e0b';
const ACCENT = '#ffeb3b';
const BACKGROUND = '#f6f6f8';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&h=400&fit=crop';

export const WriteReview: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { spotId } = (route.params || {}) as { spotId?: string | number };
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handlePhotoUpload = () => {
    Alert.alert('Coming Soon', 'Photo upload coming soon');
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.headerButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write a Review</Text>
          <View style={styles.headerButton} />
        </View>

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
            placeholderTextColor="#94a3b8"
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
          <TouchableOpacity style={styles.photoUpload} onPress={handlePhotoUpload}>
            <View style={styles.photoIconContainer}>
              <Text style={styles.photoIcon}>📷</Text>
            </View>
            <Text style={styles.photoUploadText}>Tap to add photos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 24,
    color: '#1e293b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  spotCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
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
    backgroundColor: SECONDARY + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pastBookingText: {
    fontSize: 12,
    fontWeight: '600',
    color: SECONDARY,
  },
  spotName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  datesLabel: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 4,
  },
  datesText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#64748b',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
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
    color: '#e2e8f0',
  },
  starFilled: {
    color: ACCENT,
  },
  promptBox: {
    backgroundColor: PRIMARY + '15',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  promptText: {
    fontSize: 15,
    fontWeight: '500',
    color: PRIMARY,
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1e293b',
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoUpload: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
  },
  photoIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoIcon: {
    fontSize: 28,
  },
  photoUploadText: {
    fontSize: 14,
    color: '#64748b',
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: PRIMARY,
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
    color: '#ffffff',
  },
});
