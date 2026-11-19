import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import api from './api';
import { photoUploadError, uploadSignedPhoto } from './signedPhotoUpload';

// Use the same API URL configuration as the main api.ts

export interface UploadUrlResponse {
  uploadUrl: string;
  fileName: string;
  expiresAt: string;
}

export interface Photo {
  id: number;
  slotId: number;
  originalUrl: string;
  largeUrl: string;
  mediumUrl: string;
  thumbnailUrl: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

const getImageUploadMetadata = (imageUri: string) => {
  const path = imageUri.split(/[?#]/)[0] || '';
  const rawExtension = path.includes('.') ? path.split('.').pop()?.toLowerCase() : undefined;
  const extension = rawExtension && /^[a-z0-9]+$/.test(rawExtension) ? rawExtension : '';
  const mimeTypeByExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  return {
    extension,
    contentType: mimeTypeByExtension[extension],
  };
};

/**
 * Media API service for photo uploads
 */
export const mediaAPI = {
  /**
   * Request a signed upload URL from the backend
   */
  async requestUploadUrl(slotId: number, fileName: string): Promise<UploadUrlResponse> {
    const response = await api.post('/media/upload-url', { slotId, fileName });

    return response.data;
  },

  /**
   * Upload image directly to GCS using signed URL
   */
  async uploadToGCS(
    uploadUrl: string,
    imageUri: string,
    contentType: string = 'image/jpeg'
  ): Promise<void> {
    await uploadSignedPhoto(uploadUrl, imageUri, contentType);
  },

  /**
   * Confirm upload and trigger image processing
   */
  async confirmUpload(slotId: number, fileName: string): Promise<Photo> {
    const response = await api.post('/media/confirm-upload', { slotId, fileName });

    return response.data;
  },

  /**
   * Get signed URL for uploading a listing photo
   */
  async getListingPhotoUploadUrl(
    listingId: number,
    fileName: string,
    contentType: string = 'image/jpeg'
  ): Promise<UploadUrlResponse> {
    const response = await api.get(`/marketplace/listings/${listingId}/photos/upload-url`, {
      params: { fileName, contentType },
    });

    return response.data;
  },

  /**
   * Upload a listing photo to GCS
   */
  async uploadListingPhoto(listingId: number, imageUri: string): Promise<any> {
      let uploadUri = imageUri;
      let { extension, contentType } = getImageUploadMetadata(imageUri);

      if (!contentType) {
        let convertedImage;
        try {
          convertedImage = await ImageManipulator.manipulateAsync(
            imageUri, [], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
          );
        } catch (error) {
          throw photoUploadError('image preparation', error);
        }
        uploadUri = convertedImage.uri;
        extension = 'jpg';
        contentType = 'image/jpeg';
      }
      const fileName = `photo-${Date.now()}.${extension}`;

      let uploadUrl: string;
      let gcsFileName: string;
      try {
        ({ uploadUrl, fileName: gcsFileName } = await this.getListingPhotoUploadUrl(listingId, fileName, contentType));
      } catch (error) {
        throw photoUploadError('signing', error);
      }

      await this.uploadToGCS(uploadUrl, uploadUri, contentType);

      try {
        const response = await api.post(`/marketplace/listings/${listingId}/photos/confirm`, {
          fileName: gcsFileName,
        });
        return response.data;
      } catch (error) {
        throw photoUploadError('confirmation', error);
      }
  },

  /**
   * Get all photos for a parking slot
   */
  async getSlotPhotos(slotId: number): Promise<Photo[]> {
    const response = await api.get(`/media/photos/slot/${slotId}`);
    return response.data;
  },

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: number): Promise<void> {
    await api.delete(`/media/photos/${photoId}`);
  },

  /**
   * Complete photo upload flow: request URL -> upload -> confirm
   */
  async uploadPhoto(slotId: number, imageUri: string): Promise<Photo> {
      let uploadUri: string;
      try {
        uploadUri = (await ImageManipulator.manipulateAsync(
          imageUri, [], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        )).uri;
      } catch (error) {
        throw photoUploadError('image preparation', error);
      }
      const fileName = `photo-${Date.now()}.jpg`;

      // Step 1: Request signed upload URL
      let uploadUrl: string;
      let gcsFileName: string;
      try {
        ({ uploadUrl, fileName: gcsFileName } = await this.requestUploadUrl(slotId, fileName));
      } catch (error) {
        throw photoUploadError('signing', error);
      }

      // Step 2: Upload to GCS
      await this.uploadToGCS(uploadUrl, uploadUri, 'image/jpeg');

      // Step 3: Confirm upload and get processed photo URLs
      try {
        return await this.confirmUpload(slotId, gcsFileName);
      } catch (error) {
        throw photoUploadError('confirmation', error);
      }
  },

  /**
   * Request camera permissions
   */
  async requestCameraPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Request media library permissions
   */
  async requestMediaLibraryPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Launch image picker
   */
  async pickImage(options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<string | null> {
    const hasPermission = await this.requestMediaLibraryPermission();

    if (!hasPermission) {
      throw new Error('Media library permission denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [4, 3],
      quality: options?.quality ?? 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }

    return null;
  },

  /**
   * Launch camera
   */
  async takePhoto(options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<string | null> {
    const hasPermission = await this.requestCameraPermission();

    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [4, 3],
      quality: options?.quality ?? 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }

    return null;
  },
};
