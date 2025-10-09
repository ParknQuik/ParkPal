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

// Import routes
const marketplaceRoutes = require('../routes/marketplace');
const authRoutes = require('../routes/auth');

authRoutes(app);
marketplaceRoutes(app);

let testData = {};
let authTokens = {};

beforeAll(async () => {
  testData = await setupTestDatabase();

  // Login test users to get tokens
  const driverLogin = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'test-driver@example.com',
      password: 'testpass123',
    });
  authTokens.driver = driverLogin.body.token;

  const hostLogin = await request(app)
    .post('/api/auth/login')
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
  describe('POST /api/marketplace/listings', () => {
    it('should create a new listing with QR code', async () => {
      const response = await request(app)
        .post('/api/marketplace/listings')
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
        .post('/api/marketplace/listings')
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
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          lat: 14.5320,
          // Missing lon, price, address, slotType
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/marketplace/search', () => {
    it('should return available listings', async () => {
      const response = await request(app).get('/api/marketplace/search');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('listings');
      expect(Array.isArray(response.body.listings)).toBe(true);
    });

    it('should filter by location and radius', async () => {
      const response = await request(app).get(
        '/api/marketplace/search?lat=14.5312&lon=120.9844&radius=10'
      );

      expect(response.status).toBe(200);
      expect(response.body.listings).toBeDefined();
      // Should include distance field when location provided
      if (response.body.listings.length > 0) {
        expect(response.body.listings[0]).toHaveProperty('distance');
      }
    });

    it('should filter by price range', async () => {
      const response = await request(app).get(
        '/api/marketplace/search?minPrice=40&maxPrice=60'
      );

      expect(response.status).toBe(200);
      response.body.listings.forEach((listing) => {
        expect(listing.price).toBeGreaterThanOrEqual(40);
        expect(listing.price).toBeLessThanOrEqual(60);
      });
    });

    it('should filter by slot type', async () => {
      const response = await request(app).get(
        '/api/marketplace/search?slotType=roadside_qr'
      );

      expect(response.status).toBe(200);
      response.body.listings.forEach((listing) => {
        expect(listing.slotType).toBe('roadside_qr');
      });
    });

    it('should filter by amenities', async () => {
      const response = await request(app).get(
        '/api/marketplace/search?amenities=covered,security'
      );

      expect(response.status).toBe(200);
      response.body.listings.forEach((listing) => {
        const amenities = listing.amenities;
        expect(amenities).toContain('covered');
        expect(amenities).toContain('security');
      });
    });

    it('should parse JSON fields correctly', async () => {
      const response = await request(app).get('/api/marketplace/search');

      expect(response.status).toBe(200);
      if (response.body.listings.length > 0) {
        const firstListing = response.body.listings[0];
        expect(Array.isArray(firstListing.amenities)).toBe(true);
        expect(Array.isArray(firstListing.photos)).toBe(true);
      }
    });
  });

  describe('POST /api/marketplace/bookings', () => {
    it('should create a booking with correct pricing', async () => {
      const startTime = new Date(Date.now() + 3600000); // 1 hour from now
      const endTime = new Date(Date.now() + 7200000); // 2 hours from now

      const response = await request(app)
        .post('/api/marketplace/bookings')
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
        .post('/api/marketplace/bookings')
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
        .post('/api/marketplace/bookings')
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
        .post('/api/marketplace/bookings')
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

  describe('POST /api/marketplace/qr/checkin', () => {
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
      qrCode = generateQRCodeData(testData.slot.id.toString());
    });

    it('should check in successfully with valid QR code', async () => {
      const response = await request(app)
        .post('/api/marketplace/qr/checkin')
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
        .post('/api/marketplace/qr/checkin')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          qrData: 'INVALID:QR:CODE',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid QR code');
    });

    it('should update slot status to occupied', async () => {
      await request(app)
        .post('/api/marketplace/qr/checkin')
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

  describe('POST /api/marketplace/qr/checkout', () => {
    let sessionId;

    beforeEach(async () => {
      // Create an active session first
      const { generateQRCodeData } = require('../services/qrcode');
      const qrCode = generateQRCodeData(testData.slot.id.toString());

      const checkinResponse = await request(app)
        .post('/api/marketplace/qr/checkin')
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
        .post('/api/marketplace/qr/checkout')
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
        .post('/api/marketplace/qr/checkout')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          sessionId: 99999,
        });

      expect(response.status).toBe(404);
    });

    it('should fail if session belongs to different user', async () => {
      const response = await request(app)
        .post('/api/marketplace/qr/checkout')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          sessionId,
        });

      expect(response.status).toBe(403);
    });

    it('should update slot status to available after checkout', async () => {
      await request(app)
        .post('/api/marketplace/qr/checkout')
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

  describe('POST /api/marketplace/reviews', () => {
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
        .post('/api/marketplace/reviews')
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
        .post('/api/marketplace/reviews')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          rating: 6, // Invalid: should be 1-5
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('between 1 and 5');
    });

    it('should fail for non-existent slot', async () => {
      const response = await request(app)
        .post('/api/marketplace/reviews')
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
        .post('/api/auth/login')
        .send({
          email: 'test-driver2@example.com',
          password: 'testpass123',
        });

      const token2 = loginResponse.body.token;

      // First review: 5 stars
      await request(app)
        .post('/api/marketplace/reviews')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          rating: 5,
        });

      // Second review: 3 stars
      await request(app)
        .post('/api/marketplace/reviews')
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

  describe('GET /api/marketplace/host/earnings', () => {
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
        .get('/api/marketplace/host/earnings')
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
        .get('/api/marketplace/host/earnings')
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
        .get('/api/marketplace/host/earnings')
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
        .get('/api/marketplace/host/earnings')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      // Should only include earnings from testData.slot, not otherSlot
      expect(response.body.summary.totalEarnings).toBe(47.5);
    });
  });
});
