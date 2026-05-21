const request = require('supertest');
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  setupTestDatabase,
  teardownTestDatabase,
  TEST_USERS
} = require('./setup');

jest.mock('../services/paymongo', () => ({
  createPaymentIntent: jest.fn(async ({ captureType = 'automatic' } = {}) => ({
    success: true,
    paymentIntent: {
      id: `pi_${captureType === 'manual' ? 'manual' : 'auto'}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      attributes: {
        client_key: 'pi_test_client_key',
        status: captureType === 'manual' ? 'awaiting_capture' : 'succeeded',
      },
    },
  })),
  getPaymentIntent: jest.fn(async (paymentIntentId) => ({
    success: true,
    paymentIntent: {
      id: paymentIntentId,
      attributes: {
        status: paymentIntentId.includes('_manual_') ? 'awaiting_capture' : 'succeeded',
      },
    },
  })),
  capturePaymentIntent: jest.fn(async (paymentIntentId) => ({
    success: true,
    paymentIntent: {
      id: paymentIntentId,
      attributes: {
        status: 'succeeded',
      },
    },
  })),
}));

// Setup Express app
const app = express();
app.use(cors());
app.use(express.json());

const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

const v1Router = require('../routes/v1');
app.use('/api/v1', v1Router(authLimiter));

describe('Rental Modes Integration Tests', () => {
  let testData;
  let authTokens = {};

  beforeAll(async () => {
    testData = await setupTestDatabase();

    // Login all users
    const driverLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: TEST_USERS.driver.email,
        password: TEST_USERS.driver.password
      });
    authTokens.driver = driverLogin.body.token;

    const hostLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: TEST_USERS.host.email,
        password: TEST_USERS.host.password
      });
    authTokens.host = hostLogin.body.token;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await prisma.payment.deleteMany({
      where: {
        booking: {
          slotId: testData.slot.id,
          status: { not: 'completed' },
        },
      },
    });
    await prisma.parkingSession.deleteMany({ where: { slotId: testData.slot.id } });
    await prisma.booking.deleteMany({
      where: {
        slotId: testData.slot.id,
        status: { not: 'completed' },
      },
    });
    await prisma.parkingSlot.update({
      where: { id: testData.slot.id },
      data: { status: 'available' },
    });
  });

  describe('Fixed Duration Rental Flow (Traditional)', () => {
    it('should complete full fixed duration rental flow', async () => {
      // Step 1: Search for available slots
      const searchResponse = await request(app)
        .get('/api/v1/marketplace/search')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .query({
          lat: testData.zone.centerLat,
          lon: testData.zone.centerLon,
          radius: 10
        });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.data.length).toBeGreaterThan(0);

      // Step 2: Create fixed duration booking
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(Date.now() + 3 * 60 * 60 * 1000);

      const bookingResponse = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          rentalMode: 'fixed'
        });

      expect(bookingResponse.status).toBe(201);
      expect(bookingResponse.body.booking.rentalMode).toBe('fixed');
      const bookingId = bookingResponse.body.booking.id;

      // Step 3: Process payment
      const paymentIntentResponse = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          amount: bookingResponse.body.booking.price,
          paymentMethod: 'card',
          bookingId
        });

      expect(paymentIntentResponse.status).toBe(201);

      const confirmPaymentResponse = await request(app)
        .post('/api/v1/payments/confirm')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          paymentIntentId: paymentIntentResponse.body.paymentIntentId
        });

      expect(confirmPaymentResponse.status).toBe(200);

      // Step 4: Check-in via QR code
      const { generateQRCodeData } = require('../services/qrcode');
      const qrData = await generateQRCodeData(testData.slot.id.toString());
      const checkinResponse = await request(app)
        .post('/api/v1/marketplace/qr/checkin')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          qrData,
          bookingId,
          userLat: testData.slot.lat,
          userLon: testData.slot.lon
        });

      expect(checkinResponse.status).toBe(200);
      const sessionId = checkinResponse.body.session.id;

      // Step 5: Extend booking
      const extensionAvailability = await request(app)
        .get(`/api/v1/marketplace/bookings/${bookingId}/extension-availability`)
        .query({ hours: 2 })
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(extensionAvailability.status).toBe(200);
      expect(extensionAvailability.body.available).toBe(true);

      const extensionPaymentIntent = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          amount: extensionAvailability.body.pricing.total,
          paymentMethod: 'card',
          bookingId
        });

      const extendResponse = await request(app)
        .post(`/api/v1/marketplace/bookings/${bookingId}/extend`)
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          hours: 2,
          paymentIntentId: extensionPaymentIntent.body.paymentIntentId
        });

      expect(extendResponse.status).toBe(200);
      expect(extendResponse.body.booking.extensionCount).toBe(1);

      // Step 6: Check-out via QR code
      const checkoutResponse = await request(app)
        .post('/api/v1/marketplace/qr/checkout')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          sessionId
        });

      expect(checkoutResponse.status).toBe(200);

      // Step 7: Leave a review
      const reviewResponse = await request(app)
        .post('/api/v1/marketplace/reviews')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          rating: 5,
          comment: 'Great parking spot!'
        });

      expect(reviewResponse.status).toBe(201);

      // Verify final booking state
      const finalBooking = await prisma.booking.findUnique({
        where: { id: bookingId }
      });
      expect(finalBooking.status).toBe('completed');
      expect(finalBooking.extensionCount).toBe(1);
      expect(finalBooking.totalExtensionHrs).toBe(2);
    });
  });

  describe('Open Time Rental Flow (Pay-on-Exit)', () => {
    it('should complete full open time rental flow', async () => {
      // Step 1: Create open time booking
      const startTime = new Date(Date.now() + 5 * 60 * 1000);

      const bookingResponse = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          rentalMode: 'open',
          maxDuration: 12
        });

      expect(bookingResponse.status).toBe(201);
      expect(bookingResponse.body.booking.rentalMode).toBe('open');
      expect(bookingResponse.body.booking.endTime).toBeNull();
      const bookingId = bookingResponse.body.booking.id;

      // Step 2: Authorize payment (not charge)
      const paymentIntentResponse = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          amount: bookingResponse.body.booking.authAmount,
          paymentMethod: 'card',
          bookingId
        });

      expect(paymentIntentResponse.status).toBe(201);
      expect(paymentIntentResponse.body.message).toContain('Authorization hold');

      const confirmPaymentResponse = await request(app)
        .post('/api/v1/payments/confirm')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          paymentIntentId: paymentIntentResponse.body.paymentIntentId
        });

      expect(confirmPaymentResponse.status).toBe(200);

      // Verify payment is authorized, not completed
      const authorizedPayment = await prisma.payment.findFirst({
        where: { bookingId }
      });
      expect(authorizedPayment.status).toBe('authorized');

      // Step 3: Check-in via QR code
      const { generateQRCodeData } = require('../services/qrcode');
      const qrData = await generateQRCodeData(testData.slot.id.toString());
      const checkinResponse = await request(app)
        .post('/api/v1/marketplace/qr/checkin')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          qrData,
          bookingId,
          userLat: testData.slot.lat,
          userLon: testData.slot.lon
        });

      expect(checkinResponse.status).toBe(200);
      const sessionId = checkinResponse.body.session.id;

      // Simulate parking for 3 hours
      await prisma.parkingSession.update({
        where: { id: sessionId },
        data: {
          checkInTime: new Date(Date.now() - 3 * 60 * 60 * 1000)
        }
      });

      // Step 4: Check-out via QR code (payment captured here)
      const checkoutResponse = await request(app)
        .post('/api/v1/marketplace/qr/checkout')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          sessionId
        });

      expect(checkoutResponse.status).toBe(200);
      expect(checkoutResponse.body.durationMinutes).toBeGreaterThan(0);
      expect(checkoutResponse.body.totalAmount).toBeGreaterThan(0);

      // Verify payment was captured (not authorized amount, but actual)
      const capturedPayment = await prisma.payment.findFirst({
        where: { bookingId }
      });
      expect(capturedPayment.status).toBe('completed');
      expect(capturedPayment.amount).toBeLessThan(bookingResponse.body.booking.authAmount); // 3hrs < 12hrs

      // Verify booking completed with actual end time
      const finalBooking = await prisma.booking.findUnique({
        where: { id: bookingId }
      });
      expect(finalBooking.status).toBe('completed');
      expect(finalBooking.endTime).toBeTruthy(); // Should now have end time
    });
  });

  describe('Cancellation Scenarios', () => {
    it('should allow cancellation before 30-minute deadline', async () => {
      // Create booking starting in 2 hours
      const bookingResponse = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          rentalMode: 'fixed'
        });

      const bookingId = bookingResponse.body.booking.id;

      // Cancel booking
      const cancelResponse = await request(app)
        .patch(`/api/v1/marketplace/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.booking.status).toBe('cancelled');
    });

    it('should prevent cancellation within 30-minute window', async () => {
      // Create booking starting in 20 minutes
      const bookingResponse = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          rentalMode: 'fixed'
        });

      const bookingId = bookingResponse.body.booking.id;

      // Attempt to cancel
      const cancelResponse = await request(app)
        .patch(`/api/v1/marketplace/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(cancelResponse.status).toBe(400);
      expect(cancelResponse.body.code).toBe('CANCELLATION_DEADLINE_PASSED');
    });
  });

  describe('Error Scenarios', () => {
    it('should prevent double check-in', async () => {
      // Create and confirm booking
      const bookingResponse = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          rentalMode: 'fixed'
        });

      const bookingId = bookingResponse.body.booking.id;

      // First check-in
      const { generateQRCodeData } = require('../services/qrcode');
      const qrData = await generateQRCodeData(testData.slot.id.toString());
      const firstCheckin = await request(app)
        .post('/api/v1/marketplace/qr/checkin')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          qrData,
          bookingId,
          userLat: testData.slot.lat,
          userLon: testData.slot.lon
        });

      expect(firstCheckin.status).toBe(200);

      // Second check-in attempt
      const secondCheckin = await request(app)
        .post('/api/v1/marketplace/qr/checkin')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          qrData,
          bookingId,
          userLat: testData.slot.lat,
          userLon: testData.slot.lon
        });

      expect(secondCheckin.status).toBe(400);
      expect(secondCheckin.body.code).toBe('ALREADY_CHECKED_IN');
    });

    it('should prevent checkout without check-in', async () => {
      const checkoutResponse = await request(app)
        .post('/api/v1/marketplace/qr/checkout')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          sessionId: 999999
        });

      expect(checkoutResponse.status).toBe(404);
    });

    it('should prevent booking overlapping time slots', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(Date.now() + 3 * 60 * 60 * 1000);

      // First booking
      const firstBooking = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          rentalMode: 'fixed'
        });

      expect(firstBooking.status).toBe(201);

      // Overlapping booking attempt
      const overlappingBooking = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          rentalMode: 'fixed'
        });

      expect(overlappingBooking.status).toBe(409);
      expect(overlappingBooking.body.error).toContain('already booked');
    });
  });

  describe('Host Earnings and Payouts', () => {
    it('should track earnings after completed booking', async () => {
      // Create and complete a booking
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(Date.now() + 3 * 60 * 60 * 1000);

      const bookingResponse = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          rentalMode: 'fixed'
        });

      const bookingId = bookingResponse.body.booking.id;
      const bookingAmount = bookingResponse.body.booking.price;

      // Complete payment and booking flow
      const { generateQRCodeData } = require('../services/qrcode');
      const qrData = await generateQRCodeData(testData.slot.id.toString());
      const checkinResponse = await request(app)
        .post('/api/v1/marketplace/qr/checkin')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          qrData,
          bookingId,
          userLat: testData.slot.lat,
          userLon: testData.slot.lon
        });

      const checkoutResponse = await request(app)
        .post('/api/v1/marketplace/qr/checkout')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({ sessionId: checkinResponse.body.session.id });

      // Check host earnings
      const earningsResponse = await request(app)
        .get('/api/v1/marketplace/host/earnings')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(earningsResponse.status).toBe(200);
      expect(earningsResponse.body.summary.totalEarnings).toBeGreaterThan(0);
      expect(earningsResponse.body.summary.pendingPayout).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Review System', () => {
    it('should allow review only after completed booking', async () => {
      // Try to review without booking
      const reviewWithoutBooking = await request(app)
        .post('/api/v1/marketplace/reviews')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          rating: 5,
          comment: 'Test review'
        });

      expect(reviewWithoutBooking.status).toBe(201);
    });

    it('should prevent duplicate reviews for same booking', async () => {
      // Create and complete booking
      const bookingResponse = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          rentalMode: 'fixed'
        });

      // Mark as completed
      await prisma.booking.update({
        where: { id: bookingResponse.body.booking.id },
        data: { status: 'completed' }
      });

      // First review
      const firstReview = await request(app)
        .post('/api/v1/marketplace/reviews')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          bookingId: bookingResponse.body.booking.id,
          rating: 5,
          comment: 'First review'
        });

      expect(firstReview.status).toBe(201);

      // Second review attempt
      const secondReview = await request(app)
        .post('/api/v1/marketplace/reviews')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          bookingId: bookingResponse.body.booking.id,
          rating: 4,
          comment: 'Second review'
        });

      expect(secondReview.status).toBe(400);
      expect(secondReview.body.error).toContain('already exists');
    });
  });
});
