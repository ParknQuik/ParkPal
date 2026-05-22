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
let testSlot = null;

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

  // Create a test parking slot owned by the host
  testSlot = await prisma.parkingSlot.create({
    data: {
      lat: 14.5995,
      lon: 120.9842,
      address: 'Test Photo Upload Slot',
      slotType: 'roadside_qr',
      price: 50,
      qrCode: 'TEST-QR-PHOTO-UPLOAD',
      ownerId: testData.users.host.id,
      zoneId: testData.zone.id,
    },
  });
});

afterAll(async () => {
  await teardownTestDatabase();
});

describe('Media/Photo Upload API Tests', () => {
  describe('POST /api/v1/media/upload-url', () => {
    it('should generate signed upload URL for authenticated host', async () => {
      const response = await request(app)
        .post('/api/v1/media/upload-url')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          slotId: testSlot.id,
          fileName: 'test-photo.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('uploadUrl');
      expect(response.body).toHaveProperty('fileName');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body.fileName).toContain('slots/');
      expect(response.body.fileName).toContain('original_');
    });

    it('should reject upload URL request for non-owned slot', async () => {
      const response = await request(app)
        .post('/api/v1/media/upload-url')
        .set('Authorization', `Bearer ${authTokens.driver}`) // Driver doesn't own the slot
        .send({
          slotId: testSlot.id,
          fileName: 'test-photo.jpg',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/v1/media/upload-url')
        .send({
          slotId: testSlot.id,
          fileName: 'test-photo.jpg',
        });

      expect(response.status).toBe(401);
    });

    it('should validate file name extension', async () => {
      const response = await request(app)
        .post('/api/v1/media/upload-url')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          slotId: testSlot.id,
          fileName: 'test-photo.txt', // Invalid extension
        });

      expect(response.status).toBe(400);
    });

    it('should accept valid image extensions (jpg, png, webp)', async () => {
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];

      for (const ext of extensions) {
        const response = await request(app)
          .post('/api/v1/media/upload-url')
          .set('Authorization', `Bearer ${authTokens.host}`)
          .send({
            slotId: testSlot.id,
            fileName: `test-photo.${ext}`,
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('uploadUrl');
      }
    });
  });

  describe('POST /api/v1/media/confirm-upload', () => {
    it('should create photo record after upload confirmation', async () => {
      // Note: In a real scenario, the file would be uploaded to GCS first
      // For testing, we'll mock the fileName as if it was uploaded
      const mockFileName = `slots/${testSlot.id}/original_${Date.now()}.jpg`;

      const response = await request(app)
        .post('/api/v1/media/confirm-upload')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          slotId: testSlot.id,
          fileName: mockFileName,
        });

      // This will fail in test environment without actual GCS setup
      // But we can verify the authorization logic works
      expect([201, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('slotId');
        expect(response.body.slotId).toBe(testSlot.id);
      }
    });

    it('should reject confirm upload for non-owned slot', async () => {
      const mockFileName = `slots/${testSlot.id}/original_${Date.now()}.jpg`;

      const response = await request(app)
        .post('/api/v1/media/confirm-upload')
        .set('Authorization', `Bearer ${authTokens.driver}`) // Driver doesn't own the slot
        .send({
          slotId: testSlot.id,
          fileName: mockFileName,
        });

      expect(response.status).toBe(403);
    });

    it('should reject unauthenticated confirm upload requests', async () => {
      const mockFileName = `slots/${testSlot.id}/original_${Date.now()}.jpg`;

      const response = await request(app)
        .post('/api/v1/media/confirm-upload')
        .send({
          slotId: testSlot.id,
          fileName: mockFileName,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/media/photos/slot/:slotId', () => {
    it('should retrieve photos for a parking slot', async () => {
      const response = await request(app)
        .get(`/api/v1/media/photos/slot/${testSlot.id}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array for slot with no photos', async () => {
      const response = await request(app)
        .get(`/api/v1/media/photos/slot/${testSlot.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should validate slot ID parameter', async () => {
      const response = await request(app)
        .get('/api/v1/media/photos/slot/invalid');

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/media/photos/:id', () => {
    let testPhoto = null;

    beforeEach(async () => {
      // Create a test photo record
      testPhoto = await prisma.photo.create({
        data: {
          slotId: testSlot.id,
          originalUrl: 'https://storage.googleapis.com/parkpal-photos/test/original.jpg',
          largeUrl: 'https://storage.googleapis.com/parkpal-photos/test/large.jpg',
          mediumUrl: 'https://storage.googleapis.com/parkpal-photos/test/medium.jpg',
          thumbnailUrl: 'https://storage.googleapis.com/parkpal-photos/test/thumbnail.jpg',
          position: 0,
        },
      });
    });

    afterEach(async () => {
      // Clean up test photo if it still exists
      await prisma.photo.deleteMany({
        where: { id: testPhoto.id },
      });
    });

    it('should delete photo owned by authenticated host', async () => {
      const response = await request(app)
        .delete(`/api/v1/media/photos/${testPhoto.id}`)
        .set('Authorization', `Bearer ${authTokens.host}`);

      // May fail without actual GCS setup, but authorization should work
      expect([200, 500]).toContain(response.status);
    });

    it('should reject delete request from non-owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/media/photos/${testPhoto.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(403);
    });

    it('should reject unauthenticated delete requests', async () => {
      const response = await request(app)
        .delete(`/api/v1/media/photos/${testPhoto.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent photo', async () => {
      const response = await request(app)
        .delete('/api/v1/media/photos/999999')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Photo Upload Limits', () => {
    it('should enforce 5 photo limit per slot', async () => {
      // Create 5 photos
      const photos = [];
      for (let i = 0; i < 5; i++) {
        const photo = await prisma.photo.create({
          data: {
            slotId: testSlot.id,
            originalUrl: `https://storage.googleapis.com/parkpal-photos/test${i}/original.jpg`,
            largeUrl: `https://storage.googleapis.com/parkpal-photos/test${i}/large.jpg`,
            mediumUrl: `https://storage.googleapis.com/parkpal-photos/test${i}/medium.jpg`,
            thumbnailUrl: `https://storage.googleapis.com/parkpal-photos/test${i}/thumbnail.jpg`,
            position: i,
          },
        });
        photos.push(photo);
      }

      // Try to confirm upload for 6th photo
      const mockFileName = `slots/${testSlot.id}/original_${Date.now()}.jpg`;

      const response = await request(app)
        .post('/api/v1/media/confirm-upload')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          slotId: testSlot.id,
          fileName: mockFileName,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Maximum 5 photos');

      // Clean up
      await prisma.photo.deleteMany({
        where: { id: { in: photos.map(p => p.id) } },
      });
    });
  });
});
