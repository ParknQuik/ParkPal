const prisma = require('../config/prisma');
const mediaService = require('../services/mediaService');
const logger = require('../config/logger');

/**
 * @swagger
 * /api/v1/media/upload-url:
 *   post:
 *     summary: Generate a signed URL for photo upload
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slotId
 *               - fileName
 *             properties:
 *               slotId:
 *                 type: integer
 *                 example: 1
 *               fileName:
 *                 type: string
 *                 example: parking_spot.jpg
 *     responses:
 *       200:
 *         description: Upload URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uploadUrl:
 *                   type: string
 *                 fileName:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: Not authorized to upload photos for this slot
 */
exports.generateUploadUrl = async (req, res) => {
  try {
    const { slotId, fileName } = req.body;
    const userId = req.user.id;

    // Validate slot ownership
    const slot = await prisma.parkingSlot.findUnique({
      where: { id: parseInt(slotId) }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Parking slot not found' });
    }

    if (slot.ownerId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to upload photos for this slot' });
    }

    // Generate upload URL
    const uploadData = await mediaService.generateUploadUrl(slotId, fileName);

    res.json(uploadData);
  } catch (error) {
    logger.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

/**
 * @swagger
 * /api/v1/media/confirm-upload:
 *   post:
 *     summary: Confirm upload and process image into multiple sizes
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slotId
 *               - fileName
 *             properties:
 *               slotId:
 *                 type: integer
 *                 example: 1
 *               fileName:
 *                 type: string
 *                 example: slots/1/original_1234567890.jpg
 *     responses:
 *       201:
 *         description: Photo processed and saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 slotId:
 *                   type: integer
 *                 originalUrl:
 *                   type: string
 *                 largeUrl:
 *                   type: string
 *                 mediumUrl:
 *                   type: string
 *                 thumbnailUrl:
 *                   type: string
 *                 position:
 *                   type: integer
 *       403:
 *         description: Not authorized
 */
exports.confirmUpload = async (req, res) => {
  try {
    const { slotId, fileName } = req.body;
    const userId = req.user.id;

    // Validate slot ownership
    const slot = await prisma.parkingSlot.findUnique({
      where: { id: parseInt(slotId) }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Parking slot not found' });
    }

    if (slot.ownerId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to upload photos for this slot' });
    }

    // Enforce 5-photo limit per slot
    const photoCount = await prisma.photo.count({
      where: { slotId: parseInt(slotId) }
    });

    if (photoCount >= 5) {
      return res.status(400).json({ error: 'Maximum 5 photos allowed per parking slot' });
    }

    // Process the uploaded image into multiple sizes
    const urls = await mediaService.processUploadedImage(fileName, slotId);

    // Save photo record to database
    const photo = await prisma.photo.create({
      data: {
        slotId: parseInt(slotId),
        originalUrl: urls.originalUrl,
        largeUrl: urls.largeUrl,
        mediumUrl: urls.mediumUrl,
        thumbnailUrl: urls.thumbnailUrl,
        position: photoCount
      }
    });

    logger.info(`Photo ${photo.id} saved for slot ${slotId}`);

    res.status(201).json(photo);
  } catch (error) {
    logger.error('Error confirming upload:', error);
    res.status(500).json({ error: 'Failed to process uploaded photo' });
  }
};

/**
 * @swagger
 * /api/v1/media/photos/{id}:
 *   delete:
 *     summary: Delete a photo
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Photo ID
 *     responses:
 *       200:
 *         description: Photo deleted successfully
 *       403:
 *         description: Not authorized to delete this photo
 *       404:
 *         description: Photo not found
 */
exports.deletePhoto = async (req, res) => {
  try {
    const photoId = parseInt(req.params.id);
    const userId = req.user.id;

    // Find photo and validate ownership
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { slot: true }
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (photo.slot.ownerId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this photo' });
    }

    // Delete from GCS
    await mediaService.deletePhoto(photo.originalUrl.split('/').pop());

    // Delete from database
    await prisma.photo.delete({
      where: { id: photoId }
    });

    logger.info(`Photo ${photoId} deleted for slot ${photo.slotId}`);

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    logger.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
};

/**
 * @swagger
 * /api/v1/media/photos/slot/{slotId}:
 *   get:
 *     summary: Get all photos for a parking slot
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parking slot ID
 *     responses:
 *       200:
 *         description: Photos retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   slotId:
 *                     type: integer
 *                   originalUrl:
 *                     type: string
 *                   largeUrl:
 *                     type: string
 *                   mediumUrl:
 *                     type: string
 *                   thumbnailUrl:
 *                     type: string
 *                   position:
 *                     type: integer
 */
exports.getSlotPhotos = async (req, res) => {
  try {
    const slotId = parseInt(req.params.slotId);

    const photos = await prisma.photo.findMany({
      where: { slotId },
      orderBy: { position: 'asc' }
    });

    res.json(photos);
  } catch (error) {
    logger.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
};
