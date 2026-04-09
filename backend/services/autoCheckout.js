const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../config/logger');

/**
 * Auto-checkout service
 * Automatically checks out parking sessions that exceed maximum duration
 */

const MAX_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

/**
 * Main function to find and checkout expired sessions
 * @returns {Promise<Object>} Result with processed count
 */
async function autoCheckoutExpiredSessions() {
  try {
    logger.info('[Auto-Checkout] Running expired sessions check...');
    
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - MAX_DURATION_MS);
    
    // Find active sessions that started more than 12 hours ago
    const expiredSessions = await prisma.parkingSession.findMany({
      where: {
        status: 'active',
        checkInTime: {
          lte: cutoffTime,
        },
      },
      include: {
        slot: true,
        booking: true,
        user: true,
      },
    });
    
    logger.info(`[Auto-Checkout] Found ${expiredSessions.length} expired sessions`);
    
    const results = {
      processed: 0,
      failed: 0,
      totalRevenue: 0,
    };
    
    for (const session of expiredSessions) {
      try {
        const amount = await performAutoCheckout(session, now);
        results.processed++;
        results.totalRevenue += amount;
      } catch (error) {
        logger.error(`[Auto-Checkout] Failed to checkout session ${session.id}:`, error);
        results.failed++;
      }
    }
    
    logger.info(`[Auto-Checkout] Completed: ${results.processed} processed, ${results.failed} failed, ₱${results.totalRevenue.toFixed(2)} revenue`);
    return results;
  } catch (error) {
    logger.error('[Auto-Checkout] Error:', error);
    throw error;
  }
}

/**
 * Perform auto-checkout for a single session
 * @param {Object} session - The parking session to checkout
 * @param {Date} checkOutTime - The checkout timestamp
 * @returns {Promise<number>} Total amount charged
 */
async function performAutoCheckout(session, checkOutTime) {
  logger.info(`[Auto-Checkout] Processing session ${session.id} for user ${session.userId}`);
  
  const checkInTime = new Date(session.checkInTime);
  const durationMinutes = Math.ceil((checkOutTime - checkInTime) / (1000 * 60));
  const hours = Math.ceil(durationMinutes / 60);
  
  // Calculate total with overstay penalty (1.5x after max duration)
  const regularHours = Math.min(hours, 12);
  const overstayHours = Math.max(0, hours - 12);
  const regularRate = session.slot?.price || 0;
  const overstayRate = regularRate * 1.5;
  const totalAmount = (regularHours * regularRate) + (overstayHours * overstayRate);
  
  // Perform all updates in a transaction
  await prisma.$transaction(async (tx) => {
    // Update session
    await tx.parkingSession.update({
      where: { id: session.id },
      data: {
        checkOutTime,
        durationMinutes,
        totalAmount,
        status: 'completed',
      },
    });
    
    // Update slot status
    if (session.slotId) {
      await tx.parkingSlot.update({
        where: { id: session.slotId },
        data: { status: 'available' },
      });
    }
    
    // Update booking if linked
    if (session.bookingId) {
      await tx.booking.update({
        where: { id: session.bookingId },
        data: {
          status: 'completed',
          endTime: checkOutTime,
        },
      });
    }
    
    // Create payment record
    await tx.payment.create({
      data: {
        userId: session.userId,
        bookingId: session.bookingId,
        sessionId: session.id,
        amount: totalAmount,
        paymentMethod: 'auto_charge',
        status: 'pending', // Will be charged via user's default payment method
        transactionId: `auto_checkout_${session.id}_${Date.now()}`,
      },
    });
    
    // Send notification to user
    await tx.notification.create({
      data: {
        userId: session.userId,
        title: 'Auto Checkout - Session Expired',
        body: `Your parking session was automatically checked out after ${hours} hours. Total: ₱${totalAmount.toFixed(2)}${overstayHours > 0 ? ` (includes ${overstayHours}hr overstay penalty)` : ''}`,
        type: 'auto_checkout',
        data: JSON.stringify({
          sessionId: session.id,
          duration: durationMinutes,
          totalAmount,
          overstayHours,
          regularHours,
          regularRate,
          overstayRate,
        }),
      },
    });
  });
  
  logger.info(`[Auto-Checkout] Completed session ${session.id}: ${hours}hrs, ₱${totalAmount.toFixed(2)}${overstayHours > 0 ? ` (${overstayHours}hr overstay)` : ''}`);
  
  return totalAmount;
}

module.exports = {
  autoCheckoutExpiredSessions,
  performAutoCheckout,
};
