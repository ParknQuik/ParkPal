const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  // Find all confirmed/pending bookings past their end time
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: { in: ['confirmed', 'pending'] },
      endTime: { lt: now }
    },
    include: { slot: true }
  });
  
  console.log(`Found ${expiredBookings.length} bookings to expire\n`);
  
  for (const booking of expiredBookings) {
    console.log(`Expiring booking #${booking.id}...`);
    
    // 1. Update booking to expired
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'expired',
        cancellationReason: 'Booking expired - user did not check in'
      }
    });
    
    // 2. Release slot
    if (booking.slot.status === 'reserved') {
      await prisma.parkingSlot.update({
        where: { id: booking.slotId },
        data: { status: 'available' }
      });
      console.log(`  Slot ${booking.slotId} released`);
    }
    
    // 3. Notify user
    await prisma.notification.create({
      data: {
        userId: booking.userId,
        title: 'Booking Expired ⏰',
        body: `Your booking at ${booking.slot.address} has expired. You did not check in before the end time.`,
        type: 'booking_expired',
        data: JSON.stringify({ bookingId: booking.id })
      }
    });
    console.log(`  User notified\n`);
  }
  
  console.log('✅ Done!');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });