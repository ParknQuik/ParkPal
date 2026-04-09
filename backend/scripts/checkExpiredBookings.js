#!/usr/bin/env node

/**
 * Script to manually check for expired bookings
 * 
 * Usage:
 *   node scripts/checkExpiredBookings.js
 * 
 * This script:
 * 1. Shows bookings that are past their end time but still in confirmed/pending status
 * 2. Provides an option to actually expire them (optional)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExpiredBookings(dryRun = true) {
  console.log('🔍 Checking for expired bookings...\n');
  
  const now = new Date();
  
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: {
        in: ['confirmed', 'pending']
      },
      endTime: {
        lt: now
      }
    },
    include: {
      slot: {
        select: {
          address: true,
          id: true,
          status: true
        }
      },
      user: {
        select: {
          email: true,
          name: true
        }
      }
    },
    orderBy: {
      endTime: 'asc'
    }
  });
  
  console.log(`Found ${expiredBookings.length} bookings past end time:\n`);
  
  if (expiredBookings.length === 0) {
    console.log('✅ No expired bookings found.\n');
    return;
  }
  
  for (const booking of expiredBookings) {
    const endTime = new Date(booking.endTime);
    const hoursAgo = Math.round((now - endTime) / (1000 * 60 * 60));
    const minutesAgo = Math.round((now - endTime) / (1000 * 60));
    
    console.log(`Booking #${booking.id}:`);
    console.log(`  Status: ${booking.status}`);
    console.log(`  End Time: ${endTime.toISOString()} (${hoursAgo}h ${minutesAgo % 60}m ago)`);
    console.log(`  Slot: ${booking.slot.address}`);
    console.log(`  Slot Status: ${booking.slot.status}`);
    console.log(`  User: ${booking.user.email} (${booking.user.name || 'N/A'})\n`);
  }
  
  if (dryRun) {
    console.log('🔔 Dry run mode - no changes made.');
    console.log('   To actually expire these bookings, run:');
    console.log('   node scripts/checkExpiredBookings.js --expire\n');
  } else {
    console.log('⏳ Expiring bookings...\n');
    
    for (const booking of expiredBookings) {
      try {
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
          console.log(`   ✅ Slot ${booking.slotId} released`);
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

        console.log(`   ✅ Booking #${booking.id} expired\n`);
      } catch (err) {
        console.error(`   ❌ Failed to expire booking ${booking.id}:`, err.message);
      }
    }
    
    console.log('✅ Expiry complete.\n');
  }
}

const args = process.argv.slice(2);
const dryRun = !args.includes('--expire');

checkExpiredBookings(dryRun)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });