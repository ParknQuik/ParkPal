const appleAuthController = require('../controllers/appleAuthController');
const { asyncHandler } = require('../middleware/errorHandler');

module.exports = (app, authLimiter) => {
  app.post('/auth/apple', authLimiter, asyncHandler(appleAuthController.appleAuth));
};
