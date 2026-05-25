const prisma = require('../config/prisma');
const logger = require('../config/logger');
const mediaService = require('../services/mediaService');
const { getBehaviorStatus } = require('../services/penaltyService');

/**
 * Get current user profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
   } catch (error) {
     next(error);
   }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    res.json(updatedUser);
   } catch (error) {
     next(error);
   }
};

/**
 * Get user statistics
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get booking stats
    const totalBookings = await prisma.booking.count({
      where: { userId },
    });

    const activeBookings = await prisma.booking.count({
      where: {
        userId,
        status: 'confirmed',
        endTime: { gte: new Date() },
      },
    });

    const completedBookings = await prisma.booking.count({
      where: {
        userId,
        status: 'completed',
      },
    });

    // Get total spent
    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        status: { in: ['confirmed', 'completed'] },
      },
      select: { price: true },
    });

    const totalSpent = bookings.reduce((sum, b) => sum + (b.price || 0), 0);

    // For hosts: get earnings and listing stats
    let hostStats = null;
    if (req.user.role === 'host') {
      const listings = await prisma.parkingSlot.count({
        where: { ownerId: userId },
      });

      const bookingsAsHost = await prisma.booking.findMany({
        where: {
          slot: { ownerId: userId },
          status: { in: ['confirmed', 'completed'] },
        },
        select: { price: true },
      });

      const totalEarnings = bookingsAsHost.reduce(
        (sum, b) => sum + (b.price || 0),
        0
      );

      hostStats = {
        totalListings: listings,
        totalEarnings,
        totalHostBookings: bookingsAsHost.length,
      };
    }

    res.json({
      totalBookings,
      activeBookings,
      completedBookings,
      totalSpent,
      ...hostStats,
    });
   } catch (error) {
     next(error);
   }
};

/**
 * Get current user's renter behavior status.
 */
exports.getBehaviorStatus = async (req, res, next) => {
  try {
    const status = await getBehaviorStatus(req.user.id);

    if (!status) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(status);
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile picture upload URL
 */
exports.getProfilePictureUrl = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileName } = req.query;

    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }

    const result = await mediaService.generateProfileUploadUrl(userId, fileName);

    res.json(result);
   } catch (error) {
     next(error);
   }
};

/**
 * Upload profile picture (after upload completes)
 */
exports.uploadProfilePicture = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }

    const profileImageUrl = await mediaService.processProfileImage(fileName, userId);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    logger.error('Upload profile picture error:', error);
    next(error);
  }
};
