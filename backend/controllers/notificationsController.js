const prisma = require('../config/prisma');
const logger = require('../config/logger');
const expoPush = require('../services/expoPush');

/**
 * Get all notifications for current user
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { read, limit = 20, offset = 0 } = req.query;

    const where = { userId };
    if (read !== undefined) {
      where.read = read === 'true';
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.notification.count({ where });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    res.json({ notifications, total, unreadCount });
   } catch (error) {
     next(error);
   }
};

/**
 * Get single notification by ID
 */
exports.getNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: { id: parseInt(id), userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
   } catch (error) {
     next(error);
   }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: { id: parseInt(id), userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { read: true },
    });

    res.json(updated);
  } catch (error) {
    logger.error('Mark as read error:', error);
    next(error);
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all as read error:', error);
    next(error);
  }
};

/**
 * Delete a notification
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: { id: parseInt(id), userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.delete({ where: { id: parseInt(id) } });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error('Delete notification error:', error);
    next(error);
  }
};

/**
 * Get unread count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const count = await prisma.notification.count({
      where: { userId, read: false },
    });

    res.json({ unreadCount: count });
  } catch (error) {
    logger.error('Get unread count error:', error);
    next(error);
  }
};

/**
 * Create a notification (for internal use)
 */
exports.createNotification = async (userId, data) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title: data.title,
      body: data.body,
      type: data.type || 'general',
      data: data.data || {},
    },
  });

  if (notification) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { pushToken: true }
      });
      
      if (user?.pushToken) {
        const notificationData = typeof notification.data === 'object' ? notification.data : {};
        await expoPush.sendPushNotification(
          user.pushToken,
          notification.title,
          notification.body,
          notificationData
        );
      }
    } catch (pushError) {
      logger.error('Failed to send push notification:', pushError);
    }
  }

  return notification;
};
