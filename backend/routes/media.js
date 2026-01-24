const mediaController = require('../controllers/mediaController');
const { authenticate } = require('../services/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  generateUploadUrlSchema,
  confirmUploadSchema,
  photoIdParamSchema,
  slotIdParamSchema
} = require('../validators/media');

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
    '/api/v1/media/upload-url',
    authenticate,
    validateBody(generateUploadUrlSchema),
    mediaController.generateUploadUrl
  );

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
    '/api/v1/media/confirm-upload',
    authenticate,
    validateBody(confirmUploadSchema),
    mediaController.confirmUpload
  );

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
    '/api/v1/media/photos/:id',
    authenticate,
    validateParams(photoIdParamSchema),
    mediaController.deletePhoto
  );

  /**
   * @swagger
   * /api/v1/media/photos/slot/{slotId}:
   *   get:
   *     summary: Get all photos for a parking slot
   *     tags: [Media]
   */
  app.get(
    '/api/v1/media/photos/slot/:slotId',
    validateParams(slotIdParamSchema),
    mediaController.getSlotPhotos
  );
};
