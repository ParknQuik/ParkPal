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
          },
          data: JSON.stringify({ bookingId: booking.id })
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
  sendExpiryReminders
};
