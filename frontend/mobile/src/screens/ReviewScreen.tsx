import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { createReview } from '../store/slices/marketplaceSlice';
import { Button } from '../components/Button';
import { colors, typography, spacing, borderRadius } from '../theme';

export const ReviewScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const { listingId, bookingId } = route.params as {
    listingId: number;
    bookingId?: number;
  };

  const { loading } = useAppSelector((state) => state.marketplace);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    try {
      await dispatch(
        createReview({
          slotId: listingId,
          bookingId,
          rating,
          comment: comment.trim() || undefined,
        })
      ).unwrap();

      Alert.alert('Success', 'Your review has been submitted!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit review');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Write a Review</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Rating Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How was your experience?</Text>
            <Text style={styles.sectionSubtitle}>
              Tap a star to rate your parking experience
            </Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Text
                    style={[
                      styles.star,
                      star <= rating && styles.starSelected,
                    ]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </Text>
            )}
          </View>

          {/* Comment Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share your thoughts</Text>
            <Text style={styles.sectionSubtitle}>
              Help others make informed decisions (optional)
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Tell us about your experience..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {comment.length}/500 characters
            </Text>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Review Tips</Text>
            <Text style={styles.tipText}>
              • Was the location easy to find?
            </Text>
            <Text style={styles.tipText}>
              • Were the amenities as described?
            </Text>
            <Text style={styles.tipText}>• How was the security?</Text>
            <Text style={styles.tipText}>
              • Would you park here again?
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Submit Button */}
      <View style={styles.bottomBar}>
        <Button
          title={loading ? 'Submitting...' : 'Submit Review'}
          variant="gradient"
          onPress={handleSubmit}
          disabled={loading || rating === 0}
          style={styles.submitButton}
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
  content: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text,
  },
  title: {
    ...typography.h2,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  starButton: {
    padding: spacing.sm,
  },
  star: {
    fontSize: 48,
    color: colors.border,
  },
  starSelected: {
    color: '#FFD700',
  },
  ratingText: {
    ...typography.h3,
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
  },
  characterCount: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  tipsContainer: {
    backgroundColor: colors.infoBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  tipsTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.info,
    marginBottom: spacing.md,
  },
  tipText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButton: {
    width: '100%',
  },
});
