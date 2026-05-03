const prisma = require('../config/prisma');
const logger = require('../config/logger');
const crypto = require('crypto');

const POINTS_PER_BOOKING_COMPLETION = 100;
const REFERRAL_BONUS_REFERRER = 100;
const REFERRAL_BONUS_REFERRED = 50;
const REFERRAL_VALIDITY_DAYS = 365;

/**
 * Get user's points balance
 */
exports.getBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all non-expired, non-spent transaction sums
    const transactions = await prisma.pointsTransaction.findMany({
      where: {
        userId,
        isExpired: false,
      },
    });

    const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

    res.json({ balance });
  } catch (error) {
    next(error);
  }
};

/**
 * Earn points for booking completion
 */
exports.earnPoints = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bookingId, amount = POINTS_PER_BOOKING_COMPLETION } = req.body;

    // Verify booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
    });

    if (!booking || booking.userId !== userId) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Booking must be completed to earn points' });
    }

    // Check if points already earned for this booking
    const existingTransaction = await prisma.pointsTransaction.findFirst({
      where: {
        userId,
        referenceId: parseInt(bookingId),
        referenceType: 'BOOKING',
        type: 'EARNED',
      },
    });

    if (existingTransaction) {
      return res.status(400).json({ error: 'Points already earned for this booking' });
    }

    // Get current balance
    const currentTransactions = await prisma.pointsTransaction.findMany({
      where: { userId, isExpired: false },
    });
    const currentBalance = currentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const newBalance = currentBalance + amount;

    // Create transaction
    const transaction = await prisma.pointsTransaction.create({
      data: {
        userId,
        amount,
        balanceAfter: newBalance,
        type: 'EARNED',
        source: 'BOOKING',
        referenceId: parseInt(bookingId),
        referenceType: 'BOOKING',
        description: `Points earned for completing booking #${bookingId}`,
      },
    });

    logger.info(`User ${userId} earned ${amount} points for booking ${bookingId}`);
    res.status(201).json({ transaction, newBalance });
  } catch (error) {
    next(error);
  }
};

/**
 * Redeem points for discount
 */
exports.redeemPoints = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, bookingId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Get current balance
    const transactions = await prisma.pointsTransaction.findMany({
      where: { userId, isExpired: false },
    });
    const currentBalance = transactions.reduce((sum, t) => sum + t.amount, 0);

    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient points balance' });
    }

    const newBalance = currentBalance - amount;

    // Create redemption transaction
    const transaction = await prisma.pointsTransaction.create({
      data: {
        userId,
        amount: -amount,
        balanceAfter: newBalance,
        type: 'SPENT',
        source: 'REDEMPTION',
        referenceId: bookingId ? parseInt(bookingId) : null,
        referenceType: bookingId ? 'BOOKING' : null,
        description: `Points redeemed for discount (${amount} pts)`,
      },
    });

    logger.info(`User ${userId} redeemed ${amount} points`);
    res.status(201).json({ transaction, newBalance, discountAmount: amount });
  } catch (error) {
    next(error);
  }
};

/**
 * Get points transaction history
 */
exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const transactions = await prisma.pointsTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.pointsTransaction.count({ where: { userId } });

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate unique referral code
 */
exports.generateReferralCode = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check if user already has an active referral code
    const existingReferral = await prisma.referral.findFirst({
      where: { referrerId: userId, status: { in: ['pending', 'active'] } },
    });

    if (existingReferral) {
      return res.json({ referralCode: existingReferral.referralCode });
    }

    // Generate unique code
    let referralCode;
    let isUnique = false;
    while (!isUnique) {
      referralCode = `REF${userId}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const existing = await prisma.referral.findUnique({ where: { referralCode } });
      if (!existing) isUnique = true;
    }

    // Create referral record
    const referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        referredId: userId,
        referralCode,
        status: 'active',
        expiresAt: new Date(Date.now() + REFERRAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({ referralCode: referral.referralCode });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate referral code
 */
exports.validateReferralCode = async (req, res, next) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user.id;

    if (!referralCode) {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    const referral = await prisma.referral.findUnique({
      where: { referralCode },
      include: { referrer: { select: { name: true, email: true } } },
    });

    if (!referral) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Check expiration
    if (referral.expiresAt && referral.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Referral code has expired' });
    }

    // Check status
    if (!['active', 'pending'].includes(referral.status)) {
      return res.status(400).json({ error: 'Referral code is no longer valid' });
    }

    // Prevent self-referral
    if (referral.referrerId === userId) {
      return res.status(400).json({ error: 'Cannot use own referral code' });
    }

    // Check if user already referred
    const existingReferral = await prisma.referral.findFirst({
      where: { referredId: userId },
    });

    if (existingReferral) {
      return res.status(400).json({ error: 'User already referred' });
    }

    res.json({
      valid: true,
      referrerName: referral.referrer.name || referral.referrer.email,
      rewardAmount: REFERRAL_BONUS_REFERRED,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's referral stats
 */
exports.getReferralStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get referrals given by user
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
    });

    const stats = {
      totalReferrals: referrals.length,
      pendingReferrals: referrals.filter(r => r.status === 'pending').length,
      activeReferrals: referrals.filter(r => r.status === 'active').length,
      completedReferrals: referrals.filter(r => r.status === 'first_booking_completed' || r.status === 'rewarded').length,
      totalPointsEarned: referrals
        .filter(r => r.status === 'rewarded')
        .reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Process reward when referred user completes booking
 */
exports.processReferralReward = async (req, res, next) => {
  try {
    const { referredUserId } = req.body;

    // Find referral record
    const referral = await prisma.referral.findFirst({
      where: { referredId: parseInt(referredUserId), status: 'active' },
    });

    if (!referral) {
      return res.status(404).json({ error: 'Active referral not found for user' });
    }

    // Check if reward already given
    if (referral.status === 'rewarded') {
      return res.json({ message: 'Reward already processed' });
    }

    // Get referrer's current balance
    const referrerTransactions = await prisma.pointsTransaction.findMany({
      where: { userId: referral.referrerId, isExpired: false },
    });
    const referrerBalance = referrerTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Award points to referrer
    const rewardTransaction = await prisma.pointsTransaction.create({
      data: {
        userId: referral.referrerId,
        amount: REFERRAL_BONUS_REFERRER,
        balanceAfter: referrerBalance + REFERRAL_BONUS_REFERRER,
        type: 'REFERRAL_REWARD',
        source: 'REFERRAL_FIRST_BOOKING',
        referenceId: referral.id,
        referenceType: 'REFERRAL',
        description: `${REFERRAL_BONUS_REFERRER} points for referred user's first booking`,
      },
    });

    // Update referral status
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'rewarded',
        firstBookingAt: new Date(),
        rewardAmount: REFERRAL_BONUS_REFERRER,
        rewardGivenAt: new Date(),
        rewardTransactionId: rewardTransaction.id,
      },
    });

    logger.info(`Referral reward processed: ${referral.referrerId} earned ${REFERRAL_BONUS_REFERRER} points`);
    res.json({ success: true, rewardAmount: REFERRAL_BONUS_REFERRER });
  } catch (error) {
    next(error);
  }
};