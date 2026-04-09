const request = require('supertest');
const express = require('express');
const cors = require('cors');
const {
  setupTestDatabase,
  teardownTestDatabase,
  createTestSlot,
  prisma,
} = require('./setup');

// Create test app
const app = express();
app.use(cors());
app.use(express.json());

// Create a mock rate limiter for tests
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

// Import v1 router
const v1Router = require('../routes/v1');
app.use('/api/v1', v1Router(authLimiter));

let testData = {};
let authTokens = {};

beforeAll(async () => {
  testData = await setupTestDatabase();

  // Login test users to get tokens
  const driverLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'test-driver@example.com',
      password: 'testpass123',
    });
  authTokens.driver = driverLogin.body.token;

  const hostLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'test-host@example.com',
      password: 'testpass123',
    });
  authTokens.host = hostLogin.body.token;
});

afterAll(async () => {
  await teardownTestDatabase();
});

describe('Marketplace API Tests', () => {
  describe('POST /api/v1/marketplace/listings', () => {
    it('should create a new listing with QR code', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/listings')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          lat: 14.5320,
          lon: 120.9850,
          price: 60,
          address: 'New Test Parking Slot',
          slotType: 'roadside_qr',
          description: 'A new test slot',
          amenities: ['covered', 'security', 'cctv'],
          photos: ['https://example.com/photo1.jpg'],
          zoneId: testData.zone.id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(response.body.address).toBe('New Test Parking Slot');
      expect(response.body.price).toBe(60);
      expect(response.body.owner.id).toBe(testData.users.host.id);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/listings')
        .send({
          lat: 14.5320,
          lon: 120.9850,
          price: 60,
          address: 'Test Slot',
          slotType: 'roadside_qr',
        });

      expect(response.status).toBe(401);
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/listings')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          lat: 14.5320,
          // Missing lon, price, address, slotType
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/marketplace/search', () => {
    it('should return available listings', async () => {
      const response = await request(app).get('/api/v1/marketplace/search');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by location and radius', async () => {
      const response = await request(app).get(
        '/api/v1/marketplace/search?lat=14.5312&lon=120.9844&radius=10'
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      // Should include distance field when location provided
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('distance');
      }
    });

    it('should filter by price range', async () => {
      const response = await request(app).get(
        '/api/v1/marketplace/search?minPrice=40&maxPrice=60'
      );

      expect(response.status).toBe(200);
      response.body.data.forEach((listing) => {
        expect(listing.price).toBeGreaterThanOrEqual(40);
        expect(listing.price).toBeLessThanOrEqual(60);
      });
    });

    it('should filter by slot type', async () => {
      const response = await request(app).get(
        '/api/v1/marketplace/search?slotType=roadside_qr'
      );

      expect(response.status).toBe(200);
      response.body.data.forEach((listing) => {
        expect(listing.slotType).toBe('roadside_qr');
      });
    });

    it('should filter by amenities', async () => {
      const response = await request(app).get(
        '/api/v1/marketplace/search?amenities=covered,security'
      );

      expect(response.status).toBe(200);
      response.body.data.forEach((listing) => {
        const amenities = listing.amenities;
        expect(amenities).toContain('covered');
        expect(amenities).toContain('security');
      });
    });

    it('should parse JSON fields correctly', async () => {
      const response = await request(app).get('/api/v1/marketplace/search');

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        const firstListing = response.body.data[0];
        expect(Array.isArray(firstListing.amenities)).toBe(true);
        expect(Array.isArray(firstListing.photos)).toBe(true);
      }
    });
  });

  describe('POST /api/v1/marketplace/bookings', () => {
    it('should create a booking with correct pricing', async () => {
      const startTime = new Date(Date.now() + 3600000); // 1 hour from now
      const endTime = new Date(Date.now() + 7200000); // 2 hours from now

      const response = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.price).toBe(50); // 1 hour * 50
      expect(response.body.platformFee).toBe(2.5); // 5% of 50
      expect(response.body.hostEarnings).toBe(47.5); // 50 - 2.5
      expect(response.body.status).toBe('confirmed');
      expect(response.body.userId).toBe(testData.users.driver.id);
    });

    it('should fail when slot is not available', async () => {
      // First, update slot to occupied
      await prisma.parkingSlot.update({
        where: { id: testData.slot.id },
        data: { status: 'occupied' },
      });

      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const response = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not available');

      // Reset slot status
      await prisma.parkingSlot.update({
        where: { id: testData.slot.id },
        data: { status: 'available' },
      });
    });

    it('should fail for non-existent slot', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const response = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: 99999,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(404);
    });

    it('should update slot status to reserved', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      const slot = await prisma.parkingSlot.findUnique({
        where: { id: testData.slot.id },
      });

      expect(slot.status).toBe('reserved');

      // Reset for other tests
      await prisma.parkingSlot.update({
        where: { id: testData.slot.id },
        data: { status: 'available' },
      });
      await prisma.booking.deleteMany({
        where: { slotId: testData.slot.id },
      });
    });
  });

  describe('POST /api/v1/marketplace/bookings - Rental Modes', () => {
    it('should create fixed duration booking with endTime', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          rentalMode: 'fixed'
        });

      expect(response.status).toBe(201);
      expect(response.body.booking.rentalMode).toBe('fixed');
      expect(response.body.booking.endTime).toBeTruthy();
      expect(response.body.booking.maxDuration).toBeNull();
      expect(response.body.booking.authAmount).toBeNull();
    });

    it('should create open time booking without endTime', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          rentalMode: 'open',
          maxDuration: 12
        });

      expect(response.status).toBe(201);
      expect(response.body.booking.rentalMode).toBe('open');
      expect(response.body.booking.endTime).toBeNull();
      expect(response.body.booking.maxDuration).toBe(12);
      expect(response.body.booking.authAmount).toBeTruthy();
    });

    it('should require endTime for fixed rental mode', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          rentalMode: 'fixed'
          // Missing endTime
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('endTime is required');
    });

    it('should require maxDuration for open rental mode', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          rentalMode: 'open'
          // Missing maxDuration
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('maxDuration is required');
    });

    it('should validate rental mode value', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          rentalMode: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must be either "fixed" or "open"');
    });
  });

  describe('POST /api/v1/marketplace/qr/checkin', () => {
    let qrCode;

    beforeEach(async () => {
      // Get QR code from slot
      const slot = await prisma.parkingSlot.findUnique({
        where: { id: testData.slot.id },
      });
      qrCode = slot.qrCode;

      // Extract QR data (format: data:image/png;base64,...)
      // We need to generate valid QR data
      const { generateQRCodeData } = require('../services/qrcode');
      qrCode = await generateQRCodeData(testData.slot.id.toString());
    });

    it('should check in successfully with valid QR code', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/qr/checkin')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          qrData: qrCode,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session');
      expect(response.body.session.userId).toBe(testData.users.driver.id);
      expect(response.body.session.slotId).toBe(testData.slot.id);
      expect(response.body.session.status).toBe('active');
    });

    it('should fail with invalid QR code format', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/qr/checkin')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          qrData: 'INVALID:QR:CODE',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(response.body.details[0].message).toContain('Invalid QR code format');
    });

    it('should update slot status to occupied', async () => {
      await request(app)
        .post('/api/v1/marketplace/qr/checkin')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          qrData: qrCode,
        });

      const slot = await prisma.parkingSlot.findUnique({
        where: { id: testData.slot.id },
      });

      expect(slot.status).toBe('occupied');
    });
  });

  describe('POST /api/v1/marketplace/qr/checkout', () => {
    let sessionId;

    beforeEach(async () => {
      // Create an active session first
      const { generateQRCodeData } = require('../services/qrcode');
      const qrCode = await generateQRCodeData(testData.slot.id.toString());

      const checkinResponse = await request(app)
        .post('/api/v1/marketplace/qr/checkin')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          qrData: qrCode,
        });

      sessionId = checkinResponse.body.session.id;
    });

    it('should checkout successfully and calculate payment', async () => {
      // Wait a bit to have some duration
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await request(app)
        .post('/api/v1/marketplace/qr/checkout')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          sessionId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('durationMinutes');
      expect(response.body).toHaveProperty('payment');
      expect(response.body.session.status).toBe('completed');
      expect(response.body.totalAmount).toBeGreaterThan(0);
    });

    it('should fail for non-existent session', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/qr/checkout')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          sessionId: 99999,
        });

      expect(response.status).toBe(404);
    });

    it('should fail if session belongs to different user', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/qr/checkout')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          sessionId,
        });

      expect(response.status).toBe(403);
    });

    it('should update slot status to available after checkout', async () => {
      await request(app)
        .post('/api/v1/marketplace/qr/checkout')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          sessionId,
        });

      const slot = await prisma.parkingSlot.findUnique({
        where: { id: testData.slot.id },
      });

      expect(slot.status).toBe('available');
    });
  });

  describe('PATCH /api/v1/marketplace/bookings/:id/cancel - Updated Cancellation', () => {
    let bookingToCancel;

    beforeEach(async () => {
      // Create a booking that can be cancelled (starts in 2 hours)
      bookingToCancel = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.driver.id,
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'confirmed',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });
    });

    it('should cancel booking before deadline', async () => {
      const response = await request(app)
        .patch(`/api/v1/marketplace/bookings/${bookingToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.booking.status).toBe('cancelled');
      expect(response.body.booking.cancelledAt).toBeTruthy();
    });

    it('should not cancel booking within 30 minutes of start', async () => {
      // Update booking to start in 20 minutes
      await prisma.booking.update({
        where: { id: bookingToCancel.id },
        data: {
          startTime: new Date(Date.now() + 20 * 60 * 1000),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .patch(`/api/v1/marketplace/bookings/${bookingToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('within 30 minutes');
      expect(response.body.code).toBe('CANCELLATION_DEADLINE_PASSED');
    });

    it('should not cancel active booking', async () => {
      await prisma.booking.update({
        where: { id: bookingToCancel.id },
        data: { status: 'active' }
      });

      const response = await request(app)
        .patch(`/api/v1/marketplace/bookings/${bookingToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('active booking');
      expect(response.body.code).toBe('BOOKING_ALREADY_ACTIVE');
    });

    it('should not cancel completed booking', async () => {
      await prisma.booking.update({
        where: { id: bookingToCancel.id },
        data: { status: 'completed' }
      });

      const response = await request(app)
        .patch(`/api/v1/marketplace/bookings/${bookingToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('BOOKING_COMPLETED');
    });

    it('should not cancel already cancelled booking', async () => {
      await prisma.booking.update({
        where: { id: bookingToCancel.id },
        data: { status: 'cancelled', cancelledAt: new Date() }
      });

      const response = await request(app)
        .patch(`/api/v1/marketplace/bookings/${bookingToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('ALREADY_CANCELLED');
    });

    it('should not cancel booking that has already started', async () => {
      // Update booking to have started 10 minutes ago
      await prisma.booking.update({
        where: { id: bookingToCancel.id },
        data: {
          startTime: new Date(Date.now() - 10 * 60 * 1000),
          endTime: new Date(Date.now() + 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .patch(`/api/v1/marketplace/bookings/${bookingToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('CANCELLATION_DEADLINE_PASSED');
    });
  });

  describe('Booking Extension Tests', () => {
    let extendableBooking;

    beforeEach(async () => {
      // Create a fixed duration booking that can be extended
      extendableBooking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.driver.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
          originalEndTime: null,
          rentalMode: 'fixed',
          status: 'confirmed',
          price: 150,
          platformFee: 7.5,
          hostEarnings: 142.5,
          extensionCount: 0,
          totalExtensionHrs: 0
        }
      });
    });

    describe('GET /api/v1/marketplace/bookings/:id/extension-availability', () => {
      it('should check extension availability successfully', async () => {
        const response = await request(app)
          .get(`/api/v1/marketplace/bookings/${extendableBooking.id}/extension-availability`)
          .query({ hours: 2 })
          .set('Authorization', `Bearer ${authTokens.driver}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('available');
        expect(response.body).toHaveProperty('currentEndTime');
        expect(response.body).toHaveProperty('requestedEndTime');
        expect(response.body).toHaveProperty('extensionHours', 2);
        expect(response.body).toHaveProperty('pricing');
        expect(response.body.pricing).toHaveProperty('extensionCost');
        expect(response.body.pricing).toHaveProperty('serviceFee', 10);
        expect(response.body.pricing).toHaveProperty('tax');
        expect(response.body.pricing).toHaveProperty('total');
      });

      it('should detect conflicting bookings', async () => {
        // Create a conflicting booking
        await prisma.booking.create({
          data: {
            slotId: testData.slot.id,
            userId: testData.host.id, // Different user
            startTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
            endTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
            rentalMode: 'fixed',
            status: 'confirmed',
            price: 100,
            platformFee: 5,
            hostEarnings: 95
          }
        });

        const response = await request(app)
          .get(`/api/v1/marketplace/bookings/${extendableBooking.id}/extension-availability`)
          .query({ hours: 2 }) // Would extend past conflicting booking
          .set('Authorization', `Bearer ${authTokens.driver}`);

        expect(response.status).toBe(200);
        expect(response.body.available).toBe(false);
        expect(response.body.conflictingBooking).toBeTruthy();
        expect(response.body.conflictingBooking.startTime).toBeTruthy();
      });

      it('should not allow extension for open rental mode', async () => {
        // Update booking to open mode
        await prisma.booking.update({
          where: { id: extendableBooking.id },
          data: { rentalMode: 'open', endTime: null, maxDuration: 12 }
        });

        const response = await request(app)
          .get(`/api/v1/marketplace/bookings/${extendableBooking.id}/extension-availability`)
          .query({ hours: 2 })
          .set('Authorization', `Bearer ${authTokens.driver}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Only fixed duration bookings can be extended');
        expect(response.body.code).toBe('INVALID_RENTAL_MODE');
      });

      it('should not allow extension for completed booking', async () => {
        await prisma.booking.update({
          where: { id: extendableBooking.id },
          data: { status: 'completed' }
        });

        const response = await request(app)
          .get(`/api/v1/marketplace/bookings/${extendableBooking.id}/extension-availability`)
          .query({ hours: 2 })
          .set('Authorization', `Bearer ${authTokens.driver}`);

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('BOOKING_COMPLETED');
      });

      it('should not allow extension for cancelled booking', async () => {
        await prisma.booking.update({
          where: { id: extendableBooking.id },
          data: { status: 'cancelled', cancelledAt: new Date() }
        });

        const response = await request(app)
          .get(`/api/v1/marketplace/bookings/${extendableBooking.id}/extension-availability`)
          .query({ hours: 2 })
          .set('Authorization', `Bearer ${authTokens.driver}`);

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('BOOKING_CANCELLED');
      });

      it('should not allow extension for booking that has ended', async () => {
        // Update booking to have ended 1 hour ago
        await prisma.booking.update({
          where: { id: extendableBooking.id },
          data: {
            startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 60 * 60 * 1000)
          }
        });

        const response = await request(app)
          .get(`/api/v1/marketplace/bookings/${extendableBooking.id}/extension-availability`)
          .query({ hours: 2 })
          .set('Authorization', `Bearer ${authTokens.driver}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('already ended');
        expect(response.body.code).toBe('BOOKING_ENDED');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get(`/api/v1/marketplace/bookings/${extendableBooking.id}/extension-availability`)
          .query({ hours: 2 });

        expect(response.status).toBe(401);
      });

      it('should verify booking ownership', async () => {
        const response = await request(app)
          .get(`/api/v1/marketplace/bookings/${extendableBooking.id}/extension-availability`)
          .query({ hours: 2 })
          .set('Authorization', `Bearer ${authTokens.host}`); // Different user

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Unauthorized');
      });
    });

    describe('POST /api/v1/marketplace/bookings/:id/extend', () => {
      it('should extend booking successfully', async () => {
        const response = await request(app)
          .post(`/api/v1/marketplace/bookings/${extendableBooking.id}/extend`)
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            hours: 2,
            paymentIntentId: 'test_payment_intent_123'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('extended successfully');
        expect(response.body.booking.extensionCount).toBe(1);
        expect(response.body.booking.totalExtensionHrs).toBe(2);
        expect(response.body.booking.lastExtendedAt).toBeTruthy();
        expect(response.body.booking.originalEndTime).toBeTruthy();
        expect(response.body.extension.hours).toBe(2);
        expect(response.body.extension.newEndTime).toBeTruthy();

        // Verify payment record created
        const payment = await prisma.payment.findFirst({
          where: {
            bookingId: extendableBooking.id,
            paymentMethod: 'extension'
          }
        });
        expect(payment).toBeTruthy();
        expect(payment.status).toBe('completed');
        expect(payment.paymentIntent).toBe('test_payment_intent_123');
      });

      it('should track multiple extensions', async () => {
        // First extension
        await request(app)
          .post(`/api/v1/marketplace/bookings/${extendableBooking.id}/extend`)
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            hours: 1,
            paymentIntentId: 'test_payment_1'
          });

        // Second extension
        const response = await request(app)
          .post(`/api/v1/marketplace/bookings/${extendableBooking.id}/extend`)
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            hours: 2,
            paymentIntentId: 'test_payment_2'
          });

        expect(response.status).toBe(200);
        expect(response.body.booking.extensionCount).toBe(2);
        expect(response.body.booking.totalExtensionHrs).toBe(3); // 1 + 2
      });

      it('should validate hours range (1-4)', async () => {
        const response = await request(app)
          .post(`/api/v1/marketplace/bookings/${extendableBooking.id}/extend`)
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            hours: 5, // Too many
            paymentIntentId: 'test_payment_intent_123'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('must be between 1 and 4');
      });

      it('should require hours and paymentIntentId', async () => {
        const response = await request(app)
          .post(`/api/v1/marketplace/bookings/${extendableBooking.id}/extend`)
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            // Missing fields
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Missing required fields');
      });

      it('should detect race condition (slot becomes unavailable)', async () => {
        // Create a conflicting booking between checking and extending
        await prisma.booking.create({
          data: {
            slotId: testData.slot.id,
            userId: testData.host.id,
            startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
            endTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
            rentalMode: 'fixed',
            status: 'confirmed',
            price: 100,
            platformFee: 5,
            hostEarnings: 95
          }
        });

        const response = await request(app)
          .post(`/api/v1/marketplace/bookings/${extendableBooking.id}/extend`)
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            hours: 2,
            paymentIntentId: 'test_payment_intent_123'
          });

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('no longer available');
        expect(response.body.code).toBe('SLOT_CONFLICT');
      });

      it('should notify slot owner of extension', async () => {
        await request(app)
          .post(`/api/v1/marketplace/bookings/${extendableBooking.id}/extend`)
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            hours: 2,
            paymentIntentId: 'test_payment_intent_123'
          });

        // Verify notification created
        const notification = await prisma.notification.findFirst({
          where: {
            userId: testData.host.id,
            type: 'booking_extended'
          }
        });
        expect(notification).toBeTruthy();
        expect(notification.title).toContain('Extended');
      });
    });
  });

  describe('POST /api/v1/marketplace/reviews', () => {
    beforeEach(async () => {
      // Clean up reviews before each test
      await prisma.review.deleteMany({
        where: { slotId: testData.slot.id },
      });
      // Reset slot rating
      await prisma.parkingSlot.update({
        where: { id: testData.slot.id },
        data: { rating: 0 },
      });
    });

    it('should create a review and update slot rating', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/reviews')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          rating: 5,
          comment: 'Excellent parking spot!',
        });

      expect(response.status).toBe(201);
      expect(response.body.rating).toBe(5);
      expect(response.body.comment).toBe('Excellent parking spot!');
      expect(response.body.authorId).toBe(testData.users.driver.id);

      // Check that slot rating was updated
      const slot = await prisma.parkingSlot.findUnique({
        where: { id: testData.slot.id },
      });

      expect(slot.rating).toBe(5);
    });

    it('should fail with invalid rating', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/reviews')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          rating: 6, // Invalid: should be 1-5
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details[0].message).toContain('between 1 and 5');
    });

    it('should fail for non-existent slot', async () => {
      const response = await request(app)
        .post('/api/v1/marketplace/reviews')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: 99999,
          rating: 5,
        });

      expect(response.status).toBe(404);
    });

    it('should calculate average rating correctly', async () => {
      // Create another user for second review
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      const user2 = await prisma.user.create({
        data: {
          email: 'test-driver2@example.com',
          password: hashedPassword,
          name: 'Test Driver 2',
          role: 'driver',
        },
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test-driver2@example.com',
          password: 'testpass123',
        });

      const token2 = loginResponse.body.token;

      // First review: 5 stars
      await request(app)
        .post('/api/v1/marketplace/reviews')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          rating: 5,
        });

      // Second review: 3 stars
      await request(app)
        .post('/api/v1/marketplace/reviews')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          slotId: testData.slot.id,
          rating: 3,
        });

      const slot = await prisma.parkingSlot.findUnique({
        where: { id: testData.slot.id },
      });

      // Average should be 4
      expect(slot.rating).toBe(4);
    });
  });

  describe('GET /api/v1/marketplace/host/earnings', () => {
    let booking;

    beforeEach(async () => {
      // Clean up bookings and payments
      await prisma.payment.deleteMany({});
      await prisma.booking.deleteMany({});

      // Create a completed booking
      const startTime = new Date(Date.now() - 7200000); // 2 hours ago
      const endTime = new Date(Date.now() - 3600000); // 1 hour ago

      booking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime,
          endTime,
          price: 50,
          platformFee: 2.5,
          hostEarnings: 47.5,
          status: 'completed',
        },
      });
    });

    it('should return host earnings summary', async () => {
      const response = await request(app)
        .get('/api/v1/marketplace/host/earnings')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('bookings');
      expect(response.body).toHaveProperty('payouts');

      const { summary } = response.body;
      expect(summary.totalEarnings).toBe(47.5);
      expect(summary.totalBookings).toBe(1);
      expect(summary.platformFeesTotal).toBe(2.5);
    });

    it('should filter by date range', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const tomorrow = new Date(Date.now() + 86400000);

      const response = await request(app)
        .get('/api/v1/marketplace/host/earnings')
        .query({
          startDate: yesterday.toISOString().split('T')[0],
          endDate: tomorrow.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.totalBookings).toBeGreaterThanOrEqual(1);
    });

    it('should calculate pending payout correctly', async () => {
      const response = await request(app)
        .get('/api/v1/marketplace/host/earnings')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      const { summary } = response.body;

      // totalEarnings - totalPaidOut = pendingPayout
      expect(summary.pendingPayout).toBe(
        summary.totalEarnings - summary.totalPaidOut
      );
    });

    it('should only show earnings for host-owned slots', async () => {
      // Create another host's slot
      const otherHost = await prisma.user.create({
        data: {
          email: 'other-host@example.com',
          password: await require('bcrypt').hash('testpass123', 10),
          name: 'Other Host',
          role: 'host',
        },
      });

      const otherSlot = await createTestSlot(otherHost.id, testData.zone.id, {
        slotNumber: 'OTHER-001',
      });

      // Create booking for other host's slot
      await prisma.booking.create({
        data: {
          slotId: otherSlot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 3600000),
          price: 100,
          platformFee: 5,
          hostEarnings: 95,
          status: 'completed',
        },
      });

      const response = await request(app)
        .get('/api/v1/marketplace/host/earnings')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      // Should only include earnings from testData.slot, not otherSlot
      expect(response.body.summary.totalEarnings).toBe(47.5);
    });
  });

  describe('GET /api/v1/marketplace/listings/:id', () => {
    it('should return listing with qrCodeData', async () => {
      const response = await request(app)
        .get(`/api/v1/marketplace/listings/${testData.slot.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testData.slot.id);
      expect(response.body).toHaveProperty('qrCodeData');
      expect(response.body.qrCodeData).toMatch(/^PARKPAL:\d+:\d+:[a-f0-9]{8}$/);
    });

    it('should return 404 for non-existent listing', async () => {
      const response = await request(app)
        .get('/api/v1/marketplace/listings/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Listing not found');
    });
  });
});

describe('Booking Expiry Status Tests', () => {
  describe('PATCH /api/v1/marketplace/bookings/:id/cancel - After Expiry', () => {
    let expiredBooking;

    beforeEach(async () => {
      expiredBooking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 30 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'expired',
          price: 100,
          platformFee: 5,
          hostEarnings: 95,
          cancellationReason: 'Booking expired - user did not check in'
        }
      });
    });

    it('should not allow cancellation of expired booking', async () => {
      const response = await request(app)
        .patch(`/api/v1/marketplace/bookings/${expiredBooking.id}/cancel`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('BOOKING_COMPLETED');
    });
  });

  describe('Expired Booking in My Bookings', () => {
    it('should return expired bookings in API', async () => {
      await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'expired',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const response = await request(app)
        .get('/api/v1/marketplace/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      
      const expiredBooking = response.body.data.find(b => b.status === 'expired');
      expect(expiredBooking).toBeTruthy();
      expect(expiredBooking.status).toBe('expired');
    });
  });
});
