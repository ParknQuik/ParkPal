/**
 * Deprecation Middleware
 *
 * Adds deprecation warnings to API responses
 * Helps developers migrate to new endpoints
 */

/**
 * Mark endpoint as deprecated
 * @param {Object} options - Deprecation options
 * @param {string} options.alternative - Suggested alternative endpoint
 * @param {string} options.sunset - Sunset date (ISO format)
 * @param {string} options.message - Custom deprecation message
 * @returns {Function} Express middleware
 */
function deprecate(options = {}) {
  const {
    alternative,
    sunset,
    message = 'This endpoint is deprecated and will be removed in a future version.'
  } = options;

  return (req, res, next) => {
    // Add deprecation headers
    res.setHeader('Deprecation', 'true');
    res.setHeader('X-API-Deprecated', 'true');

    if (sunset) {
      res.setHeader('Sunset', sunset);
    }

    if (alternative) {
      res.setHeader('X-API-Alternative', alternative);
    }

    // Log deprecation usage
    const userId = req.user ? req.user.id : 'anonymous';
    console.warn(`[DEPRECATED] ${req.method} ${req.path} - User ${userId}`);

    // Wrap res.json to add deprecation warning to response body
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const deprecationInfo = {
        ...body,
        _deprecation: {
          message,
          alternative: alternative || null,
          sunset: sunset || null,
          documentation: 'https://docs.parknquik.com/api/migration'
        }
      };
      return originalJson(deprecationInfo);
    };

    next();
  };
}

/**
 * Mark entire route group as deprecated
 * Use at the router level
 */
function deprecateAll(router, options) {
  router.use((req, res, next) => {
    deprecate(options)(req, res, next);
  });
  return router;
}

module.exports = { deprecate, deprecateAll };
