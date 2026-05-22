const notificationsController = require('../controllers/notificationsController');
const { authenticate } = require('../services/auth');
const { asyncHandler } = require('../middleware/errorHandler');

module.exports = (app) => {
  // Get all notifications
  app.get('/notifications', authenticate, asyncHandler(notificationsController.getNotifications));

  // Get unread count
  app.get('/notifications/unread-count', authenticate, asyncHandler(notificationsController.getUnreadCount));

  // Get single notification
  app.get('/notifications/:id', authenticate, asyncHandler(notificationsController.getNotification));

  // Mark as read
  app.patch('/notifications/:id/read', authenticate, asyncHandler(notificationsController.markAsRead));

  // Mark all as read
  app.patch('/notifications/read-all', authenticate, asyncHandler(notificationsController.markAllAsRead));

  // Delete notification
  app.delete('/notifications/:id', authenticate, asyncHandler(notificationsController.deleteNotification));
};
