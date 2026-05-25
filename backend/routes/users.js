const userController = require('../controllers/userController');
const { authenticate } = require('../services/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * User Management Routes
 * All routes require authentication
 */
module.exports = (app) => {
  // Profile picture routes (must come before /users/profile)
  app.get('/users/profile/upload-url', authenticate, asyncHandler(userController.getProfilePictureUrl));
  app.patch('/users/profile/upload', authenticate, asyncHandler(userController.uploadProfilePicture));

  // Get current user profile
  app.get('/users/profile', authenticate, asyncHandler(userController.getProfile));

  // Get current user's renter behavior status
  app.get('/users/behavior-status', authenticate, asyncHandler(userController.getBehaviorStatus));

  // Update user profile
  app.patch('/users/profile', authenticate, asyncHandler(userController.updateProfile));

  // Get user statistics
  app.get('/users/stats', authenticate, asyncHandler(userController.getUserStats));
};
