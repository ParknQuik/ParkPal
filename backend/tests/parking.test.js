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
const authRoutes = require('../routes/auth');
const parkingRoutes = require('../routes/parking');

authRoutes(app);
parkingRoutes(app);

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

describe('Parking API Tests', () => {
  describe('GET /api/slots', () => {
    it('should return all parking slots', async () => {
      const response = await request(app).get('/api/slots');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter slots by status', async () => {
      const response = await request(app).get('/api/slots?status=available');

      expect(response.status).toBe(200);
      response.body.forEach((slot) => {
        expect(slot.status).toBe('available');
      });
    });

    it('should include owner information', async () => {
      const response = await request(app).get('/api/slots');

      expect(response.status).toBe(200);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('owner');
        expect(response.body[0].owner).toHaveProperty('id');
        expect(response.body[0].owner).toHaveProperty('name');
        expect(response.body[0].owner).not.toHaveProperty('password');
      }
    });
  });

  describe('GET /api/slots/:id', () => {
    it('should return a specific parking slot', async () => {
      const response = await request(app).get(`/api/slots/${testData.slot.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testData.slot.id);
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('price');
      expect(response.body).toHaveProperty('status');
    });

    it('should include owner information', async () => {
      const response = await request(app).get(`/api/slots/${testData.slot.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('owner');
      expect(response.body.owner.id).toBe(testData.users.host.id);
    });

    it('should return 404 for non-existent slot', async () => {
      const response = await request(app).get('/api/slots/99999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/slots', () => {
    it('should create a new parking slot', async () => {
      const newSlot = {
        lat: 14.5555,
        lon: 120.9999,
        price: 75,
        address: 'New Test Slot Address',
        slotType: 'roadside_qr',
      };

      const response = await request(app)
        .post('/api/slots')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send(newSlot);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.lat).toBe(newSlot.lat);
      expect(response.body.lon).toBe(newSlot.lon);
      expect(response.body.price).toBe(newSlot.price);
      expect(response.body.address).toBe(newSlot.address);
      expect(response.body.status).toBe('available');
      expect(response.body.ownerId).toBe(testData.users.host.id);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/slots')
        .send({
          lat: 14.5555,
          lon: 120.9999,
          price: 75,
          address: 'Test Address',
        });

      expect(response.status).toBe(401);
    });

    it('should default slotType to roadside_qr', async () => {
      const response = await request(app)
        .post('/api/slots')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          lat: 14.5556,
          lon: 121.0001,
          price: 80,
          address: 'Another Test Slot',
          // No slotType specified
        });

      expect(response.status).toBe(201);
      expect(response.body.slotType).toBe('roadside_qr');
    });
  });

  describe('PUT /api/slots/:id', () => {
    it('should update a parking slot', async () => {
      const updates = {
        price: 100,
        status: 'occupied',
        address: 'Updated Address',
      };

      const response = await request(app)
        .put(`/api/slots/${testData.slot.id}`)
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.price).toBe(updates.price);
      expect(response.body.status).toBe(updates.status);
      expect(response.body.address).toBe(updates.address);

      // Reset for other tests
      await prisma.parkingSlot.update({
        where: { id: testData.slot.id },
        data: { status: 'available', price: 50 },
      });
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/slots/${testData.slot.id}`)
        .send({
          price: 100,
        });

      expect(response.status).toBe(401);
    });

    it('should fail when updating another users slot', async () => {
      const response = await request(app)
        .put(`/api/slots/${testData.slot.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          price: 100,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should allow partial updates', async () => {
      const response = await request(app)
        .put(`/api/slots/${testData.slot.id}`)
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          price: 85,
          // Only updating price
        });

      expect(response.status).toBe(200);
      expect(response.body.price).toBe(85);

      // Reset
      await prisma.parkingSlot.update({
        where: { id: testData.slot.id },
        data: { price: 50 },
      });
    });
  });

  describe('DELETE /api/slots/:id', () => {
    it('should delete a parking slot', async () => {
      // Create a slot to delete
      const slotToDelete = await prisma.parkingSlot.create({
        data: {
          lat: 14.5557,
          lon: 121.0002,
          price: 90,
          address: 'Slot to Delete',
          slotType: 'roadside_qr',
          status: 'available',
          ownerId: testData.users.host.id,
        },
      });

      const response = await request(app)
        .delete(`/api/slots/${slotToDelete.id}`)
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted successfully');

      // Verify it's actually deleted
      const deleted = await prisma.parkingSlot.findUnique({
        where: { id: slotToDelete.id },
      });
      expect(deleted).toBeNull();
    });

    it('should fail without authentication', async () => {
      const response = await request(app).delete(
        `/api/slots/${testData.slot.id}`
      );

      expect(response.status).toBe(401);
    });

    it('should fail when deleting another users slot', async () => {
      const response = await request(app)
        .delete(`/api/slots/${testData.slot.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should fail for non-existent slot', async () => {
      const response = await request(app)
        .delete('/api/slots/99999')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/bookings', () => {
    beforeEach(async () => {
      // Ensure slot is available
      await prisma.parkingSlot.update({
        where: { id: testData.slot.id },
        data: { status: 'available' },
      });
    });

    it('should create a new booking', async () => {
      const startTime = new Date(Date.now() + 3600000); // 1 hour from now
      const endTime = new Date(Date.now() + 7200000); // 2 hours from now

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(testData.users.driver.id);
      expect(response.body.slotId).toBe(testData.slot.id);
      expect(response.body).toHaveProperty('price');
      expect(response.body).toHaveProperty('platformFee');
      expect(response.body).toHaveProperty('hostEarnings');
      expect(response.body.status).toBe('pending');
    });

    it('should calculate price correctly', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000); // 1 hour duration

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.price).toBe(50); // 1 hour * 50/hour
      expect(response.body.platformFee).toBe(2.5); // 5%
      expect(response.body.hostEarnings).toBe(47.5); // 95%
    });

    it('should update slot status to reserved', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      await request(app)
        .post('/api/bookings')
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
    });

    it('should fail when slot is not available', async () => {
      // Set slot to occupied
      await prisma.parkingSlot.update({
        where: { id: testData.slot.id },
        data: { status: 'occupied' },
      });

      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not available');
    });

    it('should fail without authentication', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const response = await request(app)
        .post('/api/bookings')
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/bookings', () => {
    beforeEach(async () => {
      // Clean up bookings
      await prisma.booking.deleteMany({
        where: { userId: testData.users.driver.id },
      });
    });

    it('should return user bookings', async () => {
      // Create a booking first
      await prisma.parkingSlot.update({
        where: { id: testData.slot.id },
        data: { status: 'available' },
      });

      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          slotId: testData.slot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('slot');
      expect(response.body[0].userId).toBe(testData.users.driver.id);
    });

    it('should order bookings by creation date (newest first)', async () => {
      // Create multiple bookings
      await prisma.parkingSlot.update({
        where: { id: testData.slot.id },
        data: { status: 'available' },
      });

      for (let i = 0; i < 3; i++) {
        const startTime = new Date(Date.now() + 3600000 * (i + 1));
        const endTime = new Date(Date.now() + 7200000 * (i + 1));

        await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            slotId: testData.slot.id,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          });

        await prisma.parkingSlot.update({
          where: { id: testData.slot.id },
          data: { status: 'available' },
        });

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(3);

      // Check order
      for (let i = 1; i < response.body.length; i++) {
        const prev = new Date(response.body[i - 1].createdAt);
        const curr = new Date(response.body[i].createdAt);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/bookings');

      expect(response.status).toBe(401);
    });

    it('should only return bookings for authenticated user', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      response.body.forEach((booking) => {
        expect(booking.userId).toBe(testData.users.driver.id);
      });
    });
  });
});
