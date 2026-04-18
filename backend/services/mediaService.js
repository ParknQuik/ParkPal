const { Storage } = require('@google-cloud/storage');
const sharp = require('sharp');
const path = require('path');
const logger = require('../config/logger');

// Initialize GCS client
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEYFILE_PATH
});

const bucketName = process.env.GCS_BUCKET_NAME || 'parkpal-prod-photos';
const bucket = storage.bucket(bucketName);

// Image size configurations
const IMAGE_SIZES = {
  original: null, // No resizing
  large: { width: 1200, height: 1200, fit: 'inside' },
  medium: { width: 600, height: 600, fit: 'inside' },
  thumbnail: { width: 200, height: 200, fit: 'cover' }
};

/**
 * Generate a signed URL for uploading a photo
 * @param {number} slotId - Parking slot ID
 * @param {string} fileName - Original file name
 * @returns {Promise<{uploadUrl: string, fileName: string, expiresAt: Date}>}
 */
async function generateUploadUrl(slotId, fileName) {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(fileName);
    const uniqueFileName = `slots/${slotId}/original_${timestamp}${ext}`;

    const file = bucket.file(uniqueFileName);

    // Generate signed URL valid for 15 minutes
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: 'image/jpeg'
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    logger.info(`Generated upload URL for slot ${slotId}: ${uniqueFileName}`);

    return {
      uploadUrl,
      fileName: uniqueFileName,
      expiresAt
    };
  } catch (error) {
    logger.error('Error generating upload URL:', error);
    throw new Error('Failed to generate upload URL');
  }
}

/**
 * Process uploaded image into multiple sizes
 * @param {string} originalFileName - Original file path in GCS
 * @param {number} slotId - Parking slot ID
 * @returns {Promise<{originalUrl: string, largeUrl: string, mediumUrl: string, thumbnailUrl: string}>}
 */
async function processUploadedImage(originalFileName, slotId) {
  try {
    const originalFile = bucket.file(originalFileName);

    // Download original image
    const [imageBuffer] = await originalFile.download();

    // Process each size
    const urls = {
      originalUrl: await getPublicUrl(originalFileName),
      largeUrl: null,
      mediumUrl: null,
      thumbnailUrl: null
    };

    // Generate and upload resized versions
    for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
      if (sizeName === 'original') continue;

      const resizedFileName = originalFileName.replace('original_', `${sizeName}_`);
      const resizedFile = bucket.file(resizedFileName);

      // Resize image
      let sharpInstance = sharp(imageBuffer);

      if (dimensions) {
        sharpInstance = sharpInstance.resize(dimensions);
      }

      const resizedBuffer = await sharpInstance
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      // Upload resized image
      await resizedFile.save(resizedBuffer, {
        contentType: 'image/jpeg',
        metadata: {
          cacheControl: 'public, max-age=31536000'
        }
      });

      // Make file publicly accessible
      await resizedFile.makePublic();

      // Store URL
      urls[`${sizeName}Url`] = await getPublicUrl(resizedFileName);

      logger.info(`Processed ${sizeName} image for slot ${slotId}`);
    }

    // Make original publicly accessible
    await originalFile.makePublic();

    logger.info(`Successfully processed all image sizes for slot ${slotId}`);

    return urls;
  } catch (error) {
    logger.error('Error processing uploaded image:', error);
    throw new Error('Failed to process uploaded image');
  }
}

/**
 * Get public URL for a GCS file
 * @param {string} fileName - File path in GCS
 * @returns {Promise<string>}
 */
async function getPublicUrl(fileName) {
  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}

/**
 * Delete all photo versions for a slot
 * @param {string} originalFileName - Original file path in GCS
 * @returns {Promise<void>}
 */
async function deletePhoto(originalFileName) {
  try {
    // Delete all size variants
    const deletePromises = [];

    for (const sizeName of Object.keys(IMAGE_SIZES)) {
      const fileName = originalFileName.replace('original_', `${sizeName}_`);
      const file = bucket.file(fileName);
      deletePromises.push(file.delete().catch(() => {})); // Ignore errors if file doesn't exist
    }

    await Promise.all(deletePromises);

    logger.info(`Deleted all photo versions: ${originalFileName}`);
  } catch (error) {
    logger.error('Error deleting photo:', error);
    throw new Error('Failed to delete photo');
  }
}

/**
 * Generate signed URLs for viewing photos (private buckets only)
 * @param {string} fileName - File path in GCS
 * @param {number} expiresInMinutes - URL expiration time (default: 60 minutes)
 * @returns {Promise<string>}
 */
async function generateViewUrl(fileName, expiresInMinutes = 60) {
  try {
    const file = bucket.file(fileName);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000
    });

    return url;
  } catch (error) {
    logger.error('Error generating view URL:', error);
    throw new Error('Failed to generate view URL');
  }
}

/**
 * Generate a signed URL for uploading a profile picture
 * @param {number|string} userId - User ID
 * @param {string} fileName - Original file name
 * @returns {Promise<{uploadUrl: string, fileName: string, expiresAt: Date}>}
 */
async function generateProfileUploadUrl(userId, fileName) {
  try {
    const timestamp = Date.now();
    const uniqueFileName = `profiles/${userId}/original_${timestamp}.jpg`;

    const file = bucket.file(uniqueFileName);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: 'image/jpeg'
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    logger.info(`Generated profile upload URL for user ${userId}: ${uniqueFileName}`);

    return {
      uploadUrl,
      fileName: uniqueFileName,
      expiresAt
    };
  } catch (error) {
    logger.error('Error generating profile upload URL:', error);
    throw new Error('Failed to generate profile upload URL');
  }
}

/**
 * Process uploaded profile image
 * @param {string} originalFileName - Original file path in GCS
 * @param {number|string} userId - User ID
 * @returns {Promise<string>} Public URL of the processed profile image
 */
async function processProfileImage(originalFileName, userId) {
  try {
    const originalFile = bucket.file(originalFileName);

    const [imageBuffer] = await originalFile.download();

    // Clean up old original files for this user (keep only the latest)
    await cleanupOldProfileFiles(userId, originalFileName);

    const resizedBuffer = await sharp(imageBuffer)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    const resizedFileName = `profiles/${userId}/profile_200x200.jpg`;
    const resizedFile = bucket.file(resizedFileName);

    await resizedFile.save(resizedBuffer, {
      contentType: 'image/jpeg',
      metadata: {
        cacheControl: 'public, max-age=31536000'
      }
    });

    await resizedFile.makePublic();

    const publicUrl = await getPublicUrl(resizedFileName);

    logger.info(`Processed profile image for user ${userId}`);

    return publicUrl;
  } catch (error) {
    logger.error('Error processing profile image:', error);
    throw new Error('Failed to process profile image');
  }
}

// Helper function to clean up old profile images
async function cleanupOldProfileFiles(userId, keepFileName) {
  try {
    const [files] = await bucket.getFiles({ prefix: `profiles/${userId}/original_` });
    
    for (const file of files) {
      // Delete files that are NOT the one we just uploaded
      if (file.name !== keepFileName) {
        await file.delete();
        logger.info(`Deleted old profile image: ${file.name}`);
      }
    }
  } catch (error) {
    // Log but don't fail if cleanup fails
    logger.warn(`Failed to cleanup old profile files for user ${userId}:`, error.message);
  }
}

module.exports = {
  generateUploadUrl,
  processUploadedImage,
  deletePhoto,
  generateViewUrl,
  getPublicUrl,
  generateProfileUploadUrl,
  processProfileImage
};
