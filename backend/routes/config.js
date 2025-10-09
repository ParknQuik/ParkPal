const configController = require('../controllers/configController');
const { authenticate } = require('../services/auth');

module.exports = (app) => {
  /**
   * @swagger
   * /api/config/maps-api-key:
   *   get:
   *     summary: Get Google Maps API key for the mobile app
   *     tags: [Config]
   *     security:
   *       - bearerAuth: []
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
    '/api/config/maps-api-key',
    authenticate,
    configController.getGoogleMapsApiKey
  );

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
  app.get('/api/config/app', configController.getAppConfig);
};
