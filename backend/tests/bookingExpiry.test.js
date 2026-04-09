const { PrismaClient } = require('@prisma/client');
const { checkExpiredBookings, sendExpiryReminders } = require('../services/bookingExpiry');

const prisma = new PrismaClient();

describe('Booking Expiry Service', () => {
  let testData;

  beforeAll(async () => {
    const { setupTestDatabase } = require('./setup');
    testData = await setupTestDatabase();
  });

  afterAll(async () => {
    const { teardownTestDatabase } = require('./setup');
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await prisma.booking.deleteMany({ where: { status: 'expired' } });
  });

  describe('checkExpiredBookings', () => {
    it('should expire confirmed bookings past their end time', async () => {
      const booking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 30 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const result = await checkExpiredBookings();

      expect(result.processed).toBeGreaterThanOrEqual(1);

      const expiredBooking = await prisma.booking.findUnique({
        where: { id: booking.id }
      });
      expect(expiredBooking.status).toBe('expired');
      expect(expiredBooking.cancellationReason).toContain('expired');
    });

    it('should release slot when booking expires', async () => {
      const booking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 30 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const slotBefore = await prisma.parkingSlot.findUnique({
        where: { id: testData.slot.id }
      });
      expect(slotBefore.status).toBe('reserved');

      await checkExpiredBookings();

      const slotAfter = await prisma.parkingSlot.findUnique({
        where: { id: testData.slot.id }
      });
      expect(slotAfter.status).toBe('available');
    });

    it('should create notification for user when booking expires', async () => {
      const booking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 30 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      await checkExpiredBookings();

      const notification = await prisma.notification.findFirst({
        where: {
          userId: testData.users.driver.id,
          type: 'booking_expired'
        }
      });
      expect(notification).toBeTruthy();
      expect(notification.title).toContain('Expired');
    });

    it('should not expire bookings that have not ended yet', async () => {
      await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const result = await checkExpiredBookings();

      expect(result.processed).toBe(0);
    });

    it('should not affect already active bookings', async () => {
      await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'active',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const result = await checkExpiredBookings();

      expect(result.processed).toBe(0);
    });
  });

  describe('sendExpiryReminders', () => {
    it('should send reminder for bookings expiring in 30 minutes', async () => {
      await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 25 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const result = await sendExpiryReminders();

      expect(result.remindersSent).toBeGreaterThanOrEqual(1);

      const notification = await prisma.notification.findFirst({
        where: {
          userId: testData.users.driver.id,
          type: 'booking_expiry_reminder'
        }
      });
      expect(notification).toBeTruthy();
    });

    it('should not send reminder for bookings not in expiry window', async () => {
      await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const result = await sendExpiryReminders();

      expect(result.remindersSent).toBe(0);
    });

    it('should not send duplicate reminders within hour', async () => {
      const booking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 25 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      await sendExpiryReminders();
      const result = await sendExpiryReminders();

      const notifications = await prisma.notification.findMany({
        where: {
          userId: testData.users.driver.id,
          type: 'booking_expiry_reminder',
          data: JSON.stringify({ bookingId: booking.id })
        }
      });

      expect(notifications.length).toBeLessThanOrEqual(1);
    });
  });
});
