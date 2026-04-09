const notificationsController = require('../controllers/notificationsController');
const { authenticate } = require('../services/auth');

module.exports = (app) => {
  // Get all notifications
  app.get('/notifications', authenticate, notificationsController.getNotifications);

  // Get unread count
  app.get('/notifications/unread-count', authenticate, notificationsController.getUnreadCount);

  // Get single notification
  app.get('/notifications/:id', authenticate, notificationsController.getNotification);

  // Mark as read
  app.patch('/notifications/:id/read', authenticate, notificationsController.markAsRead);

  // Mark all as read
  app.patch('/notifications/read-all', authenticate, notificationsController.markAllAsRead);

  // Delete notification
  app.delete('/notifications/:id', authenticate, notificationsController.deleteNotification);
};
