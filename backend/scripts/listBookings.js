const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📋 All Bookings in Database:\n');
  
  const now = new Date();
  
  const bookings = await prisma.booking.findMany({
    include: {
      user: { select: { email: true, name: true } },
      slot: { select: { address: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  for (const booking of bookings) {
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const hoursUntilStart = Math.round((startTime - now) / (1000 * 60 * 60) * 10) / 10;
    const hoursUntilEnd = Math.round((endTime - now) / (1000 * 60 * 60) * 10) / 10;
    
    console.log(`Booking #${booking.id} | Status: ${booking.status}`);
    console.log(`  User: ${booking.user.email} (${booking.user.name})`);
    console.log(`  Slot: ${booking.slot.address}`);
    console.log(`  Start: ${startTime.toISOString()} (${hoursUntilStart}h from now)`);
    console.log(`  End: ${endTime.toISOString()} (${hoursUntilEnd}h from now)`);
    console.log(`  Rental Mode: ${booking.rentalMode}`);
    console.log('---');
  }
  
  console.log(`\nTotal: ${bookings.length} bookings`);
  
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  console.log(`Confirmed: ${confirmedBookings.length}`);
  
  const expiredBookings = bookings.filter(b => b.status === 'expired');
  console.log(`Expired: ${expiredBookings.length}`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
