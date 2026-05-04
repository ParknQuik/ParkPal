import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mediaAPI, Photo } from '../services/mediaApi';
import { spacing, borderRadius, typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface PhotoUploaderProps {
  slotId: number;
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
  editable?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  slotId,
  photos,
  onPhotosChange,
  maxPhotos = 5,
  editable = true,
}) => {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const canAddMore = photos.length < maxPhotos;

  const handleAddPhoto = () => {
    Alert.alert(
      'Add Photo',
      'Choose a source',
      [
        {
          text: 'Camera',
          onPress: () => takePhoto(),
        },
        {
          text: 'Photo Library',
          onPress: () => pickImage(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const takePhoto = async () => {
    try {
      const imageUri = await mediaAPI.takePhoto({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (imageUri) {
        await uploadPhoto(imageUri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      const imageUri = await mediaAPI.pickImage({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (imageUri) {
        await uploadPhoto(imageUri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const uploadPhoto = async (imageUri: string) => {
    try {
      setUploading(true);
      setUploadProgress(10);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Upload photo
      const newPhoto = await mediaAPI.uploadPhoto(slotId, imageUri);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Add to photos array
      onPhotosChange([...photos, newPhoto]);

      // Reset after a short delay
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error: any) {
      ;
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeletePhoto = (photoId: number) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await mediaAPI.deletePhoto(photoId);
              onPhotosChange(photos.filter((p) => p.id !== photoId));
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginVertical: spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    title: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.semibold,
      color: colors.text,
    },
    subtitle: {
      fontSize: typography.sizes.sm,
      color: colors.textSecondary,
    },
    scrollContent: {
      paddingVertical: spacing.xs,
    },
    photoContainer: {
      marginRight: spacing.md,
      position: 'relative',
    },
    photo: {
      width: 120,
      height: 120,
      borderRadius: borderRadius.md,
      backgroundColor: colors.border,
    },
    primaryBadge: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    primaryBadgeText: {
      color: colors.white,
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.semibold,
    },
    deleteButton: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: colors.white,
      borderRadius: 14,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    addButton: {
      width: 120,
      height: 120,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    addButtonText: {
      marginTop: spacing.xs,
      fontSize: typography.sizes.sm,
      color: colors.textSecondary,
    },
    uploadingContainer: {
      alignItems: 'center',
    },
    uploadingText: {
      marginTop: spacing.sm,
      fontSize: typography.sizes.sm,
      color: colors.primary,
      fontWeight: typography.weights.medium,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyStateText: {
      marginTop: spacing.md,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.medium,
      color: colors.textSecondary,
    },
    emptyStateSubtext: {
      marginTop: spacing.xs,
      fontSize: typography.sizes.sm,
      color: colors.textTertiary,
      textAlign: 'center',
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photos</Text>
        <Text style={styles.subtitle}>
          {photos.length}/{maxPhotos} photos
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Existing photos */}
        {photos.map((photo, index) => (
          <View key={photo.id} style={styles.photoContainer}>
            <Image source={{ uri: photo.mediumUrl }} style={styles.photo} />
            {index === 0 && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>Primary</Text>
              </View>
            )}
            {editable && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePhoto(photo.id)}
              >
                <Ionicons name="close-circle" size={28} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Add photo button */}
        {editable && canAddMore && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddPhoto}
            disabled={uploading}
          >
            {uploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.uploadingText}>{uploadProgress}%</Text>
              </View>
            ) : (
              <>
                <Ionicons name="camera" size={32} color={colors.textSecondary} />
                <Text style={styles.addButtonText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {photos.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateText}>No photos yet</Text>
          {editable && (
            <Text style={styles.emptyStateSubtext}>
              Add photos to make your listing more attractive
            </Text>
          )}
        </View>
      )}
    </View>
  );
};
