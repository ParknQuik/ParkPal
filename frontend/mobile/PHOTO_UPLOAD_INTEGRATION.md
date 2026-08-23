# Photo Upload Integration

This guide explains how the mobile app uploads listing photos. Guide

## Overview

The `PhotoUploader` component is ready to use for uploading photos to GCS. However, it requires a `slotId` to associate photos with a parking slot.

## Integration Patterns

### Pattern 1: Upload Photos After Slot Creation (Recommended)

**When to use:** For new listings where we need to create the slot first.

**Flow:**
1. User fills form (location, price, amenities)
2. Submit creates the slot (without photos)
3. Navigate to photo upload screen with the new `slotId`
4. User uploads photos using `PhotoUploader`
5. Photos are associated with the slot

**Implementation:**

```tsx
// After successful slot creation in ListSpotScreen
const result = await dispatch(createListing({
  lat: latitude,
  lon: longitude,
  price: parseFloat(price),
  address: fullAddress,
  slotType: 'roadside_qr',
  description: description || title,
  amenities: selectedAmenities,
  // Don't pass photos here
})).unwrap();

// Navigate to photo upload screen
navigation.navigate('UploadPhotos', { slotId: result.id });
```

**Create `UploadPhotosScreen.tsx`:**

```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { PhotoUploader } from '../components/PhotoUploader';
import { Photo } from '../services/mediaApi';

export const UploadPhotosScreen = ({ route, navigation }) => {
  const { slotId } = route.params;
  const [photos, setPhotos] = useState<Photo[]>([]);

  const handlePhotosChange = (newPhotos: Photo[]) => {
    setPhotos(newPhotos);
  };

  const handleContinue = () => {
    // Navigate to home or my listings
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <PhotoUploader
        slotId={slotId}
        photos={photos}
        onPhotosChange={handlePhotosChange}
        maxPhotos={5}
        editable={true}
      />
      <Button title="Continue" onPress={handleContinue} />
    </View>
  );
};
```

### Pattern 2: Edit Existing Listings

**When to use:** For editing photos of existing listings.

**Implementation in `MyListingsScreen.tsx`:**

```tsx
import { PhotoUploader } from '../components/PhotoUploader';
import { mediaAPI, Photo } from '../services/mediaApi';

// Inside your component
const [photos, setPhotos] = useState<Photo[]>([]);
const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

// Load photos for a slot
useEffect(() => {
  if (selectedSlotId) {
    loadPhotos(selectedSlotId);
  }
}, [selectedSlotId]);

const loadPhotos = async (slotId: number) => {
  try {
    const slotPhotos = await mediaAPI.getSlotPhotos(slotId);
    setPhotos(slotPhotos);
  } catch (error) {
    console.error('Failed to load photos:', error);
  }
};

// In your render
<PhotoUploader
  slotId={selectedSlotId}
  photos={photos}
  onPhotosChange={setPhotos}
  maxPhotos={5}
  editable={true}
/>
```

### Pattern 3: Hybrid Approach (Current ListSpotScreen)

**Keep local image preview during creation, then upload after:**

```tsx
// Step 1: Modify ListSpotScreen.tsx handleSubmit

const handleSubmit = async () => {
  // ... validation ...

  setLoading(true);
  try {
    // Create listing WITHOUT photos
    const result = await dispatch(
      createListing({
        lat: latitude,
        lon: longitude,
        price: parseFloat(price),
        address: fullAddress,
        slotType: 'roadside_qr',
        description: description || title,
        amenities: selectedAmenities,
        // photos: images, // DON'T pass local URIs
      })
    ).unwrap();

    const newSlotId = result.id;

    // Upload photos to the created slot
    if (images.length > 0) {
      await uploadPhotosToSlot(newSlotId, images);
    }

    // Show success and navigate
    Alert.alert('Success!', 'Your listing has been created!');
    navigation.navigate('Home');
  } catch (err) {
    // ... error handling ...
  } finally {
    setLoading(false);
  }
};

// Add this function
const uploadPhotosToSlot = async (slotId: number, imageUris: string[]) => {
  try {
    for (const imageUri of imageUris) {
      await mediaAPI.uploadPhoto(slotId, imageUri);
    }
  } catch (error) {
    console.error('Photo upload error:', error);
    Alert.alert(
      'Photo Upload Failed',
      'Your listing was created but some photos failed to upload. You can add them later from My Listings.'
    );
  }
};
```

## API Usage Examples

### Upload a single photo

```tsx
import { mediaAPI } from '../services/mediaApi';

const uploadPhoto = async (slotId: number, imageUri: string) => {
  try {
    const photo = await mediaAPI.uploadPhoto(slotId, imageUri);
    console.log('Uploaded photo:', photo);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Get photos for a slot

```tsx
const loadPhotos = async (slotId: number) => {
  const photos = await mediaAPI.getSlotPhotos(slotId);
  console.log('Photos:', photos);
};
```

### Delete a photo

```tsx
const deletePhoto = async (photoId: number) => {
  await mediaAPI.deletePhoto(photoId);
};
```

### Pick image from library

```tsx
const handlePickImage = async () => {
  const imageUri = await mediaAPI.pickImage({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.9,
  });

  if (imageUri) {
    // Upload to slot
    await mediaAPI.uploadPhoto(slotId, imageUri);
  }
};
```

### Take photo with camera

```tsx
const handleTakePhoto = async () => {
  const imageUri = await mediaAPI.takePhoto({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.9,
  });

  if (imageUri) {
    // Upload to slot
    await mediaAPI.uploadPhoto(slotId, imageUri);
  }
};
```

## Component Props

### PhotoUploader

```tsx
interface PhotoUploaderProps {
  slotId: number;              // Required: The parking slot ID
  photos: Photo[];              // Current photos array
  onPhotosChange: (photos: Photo[]) => void;  // Callback when photos change
  maxPhotos?: number;           // Default: 5
  editable?: boolean;           // Default: true
}
```

### Photo Type

```tsx
interface Photo {
  id: number;
  slotId: number;
  originalUrl: string;      // Full resolution
  largeUrl: string;         // 1200px
  mediumUrl: string;        // 800px
  thumbnailUrl: string;     // 300px
  position: number;         // Display order (0 = primary)
  createdAt: string;
  updatedAt: string;
}
```

## Recommended Integration Steps

1. **Create UploadPhotosScreen** (Pattern 1)
   - Add new screen to navigation
   - Use after slot creation

2. **Modify ListSpotScreen**
   - Remove photo requirement or make optional
   - OR implement Pattern 3 (hybrid approach)

3. **Add to MyListingsScreen** (Pattern 2)
   - Allow editing photos of existing listings
   - Load existing photos from API

4. **Test Flow**
   - Create listing → Upload photos → View in MyListings
   - Edit existing listing photos

## GCP Configuration Required

Before photos can upload, set up GCP:

1. Create GCS bucket: `parkpal-photos`
2. Create service account with Storage Admin role
3. Add to backend `.env`:
   ```
   GCS_BUCKET_NAME=parkpal-photos
   GCP_PROJECT_ID=your-project-id
   GCP_KEYFILE_PATH=path/to/service-account-key.json
   ```

## Notes

- Photos are automatically resized to 4 sizes (original, large, medium, thumbnail)
- Maximum 5 photos per slot
- First photo (position: 0) is the primary photo
- Photos are stored permanently in GCS
- Deleting a photo removes all size variants
