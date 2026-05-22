const mediaController = require('../controllers/mediaController');
const { authenticate } = require('../services/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  generateUploadUrlSchema,
  confirmUploadSchema,
  photoIdParamSchema,
  slotIdParamSchema
} = require('../validators/media');
const { asyncHandler } = require('../middleware/errorHandler');

module.exports = (app) => {
  /**
   * @swagger
   * /api/v1/media/upload-url:
   *   post:
   *     summary: Generate a signed URL for photo upload
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   */
  app.post(
    '/media/upload-url',
    authenticate,
    validateBody(generateUploadUrlSchema),
    asyncHandler(mediaController.generateUploadUrl));

  /**
   * @swagger
   * /api/v1/media/confirm-upload:
   *   post:
   *     summary: Confirm upload and process image into multiple sizes
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   */
  app.post(
    '/media/confirm-upload',
    authenticate,
    validateBody(confirmUploadSchema),
    asyncHandler(mediaController.confirmUpload));

  /**
   * @swagger
   * /api/v1/media/photos/{id}:
   *   delete:
   *     summary: Delete a photo
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   */
  app.delete(
    '/media/photos/:id',
    authenticate,
    validateParams(photoIdParamSchema),
    asyncHandler(mediaController.deletePhoto));

  /**
   * @swagger
   * /api/v1/media/photos/slot/{slotId}:
   *   get:
   *     summary: Get all photos for a parking slot
   *     tags: [Media]
   */
  app.get(
    '/media/photos/slot/:slotId',
    validateParams(slotIdParamSchema),
    asyncHandler(mediaController.getSlotPhotos));
};
