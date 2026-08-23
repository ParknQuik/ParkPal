# Photo Upload Implementation Plan

This plan defines the photo upload work for parking listings.

**Feature:** GCP Cloud Storage Photo Upload
**Branch:** `feat/photo-upload-gcs`
**Priority:** P1 - Critical (Only remaining blocker for beta)
**Estimated Duration:** 2-3 days
**Owner:** Backend + Mobile Teams

---

## Executive Summary

Implement photo upload functionality to allow hosts to add photos to their parking spot listings. This is the **last P1 blocker** preventing beta launch.

### Success Criteria
- ✅ Hosts can upload 1-5 photos per listing
- ✅ Images stored in GCP Cloud Storage
- ✅ Automatic image optimization (resize, compress)
- ✅ Secure signed URLs for uploads
- ✅ Delete functionality
- ✅ Mobile and web UI integration

---

## Architecture

### Storage Strategy
```
GCP Cloud Storage Buckets: parkpal-dev-photos / parkpal-prod-photos
├── listings/
│   ├── {listing_id}/
│   │   ├── {photo_id}_original.jpg
│   │   ├── {photo_id}_large.jpg (1200px)
│   │   ├── {photo_id}_medium.jpg (800px)
│   │   ├── {photo_id}_thumbnail.jpg (300px)
```

### Upload Flow
1. Client requests signed URL from backend
2. Backend generates signed URL (valid for 15 minutes)
3. Client uploads directly to GCS using signed URL
4. Client confirms upload to backend
5. Backend creates database record and triggers optimization
6. Cloud Function generates thumbnails (async)

---

## Implementation Breakdown

### Phase 1: GCP Setup (2 hours)

**Branch:** `feat/photo-upload-gcs` (create from `dev`)

#### 1.1 Create GCS Bucket
```bash
# Via GCP Console or gcloud CLI
gsutil mb -p parkpal-project -c STANDARD -l asia-southeast1 gs://parkpal-dev-photos
gsutil mb -p parkpal-project -c STANDARD -l asia-southeast1 gs://parkpal-prod-photos

# Set CORS configuration
gsutil cors set cors.json gs://parkpal-dev-photos
gsutil cors set cors.json gs://parkpal-prod-photos

# Set lifecycle rules (delete incomplete uploads after 1 day)
gsutil lifecycle set lifecycle.json gs://parkpal-dev-photos
gsutil lifecycle set lifecycle.json gs://parkpal-prod-photos
```

**CORS Configuration** (`cors.json`):
```json
[
  {
    "origin": ["https://parkpal.com", "https://staging.parkpal.com", "http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
```

**Lifecycle Rules** (`lifecycle.json`):
```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 1,
          "matchesPrefix": ["temp/"]
        }
      }
    ]
  }
}
```

#### 1.2 Service Account Setup
```bash
# Create service account
gcloud iam service-accounts create parkpal-storage-admin \
  --display-name="ParkPal Storage Admin"

# Grant storage permissions
gcloud projects add-iam-policy-binding parkpal-project \
  --member="serviceAccount:parkpal-storage-admin@parkpal-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Generate key
gcloud iam service-accounts keys create gcs-key.json \
  --iam-account=parkpal-storage-admin@parkpal-project.iam.gserviceaccount.com

# Add to Secret Manager
gcloud secrets create GCS_SERVICE_ACCOUNT_KEY --data-file=gcs-key.json
```

#### 1.3 Environment Variables
Add to backend `.env` and Secret Manager:
```env
GCS_BUCKET_NAME=parkpal-dev-photos
GCS_PROJECT_ID=parkpal-project
GCS_SERVICE_ACCOUNT_KEY=<key from Secret Manager>
```

---

### Phase 2: Backend Implementation (6-8 hours)

#### 2.1 Install Dependencies
```bash
cd backend
npm install @google-cloud/storage multer sharp
```

#### 2.2 Create Media Service
**File:** `backend/services/media.js`

```javascript
const { Storage } = require('@google-cloud/storage');
const sharp = require('sharp');

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY)
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

/**
 * Generate signed URL for direct upload
 * @param {string} fileName - Original file name
 * @param {string} contentType - MIME type
 * @returns {Promise<{uploadUrl: string, publicUrl: string, fileName: string}>}
 */
exports.generateSignedUploadUrl = async (fileName, contentType) => {
  const timestamp = Date.now();
  const uniqueFileName = `listings/temp/${timestamp}-${fileName}`;

  const file = bucket.file(uniqueFileName);

  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: contentType,
  });

  const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${uniqueFileName}`;

  return { uploadUrl, publicUrl, fileName: uniqueFileName };
};

