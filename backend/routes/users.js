const userController = require('../controllers/userController');
const { authenticate } = require('../services/auth');

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

  // Payment methods (stub endpoints for PayMongo integration)
  app.get('/users/payment-methods', authenticate, userController.getPaymentMethods);
  app.post('/users/payment-methods', authenticate, userController.addPaymentMethod);
  app.delete('/users/payment-methods/:id', authenticate, userController.deletePaymentMethod);
};
