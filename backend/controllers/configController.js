const secretManager = require('../config/secretManager');

/**
 * Get Google Maps API key for the mobile app
 */
async function getGoogleMapsApiKey(req, res, next) {
  try {
    const apiKey = await secretManager.getSecret('google-maps-api-key');

    if (!apiKey) {
      return res.status(500).json({
        error: 'Google Maps API key not configured',
      });
    }

    res.json({
      apiKey,
    });
   } catch (error) {
     next(error);
   }
}

/**
 * Get app configuration (public configs only)
 */
async function getAppConfig(req, res, next) {
  try {
    const config = {
      mapsProvider: 'google',
      features: {
        marketplace: true,
        analytics: process.env.ENABLE_ANALYTICS === 'true',
        qrCheckIn: true,
        reviews: true,
      },
      version: process.env.APP_VERSION || '1.0.0',
    };

    res.json(config);
   } catch (error) {
     next(error);
   }
}

module.exports = {
  getGoogleMapsApiKey,
  getAppConfig,
};
