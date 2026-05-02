const { PrismaClient } = require('@prisma/client');
const { checkExpiredBookings, checkMissedOpenTimeBookings, sendExpiryReminders } = require('../services/bookingExpiry');

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
      const slot = await prisma.parkingSlot.create({
        data: {
          zoneId: testData.zone.id,
          slotNumber: 'TEST-002',
          lat: 14.5320,
          lon: 120.9846,
          address: 'Test Parking Slot Address 2',
          slotType: 'roadside_qr',
          status: 'reserved',
          price: 50,
          description: 'Test parking slot 2',
          amenities: JSON.stringify(['covered', 'security']),
          photos: JSON.stringify(['https://example.com/test.jpg']),
          rating: 0,
          ownerId: testData.users.host.id,
        }
      });

      const booking = await prisma.booking.create({
        data: {
          slotId: slot.id,
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
        where: { id: slot.id }
      });
      expect(slotBefore.status).toBe('reserved');

      await checkExpiredBookings();

      const slotAfter = await prisma.parkingSlot.findUnique({
        where: { id: slot.id }
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
    beforeEach(async () => {
      await prisma.booking.deleteMany({});
    });

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
          type: 'booking_expiry_reminder'
        }
      });

      expect(notifications.length).toBeLessThanOrEqual(1);
    });
  });

  describe('checkMissedOpenTimeBookings', () => {
    beforeEach(async () => {
      await prisma.booking.deleteMany({});
      await prisma.parkingSlot.deleteMany({ where: { slotNumber: { startsWith: 'TEST-' } } });
    });

    it('should expire open-time bookings without check-in after threshold', async () => {
      const slot2 = await prisma.parkingSlot.create({
        data: {
          zoneId: testData.zone.id,
          slotNumber: 'TEST-002',
          lat: 14.5320,
          lon: 120.9846,
          address: 'Test Parking Slot Address 2',
          slotType: 'roadside_qr',
          status: 'reserved',
          price: 50,
          description: 'Test parking slot 2',
          amenities: JSON.stringify(['covered', 'security']),
          photos: JSON.stringify(['https://example.com/test.jpg']),
          rating: 0,
          ownerId: testData.users.host.id,
        }
      });

      const booking = await prisma.booking.create({
        data: {
          slotId: slot2.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 45 * 60 * 1000),
          endTime: new Date(Date.now() + 15 * 60 * 1000),
          rentalMode: 'open',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const result = await checkMissedOpenTimeBookings(30);

      expect(result.processed).toBeGreaterThanOrEqual(1);

      const expiredBooking = await prisma.booking.findUnique({
        where: { id: booking.id }
      });
      expect(expiredBooking.status).toBe('expired');
      expect(expiredBooking.cancellationReason).toContain('did not check in');
    });

    it('should release slot when open-time booking is expired', async () => {
      const slot2 = await prisma.parkingSlot.create({
        data: {
          zoneId: testData.zone.id,
          slotNumber: 'TEST-003',
          lat: 14.5321,
          lon: 120.9847,
          address: 'Test Parking Slot Address 3',
          slotType: 'roadside_qr',
          status: 'reserved',
          price: 50,
          description: 'Test parking slot 3',
          amenities: JSON.stringify(['covered', 'security']),
          photos: JSON.stringify(['https://example.com/test.jpg']),
          rating: 0,
          ownerId: testData.users.host.id,
        }
      });

      const booking = await prisma.booking.create({
        data: {
          slotId: slot2.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 40 * 60 * 1000),
          endTime: new Date(Date.now() + 20 * 60 * 1000),
          rentalMode: 'open',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      await checkMissedOpenTimeBookings(30);

      const slotAfter = await prisma.parkingSlot.findUnique({
        where: { id: slot2.id }
      });
      expect(slotAfter.status).toBe('available');
    });

    it('should create notification for user when open-time booking is expired', async () => {
      const slot2 = await prisma.parkingSlot.create({
        data: {
          zoneId: testData.zone.id,
          slotNumber: 'TEST-004',
          lat: 14.5322,
          lon: 120.9848,
          address: 'Test Parking Slot Address 4',
          slotType: 'roadside_qr',
          status: 'reserved',
          price: 50,
          description: 'Test parking slot 4',
          amenities: JSON.stringify(['covered', 'security']),
          photos: JSON.stringify(['https://example.com/test.jpg']),
          rating: 0,
          ownerId: testData.users.host.id,
        }
      });

      const booking = await prisma.booking.create({
        data: {
          slotId: slot2.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 45 * 60 * 1000),
          endTime: new Date(Date.now() + 15 * 60 * 1000),
          rentalMode: 'open',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      await checkMissedOpenTimeBookings(30);

      const notification = await prisma.notification.findFirst({
        where: {
          userId: testData.users.driver.id,
          type: 'booking_expired'
        }
      });
      expect(notification).toBeTruthy();
      expect(notification.title).toContain('Expired');
    });

    it('should create notification for host when open-time booking is expired', async () => {
      const slot2 = await prisma.parkingSlot.create({
        data: {
          zoneId: testData.zone.id,
          slotNumber: 'TEST-005',
          lat: 14.5323,
          lon: 120.9849,
          address: 'Test Parking Slot Address 5',
          slotType: 'roadside_qr',
          status: 'reserved',
          price: 50,
          description: 'Test parking slot 5',
          amenities: JSON.stringify(['covered', 'security']),
          photos: JSON.stringify(['https://example.com/test.jpg']),
          rating: 0,
          ownerId: testData.users.host.id,
        }
      });

      const booking = await prisma.booking.create({
        data: {
          slotId: slot2.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 45 * 60 * 1000),
          endTime: new Date(Date.now() + 15 * 60 * 1000),
          rentalMode: 'open',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      await checkMissedOpenTimeBookings(30);

      const notification = await prisma.notification.findFirst({
        where: {
          userId: testData.users.host.id,
          type: 'booking_no_show'
        }
      });
      expect(notification).toBeTruthy();
      expect(notification.title).toContain('No-Show');
    });

    it('should not expire open-time bookings that have not reached the threshold', async () => {
      const slot2 = await prisma.parkingSlot.create({
        data: {
          zoneId: testData.zone.id,
          slotNumber: 'TEST-006',
          lat: 14.5324,
          lon: 120.9850,
          address: 'Test Parking Slot Address 6',
          slotType: 'roadside_qr',
          status: 'reserved',
          price: 50,
          description: 'Test parking slot 6',
          amenities: JSON.stringify(['covered', 'security']),
          photos: JSON.stringify(['https://example.com/test.jpg']),
          rating: 0,
          ownerId: testData.users.host.id,
        }
      });

      const booking = await prisma.booking.create({
        data: {
          slotId: slot2.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 15 * 60 * 1000),
          endTime: new Date(Date.now() + 45 * 60 * 1000),
          rentalMode: 'open',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const result = await checkMissedOpenTimeBookings(30);

      expect(result.processed).toBe(0);

      const stillActive = await prisma.booking.findUnique({
        where: { id: booking.id }
      });
      expect(stillActive.status).toBe('confirmed');
    });

    it('should not expire open-time bookings with a parking session', async () => {
      const slot2 = await prisma.parkingSlot.create({
        data: {
          zoneId: testData.zone.id,
          slotNumber: 'TEST-007',
          lat: 14.5325,
          lon: 120.9851,
          address: 'Test Parking Slot Address 7',
          slotType: 'roadside_qr',
          status: 'reserved',
          price: 50,
          description: 'Test parking slot 7',
          amenities: JSON.stringify(['covered', 'security']),
          photos: JSON.stringify(['https://example.com/test.jpg']),
          rating: 0,
          ownerId: testData.users.host.id,
        }
      });

      const booking = await prisma.booking.create({
        data: {
          slotId: slot2.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 45 * 60 * 1000),
          endTime: new Date(Date.now() + 15 * 60 * 1000),
          rentalMode: 'open',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

       const session = await prisma.parkingSession.create({
        data: {
          slotId: slot2.id,
          userId: testData.users.driver.id,
          bookingId: booking.id,
          checkInTime: new Date(Date.now() - 40 * 60 * 1000),
          sessionType: 'roadside_qr',
          status: 'active'
        }
      });

      const result = await checkMissedOpenTimeBookings(30);

      expect(result.processed).toBe(0);

      const stillActive = await prisma.booking.findUnique({
        where: { id: booking.id }
      });
      expect(stillActive.status).toBe('confirmed');
    });

    it('should not expire fixed-time bookings', async () => {
      const slot2 = await prisma.parkingSlot.create({
        data: {
          zoneId: testData.zone.id,
          slotNumber: 'TEST-008',
          lat: 14.5326,
          lon: 120.9852,
          address: 'Test Parking Slot Address 8',
          slotType: 'roadside_qr',
          status: 'reserved',
          price: 50,
          description: 'Test parking slot 8',
          amenities: JSON.stringify(['covered', 'security']),
          photos: JSON.stringify(['https://example.com/test.jpg']),
          rating: 0,
          ownerId: testData.users.host.id,
        }
      });

      const booking = await prisma.booking.create({
        data: {
          slotId: slot2.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 45 * 60 * 1000),
          endTime: new Date(Date.now() - 15 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const result = await checkMissedOpenTimeBookings(30);

      expect(result.processed).toBe(0);

      const stillActive = await prisma.booking.findUnique({
        where: { id: booking.id }
      });
      expect(stillActive.status).toBe('confirmed');
    });

    it('should not expire pending open-time bookings below the threshold', async () => {
      const slot2 = await prisma.parkingSlot.create({
        data: {
          zoneId: testData.zone.id,
          slotNumber: 'TEST-009',
          lat: 14.5327,
          lon: 120.9853,
          address: 'Test Parking Slot Address 9',
          slotType: 'roadside_qr',
          status: 'reserved',
          price: 50,
          description: 'Test parking slot 9',
          amenities: JSON.stringify(['covered', 'security']),
          photos: JSON.stringify(['https://example.com/test.jpg']),
          rating: 0,
          ownerId: testData.users.host.id,
        }
      });

      const booking = await prisma.booking.create({
        data: {
          slotId: slot2.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 20 * 60 * 1000),
          endTime: new Date(Date.now() + 40 * 60 * 1000),
          rentalMode: 'open',
          status: 'pending',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const result = await checkMissedOpenTimeBookings(30);

      expect(result.processed).toBe(0);

      const stillActive = await prisma.booking.findUnique({
        where: { id: booking.id }
      });
      expect(stillActive.status).toBe('pending');
    });
  });
});

