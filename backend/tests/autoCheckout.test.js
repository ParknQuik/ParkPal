const { PrismaClient } = require('@prisma/client');
const { autoCheckoutExpiredSessions, performAutoCheckout } = require('../services/autoCheckout');

const prisma = new PrismaClient();

describe('Auto-Checkout Service', () => {
  let testUser;
  let testSlot;
  let testSession;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `autocheckout-${Date.now()}@test.com`,
        password: 'hashedPassword123',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+1234567890',
        role: 'user',
      },
    });

    // Create test parking slot
    testSlot = await prisma.parkingSlot.create({
      data: {
        lat: 14.5995,
        lon: 120.9842,
        address: '123 Test Street, Manila',
        slotType: 'commercial_manual',
        status: 'occupied',
        price: 50, // ₱50 per hour
        qrCode: `QR-AUTO-${Date.now()}`,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testSession) {
      await prisma.payment.deleteMany({ where: { sessionId: testSession.id } });
      await prisma.notification.deleteMany({ where: { userId: testUser.id } });
      await prisma.parkingSession.delete({ where: { id: testSession.id } });
    }
    await prisma.parkingSlot.delete({ where: { id: testSlot.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('performAutoCheckout', () => {
    it('should checkout a session and calculate correct amount without overstay', async () => {
      // Create a session from 10 hours ago
      const checkInTime = new Date(Date.now() - 10 * 60 * 60 * 1000);
      testSession = await prisma.parkingSession.create({
        data: {
          userId: testUser.id,
          slotId: testSlot.id,
          sessionType: 'commercial_manual',
          checkInTime,
          status: 'active',
        },
        include: {
          slot: true,
          user: true,
        },
      });

      const checkOutTime = new Date();
      const amount = await performAutoCheckout(testSession, checkOutTime);

      // Should be 10 hours * ₱50 = ₱500
      expect(amount).toBe(500);

      // Verify session was updated
      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: testSession.id },
      });
      expect(updatedSession.status).toBe('completed');
      expect(updatedSession.checkOutTime).toBeDefined();
      expect(updatedSession.totalAmount).toBe(500);

      // Verify slot status was updated
      const updatedSlot = await prisma.parkingSlot.findUnique({
        where: { id: testSlot.id },
      });
      expect(updatedSlot.status).toBe('available');

      // Verify payment was created
      const payment = await prisma.payment.findFirst({
        where: { sessionId: testSession.id },
      });
      expect(payment).toBeDefined();
      expect(payment.amount).toBe(500);
      expect(payment.paymentMethod).toBe('auto_charge');
      expect(payment.status).toBe('pending');

      // Verify notification was created
      const notification = await prisma.notification.findFirst({
        where: {
          userId: testUser.id,
          type: 'auto_checkout',
        },
      });
      expect(notification).toBeDefined();
      expect(notification.title).toContain('Auto Checkout');
    });

    it('should calculate correct amount with overstay penalty', async () => {
      // Clean up previous test session
      await prisma.payment.deleteMany({ where: { sessionId: testSession.id } });
      await prisma.notification.deleteMany({ where: { userId: testUser.id } });
      await prisma.parkingSession.delete({ where: { id: testSession.id } });

      // Create a session from 15 hours ago (3 hours overstay)
      const checkInTime = new Date(Date.now() - 15 * 60 * 60 * 1000);
      testSession = await prisma.parkingSession.create({
        data: {
          userId: testUser.id,
          slotId: testSlot.id,
          sessionType: 'commercial_manual',
          checkInTime,
          status: 'active',
        },
        include: {
          slot: true,
          user: true,
        },
      });

      const checkOutTime = new Date();
      const amount = await performAutoCheckout(testSession, checkOutTime);

      // 12 hours * ₱50 + 3 hours * ₱75 (1.5x) = ₱600 + ₱225 = ₱825
      expect(amount).toBe(825);

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: testSession.id },
      });
      expect(updatedSession.totalAmount).toBe(825);

      const notification = await prisma.notification.findFirst({
        where: {
          userId: testUser.id,
          type: 'auto_checkout',
        },
      });
      expect(notification.body).toContain('overstay penalty');
    });
  });

  describe('autoCheckoutExpiredSessions', () => {
    it('should find and checkout expired sessions', async () => {
      // Clean up previous test session
      await prisma.payment.deleteMany({ where: { sessionId: testSession.id } });
      await prisma.notification.deleteMany({ where: { userId: testUser.id } });
      await prisma.parkingSession.delete({ where: { id: testSession.id } });

      // Create a session from 13 hours ago (expired)
      const checkInTime = new Date(Date.now() - 13 * 60 * 60 * 1000);
      testSession = await prisma.parkingSession.create({
        data: {
          userId: testUser.id,
          slotId: testSlot.id,
          sessionType: 'commercial_manual',
          checkInTime,
          status: 'active',
        },
      });

      const result = await autoCheckoutExpiredSessions();

      expect(result.processed).toBeGreaterThanOrEqual(1);
      expect(result.totalRevenue).toBeGreaterThan(0);

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: testSession.id },
      });
      expect(updatedSession.status).toBe('completed');
    });

    it('should not checkout sessions under 12 hours', async () => {
      // Clean up previous test session
      await prisma.payment.deleteMany({ where: { sessionId: testSession.id } });
      await prisma.notification.deleteMany({ where: { userId: testUser.id } });
      await prisma.parkingSession.delete({ where: { id: testSession.id } });

      // Create a session from 5 hours ago (not expired)
      const checkInTime = new Date(Date.now() - 5 * 60 * 60 * 1000);
      testSession = await prisma.parkingSession.create({
        data: {
          userId: testUser.id,
          slotId: testSlot.id,
          sessionType: 'commercial_manual',
          checkInTime,
          status: 'active',
        },
      });

      await autoCheckoutExpiredSessions();

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: testSession.id },
      });
      // Should still be active
      expect(updatedSession.status).toBe('active');
    });
  });
});
