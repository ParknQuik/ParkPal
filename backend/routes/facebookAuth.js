const facebookAuthController = require('../controllers/facebookAuthController');
const { asyncHandler } = require('../middleware/errorHandler');

module.exports = (app, authLimiter) => {
  app.post('/auth/facebook', authLimiter, asyncHandler(facebookAuthController.facebookAuth));
};
