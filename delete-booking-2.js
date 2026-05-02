const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/parkpal?schema=public',
});

async function deleteBooking2() {
  console.log('========================================');
  console.log('  Deleting Booking #2 from Database');
  console.log('========================================\n');

  try {
    // Step 1: Find booking #2 and log its details
    console.log('Step 1: Finding booking #2...');
    const booking = await prisma.booking.findUnique({
      where: { id: 2 },
      include: {
        slot: true,
        user: true,
        sessions: true,
        payments: true,
      },
    });

    if (!booking) {
      console.log('⚠️  Booking #2 not found. Nothing to delete.\n');
      return;
    }

    console.log('✅ Booking #2 found:');
    console.log(`   - ID: ${booking.id}`);
    console.log(`   - User ID: ${booking.userId}`);
    console.log(`   - User: ${booking.user.name}`);
    console.log(`   - Slot ID: ${booking.slotId}`);
    console.log(`   - Slot: ${booking.slot.title || booking.slot.address}`);
    console.log(`   - Start Time: ${booking.startTime}`);
    console.log(`   - End Time: ${booking.endTime || 'N/A (open-ended)'}`);
    console.log(`   - Rental Mode: ${booking.rentalMode}`);
    console.log(`   - Price: ${booking.price}`);
    console.log(`   - Status: ${booking.status}`);
    console.log(`   - Platform Fee: ${booking.platformFee}`);
    console.log(`   - Host Earnings: ${booking.hostEarnings}`);
    console.log(`   - Related Sessions: ${booking.sessions.length}`);
    console.log(`   - Related Payments: ${booking.payments.length}\n`);

    const slotId = booking.slotId;
    const slotTitle = booking.slot.title || booking.slot.address;

    // Step 2: Delete any related parking sessions
    if (booking.sessions.length > 0) {
      console.log('Step 2: Deleting related parking sessions...');
      await prisma.parkingSession.deleteMany({
        where: { bookingId: 2 },
      });
      console.log(`✅ Deleted ${booking.sessions.length} parking session(s)\n`);
    } else {
      console.log('Step 2: No related parking sessions to delete\n');
    }

    // Step 3: Delete any related payments
    if (booking.payments.length > 0) {
      console.log('Step 3: Deleting related payments...');
      await prisma.payment.deleteMany({
        where: { bookingId: 2 },
      });
      console.log(`✅ Deleted ${booking.payments.length} payment(s)\n`);
    } else {
      console.log('Step 3: No related payments to delete\n');
    }

    // Step 4: Delete the booking itself
    console.log('Step 4: Deleting booking #2...');
    await prisma.booking.delete({
      where: { id: 2 },
    });
    console.log('✅ Booking #2 deleted successfully\n');

    // Step 5: Update the slot status back to 'available' if it was reserved for this booking
    console.log('Step 5: Checking and updating slot status...');
    const slot = await prisma.parkingSlot.findUnique({
      where: { id: slotId },
    });

    if (slot) {
      console.log(`   - Slot: ${slotTitle}`);
      console.log(`   - Current status: ${slot.status}`);

      if (slot.status === 'reserved') {
        await prisma.parkingSlot.update({
          where: { id: slotId },
          data: { status: 'available' },
        });
        console.log(`   - Updated status: available`);
        console.log('✅ Slot status updated to available\n');
      } else {
        console.log('   - No status change needed (not reserved)\n');
      }
    }

    console.log('========================================');
    console.log('  Deletion Complete!');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteBooking2();
