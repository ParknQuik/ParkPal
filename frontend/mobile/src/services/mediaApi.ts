import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get API URL from app config, fallback to dev URL
const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  (__DEV__ ? 'http://192.168.100.176:3001/api/v1' : 'https://api.parkpal.com/api/v1');

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

/**
 * Media API service for photo uploads
 */
export const mediaAPI = {
  /**
   * Request a signed upload URL from the backend
   */
  async requestUploadUrl(slotId: number, fileName: string): Promise<UploadUrlResponse> {
    const token = await AsyncStorage.getItem('token');

    const response = await axios.post(
      `${API_BASE_URL}/media/upload-url`,
      { slotId, fileName },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

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
    // Convert local URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload to GCS
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: blob,
    });
  },

  /**
   * Confirm upload and trigger image processing
   */
  async confirmUpload(slotId: number, fileName: string): Promise<Photo> {
    const token = await AsyncStorage.getItem('token');

    const response = await axios.post(
      `${API_BASE_URL}/media/confirm-upload`,
      { slotId, fileName },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  },

  /**
   * Get all photos for a parking slot
   */
  async getSlotPhotos(slotId: number): Promise<Photo[]> {
    const response = await axios.get(`${API_BASE_URL}/media/photos/slot/${slotId}`);
    return response.data;
  },

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: number): Promise<void> {
    const token = await AsyncStorage.getItem('token');

    await axios.delete(`${API_BASE_URL}/media/photos/${photoId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Complete photo upload flow: request URL -> upload -> confirm
   */
  async uploadPhoto(slotId: number, imageUri: string): Promise<Photo> {
    try {
      // Extract file extension from URI
      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `photo-${Date.now()}.${fileExtension}`;

      // Step 1: Request signed upload URL
      const { uploadUrl, fileName: gcsFileName } = await this.requestUploadUrl(
        slotId,
        fileName
      );

      // Step 2: Upload to GCS
      await this.uploadToGCS(uploadUrl, imageUri, `image/${fileExtension}`);

      // Step 3: Confirm upload and get processed photo URLs
      const photo = await this.confirmUpload(slotId, gcsFileName);

      return photo;
    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
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
