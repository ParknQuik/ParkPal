const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

/**
 * User Management Routes
 * All routes require authentication
 */
module.exports = (app) => {
  // Get current user profile
  app.get('/users/profile', authenticate, userController.getProfile);

  // Update user profile
  app.patch('/users/profile', authenticate, userController.updateProfile);

  // Get user statistics
  app.get('/users/stats', authenticate, userController.getUserStats);
};
