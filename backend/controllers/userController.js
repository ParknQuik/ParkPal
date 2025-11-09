const prisma = require('../config/prisma');

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
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
        createdAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user statistics
 */
exports.getUserStats = async (req, res) => {
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
    console.error('Get user stats error:', error);
    res.status(500).json({ error: error.message });
  }
};
