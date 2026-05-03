const configController = require('../controllers/configController');
const { authenticate } = require('../services/auth');
const { asyncHandler } = require('../middleware/errorHandler');

module.exports = (app) => {
  /**
   * @swagger
   * /api/config/maps-api-key:
   *   get:
   *     summary: Get Google Maps API key for the mobile app
   *     tags: [Config]
   *     responses:
   *       200:
   *         description: Google Maps API key
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 apiKey:
   *                   type: string
   *                   example: "AIzaSy..."
   *       500:
   *         description: Failed to retrieve API key
   */
  app.get(
    '/config/maps-api-key',
    authenticate,
    asyncHandler(configController.getGoogleMapsApiKey));

  /**
   * @swagger
   * /api/config/app:
   *   get:
   *     summary: Get app configuration
   *     tags: [Config]
   *     responses:
   *       200:
   *         description: App configuration
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 mapsProvider:
   *                   type: string
   *                   example: "google"
   *                 features:
   *                   type: object
   *                   properties:
   *                     marketplace:
   *                       type: boolean
   *                     analytics:
   *                       type: boolean
   *                     qrCheckIn:
   *                       type: boolean
   *                     reviews:
   *                       type: boolean
   *                 version:
   *                   type: string
   *                   example: "1.0.0"
   */
  app.get('/config/app', asyncHandler(configController.getAppConfig));
};
