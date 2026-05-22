#!/usr/bin/env node

/**
 * Seed script to create test bookings for mobile app testing
 *
 * Usage:
 *   node scripts/seed-bookings.js
 *
 * Creates:
 * - 3 confirmed bookings (upcoming)
 * - 2 active bookings (ongoing)
 * - 2 completed bookings (past)
 * - 1 cancelled booking
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding bookings...\n');

  // Get test users
  const driver = await prisma.user.findFirst({
    where: { role: 'driver' },
  });

  if (!driver) {
    console.error('❌ No driver user found. Please run main seed script first.');
    process.exit(1);
  }

  // Get available parking slots
  const slots = await prisma.parkingSlot.findMany({
    take: 8,
    where: { isActive: true },
  });

  if (slots.length < 8) {
    console.error('❌ Not enough parking slots found. Please run main seed script first.');
    process.exit(1);
  }

  console.log(`✅ Found driver: ${driver.email}`);
  console.log(`✅ Found ${slots.length} parking slots\n`);

  // Clear existing test bookings for this user
  await prisma.booking.deleteMany({
    where: { userId: driver.id },
  });

  console.log('🗑️  Cleared existing bookings\n');

  const now = new Date();
  const bookings = [];

  // 1. Upcoming confirmed bookings (3)
  for (let i = 0; i < 3; i++) {
    const startTime = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000); // Tomorrow, day after, etc.
    const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours duration
    const hours = (endTime - startTime) / (1000 * 60 * 60);
    const price = slots[i].price * hours;
    const platformFee = price * 0.05;
    const hostEarnings = price - platformFee;

    bookings.push({
      userId: driver.id,
      slotId: slots[i].id,
      startTime,
      endTime,
      price,
      platformFee,
      hostEarnings,
      status: 'confirmed',
    });

    // Update slot status to reserved
    await prisma.parkingSlot.update({
      where: { id: slots[i].id },
      data: { status: 'reserved' },
    });
  }

  // 2. Active bookings (2)
  for (let i = 3; i < 5; i++) {
    const startTime = new Date(now.getTime() - 1 * 60 * 60 * 1000); // Started 1 hour ago
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Ends in 2 hours
    const hours = (endTime - startTime) / (1000 * 60 * 60);
    const price = slots[i].price * hours;
    const platformFee = price * 0.05;
    const hostEarnings = price - platformFee;

    bookings.push({
      userId: driver.id,
      slotId: slots[i].id,
      startTime,
      endTime,
      price,
      platformFee,
      hostEarnings,
      status: 'active',
    });

    // Update slot status to occupied
    await prisma.parkingSlot.update({
      where: { id: slots[i].id },
      data: { status: 'occupied' },
    });
  }

  // 3. Completed bookings (2)
  for (let i = 5; i < 7; i++) {
    const startTime = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 2 days ago
    const endTime = new Date(now.getTime() - 45 * 60 * 60 * 1000); // Ended 45 hours ago
    const hours = (endTime - startTime) / (1000 * 60 * 60);
    const price = slots[i].price * hours;
    const platformFee = price * 0.05;
    const hostEarnings = price - platformFee;

    bookings.push({
      userId: driver.id,
      slotId: slots[i].id,
      startTime,
      endTime,
      price,
      platformFee,
      hostEarnings,
      status: 'completed',
    });
  }

  // 4. Cancelled booking (1)
  const startTime = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
  const hours = (endTime - startTime) / (1000 * 60 * 60);
  const price = slots[7].price * hours;
  const platformFee = price * 0.05;
  const hostEarnings = price - platformFee;

  bookings.push({
    userId: driver.id,
    slotId: slots[7].id,
    startTime,
    endTime,
    price,
    platformFee,
    hostEarnings,
    status: 'cancelled',
    cancelledAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // Cancelled 1 hour ago
    cancellationReason: 'Test cancellation',
  });

  // Create all bookings
  const created = await prisma.booking.createMany({
    data: bookings,
  });

  console.log(`✅ Created ${created.count} bookings:\n`);
  console.log('   📅 3 upcoming (confirmed)');
  console.log('   🅿️  2 active (ongoing)');
  console.log('   ✓ 2 completed (past)');
  console.log('   ✗ 1 cancelled\n');

  // Show booking details
  const allBookings = await prisma.booking.findMany({
    where: { userId: driver.id },
    include: {
      slot: {
        select: {
          address: true,
          price: true,
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  console.log('📋 Booking Details:\n');
  allBookings.forEach((booking, index) => {
    const emoji =
      booking.status === 'confirmed'
        ? '📅'
        : booking.status === 'active'
        ? '🅿️'
        : booking.status === 'completed'
        ? '✓'
        : '✗';
    console.log(
      `${emoji} ${booking.status.toUpperCase()}: ${booking.slot.address.substring(0, 40)}...`
    );
    console.log(`   Start: ${booking.startTime.toLocaleString()}`);
    console.log(`   End:   ${booking.endTime.toLocaleString()}`);
    console.log(`   Price: ₱${booking.price}\n`);
  });

  console.log('✅ Seeding complete!\n');
  console.log('💡 Test in mobile app:');
  console.log(`   - Login as: ${driver.email}`);
  console.log('   - Navigate to "My Bookings"');
  console.log('   - You should see 8 bookings in different states\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding bookings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
