const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExpiredBookings() {
  try {
    console.log('[Booking Expiry] Checking for expired bookings...');
    
    const now = new Date();
    
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: {
          in: ['confirmed', 'pending']
        },
        endTime: {
          lt: now
        },
      },
      include: {
        slot: true,
        user: true,
      }
    });
    
    console.log(`[Booking Expiry] Found ${expiredBookings.length} expired bookings`);
    
    for (const booking of expiredBookings) {
      await processExpiredBooking(booking);
    }
    
    return { processed: expiredBookings.length };
  } catch (error) {
    console.error('[Booking Expiry] Error:', error);
    throw error;
  }
}

async function processExpiredBooking(booking) {
  try {
    console.log(`[Booking Expiry] Processing expired booking ${booking.id}`);
    
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'expired',
        cancellationReason: 'Booking expired - user did not check in before end time'
      }
    });
    
    if (booking.slot.status === 'reserved') {
      await prisma.parkingSlot.update({
        where: { id: booking.slotId },
        data: { status: 'available' }
      });
      console.log(`[Booking Expiry] Slot ${booking.slotId} released`);
    }
    
    await prisma.notification.create({
      data: {
        userId: booking.userId,
        title: 'Booking Expired',
        body: `Your booking at ${booking.slot.address} has expired. You did not check in before the end time. No refund will be provided.`,
        type: 'booking_expired',
        data: JSON.stringify({
          bookingId: booking.id,
          slotId: booking.slotId,
          endTime: booking.endTime
        })
      }
    });
    
    await prisma.notification.create({
      data: {
        userId: booking.slot.ownerId,
        title: 'No-Show Report',
        body: `Guest did not arrive for booking at ${booking.slot.address}. Slot has been released.`,
        type: 'booking_no_show',
        data: JSON.stringify({
          bookingId: booking.id,
          slotId: booking.slotId
        })
      }
    });
    
    console.log(`[Booking Expiry] Booking ${booking.id} marked as expired`);
  } catch (error) {
    console.error(`[Booking Expiry] Failed to process booking ${booking.id}:`, error);
  }
}

async function checkMissedOpenTimeBookings(missedThresholdMinutes = 30) {
  try {
    console.log('[Booking Expiry] Checking for missed open-time bookings...');
    
    const now = new Date();
    const thresholdTime = new Date(now.getTime() - missedThresholdMinutes * 60 * 1000);
    
    const missedBookings = await prisma.booking.findMany({
      where: {
        rentalMode: 'open',
        status: {
          in: ['confirmed', 'pending']
        },
        startTime: {
          lt: thresholdTime
        },
        sessions: {
          none: {}
        }
      },
      include: {
        slot: true,
        user: true,
      }
    });
    
    console.log(`[Booking Expiry] Found ${missedBookings.length} missed open-time bookings`);
    
    for (const booking of missedBookings) {
      await processMissedOpenTimeBooking(booking, missedThresholdMinutes);
    }
    
    return { processed: missedBookings.length };
  } catch (error) {
    console.error('[Booking Expiry] Error checking missed open-time bookings:', error);
    throw error;
  }
}

async function processMissedOpenTimeBooking(booking, thresholdMinutes) {
  try {
    console.log(`[Booking Expiry] Processing missed open-time booking ${booking.id}`);
    
    const cancellationReason = 'User did not check in within ' + thresholdMinutes + ' minutes of start time';
    
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'expired',
        cancellationReason: cancellationReason
      }
    });
    
    if (booking.slot.status === 'reserved') {
      await prisma.parkingSlot.update({
        where: { id: booking.slotId },
        data: { status: 'available' }
      });
      console.log(`[Booking Expiry] Slot ${booking.slotId} released`);
    }
    
    await prisma.notification.create({
      data: {
        userId: booking.userId,
        title: 'Booking Expired - No Check-In',
        body: `Your open-time booking at ${booking.slot.address} has expired. You did not check in within ${thresholdMinutes} minutes of the start time. Your slot has been released.`,
        type: 'booking_expired',
        data: JSON.stringify({
          bookingId: booking.id,
          slotId: booking.slotId,
          startTime: booking.startTime,
          thresholdMinutes: thresholdMinutes
        })
      }
    });
    
    await prisma.notification.create({
      data: {
        userId: booking.slot.ownerId,
        title: 'No-Show: Open-Time Booking',
        body: `Guest did not arrive for open-time booking at ${booking.slot.address}. Slot has been released.`,
        type: 'booking_no_show',
        data: JSON.stringify({
          bookingId: booking.id,
          slotId: booking.slotId,
          rentalMode: 'open'
        })
      }
    });
    
    console.log(`[Booking Expiry] Open-time booking ${booking.id} marked as expired`);
  } catch (error) {
    console.error(`[Booking Expiry] Failed to process open-time booking ${booking.id}:`, error);
  }
}

async function sendExpiryReminders() {
  try {
    console.log('[Booking Expiry] Checking for upcoming expirations...');
    
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 30 * 60 * 1000);
    
    const upcomingExpirations = await prisma.booking.findMany({
      where: {
        status: {
          in: ['confirmed', 'pending']
        },
        endTime: {
          gt: now,
          lte: reminderWindow
        }
      },
      include: {
        slot: true,
        user: true,
      }
    });
    
    console.log(`[Booking Expiry] Found ${upcomingExpirations.length} bookings expiring soon`);
    
    for (const booking of upcomingExpirations) {
      const existingReminder = await prisma.notification.findFirst({
        where: {
          userId: booking.userId,
          type: 'booking_expiry_reminder',
          createdAt: {
            gt: new Date(now.getTime() - 60 * 60 * 1000)
          }
        }
      });
      
      if (!existingReminder) {
        const minutesLeft = Math.round((new Date(booking.endTime) - now) / (1000 * 60));
        
        await prisma.notification.create({
          data: {
            userId: booking.userId,
            title: 'Booking Expiring Soon',
            body: `Your booking at ${booking.slot.address} will expire in ${minutesLeft} minutes. Please check in now or your slot will be released.`,
            type: 'booking_expiry_reminder',
            data: JSON.stringify({
              bookingId: booking.id,
              minutesLeft
            })
          }
        });
        
        console.log(`[Booking Expiry] Sent reminder for booking ${booking.id}`);
      }
    }
    
    return { remindersSent: upcomingExpirations.length };
  } catch (error) {
    console.error('[Booking Expiry] Reminder error:', error);
    throw error;
  }
}

module.exports = {
  checkExpiredBookings,
  checkMissedOpenTimeBookings,
  sendExpiryReminders
};