/**
 * Move file from temp to permanent location and generate thumbnails
 * @param {string} tempFileName - Temporary file name
 * @param {number} listingId - Listing ID
 * @param {number} photoId - Photo database ID
 * @returns {Promise<{original: string, large: string, medium: string, thumbnail: string}>}
 */
exports.processUploadedImage = async (tempFileName, listingId, photoId) => {
  const originalFile = bucket.file(tempFileName);
  const targetDir = `listings/${listingId}`;

  // Download original
  const [buffer] = await originalFile.download();

  // Generate versions
  const versions = {
    original: `${targetDir}/${photoId}_original.jpg`,
    large: `${targetDir}/${photoId}_large.jpg`,
    medium: `${targetDir}/${photoId}_medium.jpg`,
    thumbnail: `${targetDir}/${photoId}_thumbnail.jpg`
  };

  // Upload original
  await bucket.file(versions.original).save(buffer, {
    contentType: 'image/jpeg',
    metadata: { cacheControl: 'public, max-age=31536000' }
  });

  // Generate and upload resized versions
  const sizes = { large: 1200, medium: 800, thumbnail: 300 };

  for (const [size, width] of Object.entries(sizes)) {
    const resized = await sharp(buffer)
      .resize(width, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    await bucket.file(versions[size]).save(resized, {
      contentType: 'image/jpeg',
      metadata: { cacheControl: 'public, max-age=31536000' }
    });
  }

  // Delete temp file
  await originalFile.delete();

  // Return public URLs
  return {
    original: `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${versions.original}`,
    large: `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${versions.large}`,
    medium: `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${versions.medium}`,
    thumbnail: `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${versions.thumbnail}`
  };
};

/**
 * Delete all versions of a photo
 * @param {number} listingId - Listing ID
 * @param {number} photoId - Photo ID
 */
exports.deletePhoto = async (listingId, photoId) => {
  const targetDir = `listings/${listingId}`;
  const versions = ['original', 'large', 'medium', 'thumbnail'];

  await Promise.all(
    versions.map(v =>
      bucket.file(`${targetDir}/${photoId}_${v}.jpg`).delete({ ignoreNotFound: true })
    )
  );
};
```

#### 2.3 Database Schema
**File:** `backend/prisma/schema.prisma`

```prisma
model Photo {
  id           Int      @id @default(autoincrement())
  listingId    Int      @map("listing_id")
  originalUrl  String   @map("original_url")
  largeUrl     String   @map("large_url")
  mediumUrl    String   @map("medium_url")
  thumbnailUrl String   @map("thumbnail_url")
  position     Int      @default(0) // Order of photos (0 = primary)
  createdAt    DateTime @default(now()) @map("created_at")

  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@map("photos")
  @@index([listingId])
}

model Listing {
  // ... existing fields
  photos Photo[]
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_photos_table
```

#### 2.4 Controllers
**File:** `backend/controllers/mediaController.js`

```javascript
const mediaService = require('../services/media');
const prisma = require('../config/prisma');

/**
 * POST /api/v1/media/upload-url
 * Generate signed URL for direct upload
 */
exports.getUploadUrl = async (req, res) => {
  try {
    const { fileName, contentType } = req.validatedData;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP' });
    }

    const result = await mediaService.generateSignedUploadUrl(fileName, contentType);

    res.json({
      uploadUrl: result.uploadUrl,
      fileName: result.fileName,
      expiresIn: 900 // 15 minutes
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

/**
 * POST /api/v1/media/confirm-upload
 * Confirm upload and process image
 */
exports.confirmUpload = async (req, res) => {
  try {
    const { fileName, listingId } = req.validatedData;
    const userId = req.user.id;

    // Verify user owns the listing
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, userId }
    });

    if (!listing) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check photo limit (max 5 per listing)
    const photoCount = await prisma.photo.count({ where: { listingId } });
    if (photoCount >= 5) {
      return res.status(400).json({ error: 'Maximum 5 photos per listing' });
    }

    // Create photo record
    const photo = await prisma.photo.create({
      data: {
        listingId,
        originalUrl: 'processing',
        largeUrl: 'processing',
        mediumUrl: 'processing',
        thumbnailUrl: 'processing',
        position: photoCount
      }
    });

    // Process image (async)
    const urls = await mediaService.processUploadedImage(fileName, listingId, photo.id);

    // Update photo record
    const updatedPhoto = await prisma.photo.update({
      where: { id: photo.id },
      data: urls
    });

    res.json({ photo: updatedPhoto });
  } catch (error) {
    console.error('Error confirming upload:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
};

/**
 * DELETE /api/v1/media/:photoId
 * Delete a photo
 */
exports.deletePhoto = async (req, res) => {
  try {
    const photoId = parseInt(req.params.photoId);
    const userId = req.user.id;

    // Get photo with listing
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { listing: true }
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (photo.listing.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete from GCS
    await mediaService.deletePhoto(photo.listingId, photo.id);

    // Delete from database
    await prisma.photo.delete({ where: { id: photoId } });

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
};
```

#### 2.5 Validators
**File:** `backend/validators/media.js`

```javascript
const Joi = require('joi');

exports.getUploadUrlSchema = Joi.object({
  fileName: Joi.string().max(255).required(),
  contentType: Joi.string().valid('image/jpeg', 'image/png', 'image/webp').required()
});

exports.confirmUploadSchema = Joi.object({
  fileName: Joi.string().required(),
  listingId: Joi.number().integer().positive().required()
});
```

#### 2.6 Routes
**File:** `backend/routes/media.js`

```javascript
const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { getUploadUrlSchema, confirmUploadSchema } = require('../validators/media');

/**
 * @swagger
 * /api/v1/media/upload-url:
 *   post:
 *     summary: Get signed URL for direct upload to GCS
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.post('/upload-url',
  authenticate,
  validateBody(getUploadUrlSchema),
  mediaController.getUploadUrl
);

/**
 * @swagger
 * /api/v1/media/confirm-upload:
 *   post:
 *     summary: Confirm upload and process image
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.post('/confirm-upload',
  authenticate,
  validateBody(confirmUploadSchema),
  mediaController.confirmUpload
);

/**
 * @swagger
 * /api/v1/media/{photoId}:
 *   delete:
 *     summary: Delete a photo
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:photoId', authenticate, mediaController.deletePhoto);

module.exports = router;
```

**Register routes in `backend/index.js`:**
```javascript
const mediaRoutes = require('./routes/media');
app.use('/api/v1/media', mediaRoutes);
```

#### 2.7 Tests
**File:** `backend/tests/photo-upload.test.js`

```javascript
const request = require('supertest');
const app = require('../index');
const prisma = require('../config/prisma');

describe('Photo Upload Flow', () => {
  let authToken;
  let testListing;

  beforeAll(async () => {
    // Create test user and listing
    // Login and get token
  });

  it('should generate signed upload URL', async () => {
    const res = await request(app)
      .post('/api/v1/media/upload-url')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fileName: 'test-photo.jpg',
        contentType: 'image/jpeg'
      });

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toBeTruthy();
    expect(res.body.fileName).toContain('temp/');
    expect(res.body.expiresIn).toBe(900);
  });

  // Add more tests...
});
```

---

### Phase 3: Mobile Implementation (6-8 hours)

#### 3.1 Install Dependencies
```bash
cd frontend/mobile
npm install expo-image-picker react-native-image-crop-picker
```

#### 3.2 Create Upload Service
**File:** `frontend/mobile/src/services/mediaApi.ts`

```typescript
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

export interface UploadUrlResponse {
  uploadUrl: string;
  fileName: string;
  expiresIn: number;
}

export interface Photo {
  id: number;
  originalUrl: string;
  largeUrl: string;
  mediumUrl: string;
  thumbnailUrl: string;
  position: number;
}

export const mediaAPI = {
  async requestUploadUrl(fileName: string, contentType: string): Promise<UploadUrlResponse> {
    const response = await axios.post('/api/v1/media/upload-url', {
      fileName,
      contentType
    });
    return response.data;
  },

  async uploadToGCS(uploadUrl: string, imageUri: string, contentType: string): Promise<void> {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: blob
    });
  },

  async confirmUpload(fileName: string, listingId: number): Promise<Photo> {
    const response = await axios.post('/api/v1/media/confirm-upload', {
      fileName,
      listingId
    });
    return response.data.photo;
  },

  async deletePhoto(photoId: number): Promise<void> {
    await axios.delete(`/api/v1/media/${photoId}`);
  }
};
```

#### 3.3 Photo Upload Component
**File:** `frontend/mobile/src/components/PhotoUploader.tsx`

```typescript
import React, { useState } from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { mediaAPI } from '../services/mediaApi';

interface PhotoUploaderProps {
  listingId: number;
  existingPhotos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  listingId,
  existingPhotos,
  onPhotosChange,
  maxPhotos = 5
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickImage = async () => {
    if (existingPhotos.length >= maxPhotos) {
      Alert.alert('Maximum Photos', `You can only upload ${maxPhotos} photos per listing.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setUploading(true);
      setUploadProgress(10);

      // Get upload URL
      const fileName = `photo-${Date.now()}.jpg`;
      const { uploadUrl, fileName: tempFileName } = await mediaAPI.requestUploadUrl(
        fileName,
        'image/jpeg'
      );
      setUploadProgress(30);

      // Upload to GCS
      await mediaAPI.uploadToGCS(uploadUrl, imageUri, 'image/jpeg');
      setUploadProgress(70);

      // Confirm upload
      const newPhoto = await mediaAPI.confirmUpload(tempFileName, listingId);
      setUploadProgress(100);

      onPhotosChange([...existingPhotos, newPhoto]);

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deletePhoto = async (photoId: number) => {
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
              onPhotosChange(existingPhotos.filter(p => p.id !== photoId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photo');
            }
          }
        }
      ]
    );
  };

  return (
    <View>
      {/* Photo grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {existingPhotos.map((photo, index) => (
          <TouchableOpacity
            key={photo.id}
            onLongPress={() => deletePhoto(photo.id)}
          >
            <Image
              source={{ uri: photo.thumbnailUrl }}
              style={{ width: 100, height: 100, margin: 5 }}
            />
            {index === 0 && <Text>Primary</Text>}
          </TouchableOpacity>
        ))}

        {/* Add photo button */}
        {existingPhotos.length < maxPhotos && (
          <TouchableOpacity onPress={pickImage} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator />
            ) : (
              <View style={{ /* Add button styles */ }}>
                <Text>+ Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Upload progress */}
      {uploading && (
        <View>
          <Text>Uploading... {uploadProgress}%</Text>
        </View>
      )}
    </View>
  );
};
```

---

### Phase 4: Testing & Validation (2-3 hours)

#### 4.1 Unit Tests
- Backend: 15+ test cases
- Mobile: Component tests

#### 4.2 Integration Tests
- Full upload flow
- Error handling
- Concurrent uploads

#### 4.3 Manual Testing Checklist
- [ ] Upload JPEG, PNG, WebP
- [ ] Upload max 5 photos
- [ ] Delete photos
- [ ] Verify thumbnails generated
- [ ] Test on slow network
- [ ] Test offline handling
- [ ] Verify file size limits

---

## Timeline

### Day 1 (6-8 hours)
- GCP setup (bucket, CORS, service account)
- Backend service implementation
- Database schema and migration
- Backend routes and controllers

### Day 2 (6-8 hours)
- Backend tests
- Mobile service implementation
- Photo upload component
- Integration with listing creation

### Day 3 (2-4 hours)
- Testing and bug fixes
- Documentation
- PR review and merge

---

## Success Metrics

- ✅ Upload success rate >99%
- ✅ Upload time <5 seconds (3MB image)
- ✅ Thumbnail generation <10 seconds
- ✅ No memory leaks
- ✅ Proper error handling
- ✅ All tests passing

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| GCP quota limits | High | Monitor usage, set alerts |
| Large file uploads | Medium | Client-side compression, 10MB limit |
| Concurrent upload issues | Medium | Queue mechanism, rate limiting |
| Storage costs | Low | Lifecycle policies, CDN caching |

---

## Follow-up Tasks (P2)

1. Image compression optimization
2. CDN integration for faster delivery
3. Batch upload support
4. Photo reordering (drag & drop)
5. Photo metadata (captions, alt text)
6. Progressive image loading

---

**Created:** January 12, 2026
**Status:** Ready to implement
**Next Step:** Create branch `feat/photo-upload-gcs` from `dev`
