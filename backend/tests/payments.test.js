const request = require('supertest');
const express = require('express');
const cors = require('cors');
const {
  setupTestDatabase,
  teardownTestDatabase,
  prisma,
} = require('./setup');

// Create test app
const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('../routes/auth');
const parkingRoutes = require('../routes/parking');
const paymentRoutes = require('../routes/payments');

authRoutes(app);
parkingRoutes(app);
paymentRoutes(app);

let testData = {};
let authTokens = {};
let testBooking;

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

  // Create a test booking for payment tests
  const startTime = new Date(Date.now() + 3600000);
  const endTime = new Date(Date.now() + 7200000);

  testBooking = await prisma.booking.create({
    data: {
      slotId: testData.slot.id,
      userId: testData.users.driver.id,
      startTime,
      endTime,
      price: 50,
      platformFee: 2.5,
      hostEarnings: 47.5,
      status: 'pending',
    },
  });
});

afterAll(async () => {
  await teardownTestDatabase();
});

describe('Payment API Tests', () => {
  describe('POST /api/payments', () => {
    it('should process a payment successfully', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          bookingId: testBooking.id,
          paymentMethod: 'gcash',
          amount: 50,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(testData.users.driver.id);
      expect(response.body.bookingId).toBe(testBooking.id);
      expect(response.body.paymentMethod).toBe('gcash');
      expect(response.body.amount).toBe(50);
      expect(response.body.status).toBe('completed');
    });

    it('should update booking status to confirmed after payment', async () => {
      // Create a new booking for this test
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const newBooking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime,
          endTime,
          price: 50,
          platformFee: 2.5,
          hostEarnings: 47.5,
          status: 'pending',
        },
      });

      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          bookingId: newBooking.id,
          paymentMethod: 'card',
          amount: 50,
        });

      const updatedBooking = await prisma.booking.findUnique({
        where: { id: newBooking.id },
      });

      expect(updatedBooking.status).toBe('confirmed');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/payments')
        .send({
          bookingId: testBooking.id,
          paymentMethod: 'card',
          amount: 50,
        });

      expect(response.status).toBe(401);
    });

    it('should fail when paying for another users booking', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          bookingId: testBooking.id,
          paymentMethod: 'card',
          amount: 50,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should fail for non-existent booking', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          bookingId: 99999,
          paymentMethod: 'card',
          amount: 50,
        });

      expect(response.status).toBe(403);
    });

    it('should accept different payment methods', async () => {
      const paymentMethods = ['card', 'cash', 'gcash', 'paymaya', 'paymongo'];

      for (const method of paymentMethods) {
        const startTime = new Date(Date.now() + 3600000);
        const endTime = new Date(Date.now() + 7200000);

        const booking = await prisma.booking.create({
          data: {
            slotId: testData.slot.id,
            userId: testData.users.driver.id,
            startTime,
            endTime,
            price: 50,
            platformFee: 2.5,
            hostEarnings: 47.5,
            status: 'pending',
          },
        });

        const response = await request(app)
          .post('/api/payments')
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            bookingId: booking.id,
            paymentMethod: method,
            amount: 50,
          });

        expect(response.status).toBe(201);
        expect(response.body.paymentMethod).toBe(method);
      }
    });
  });

  describe('GET /api/payments', () => {
    beforeAll(async () => {
      // Create some payments for testing
      await prisma.payment.deleteMany({
        where: { userId: testData.users.driver.id },
      });

      for (let i = 0; i < 3; i++) {
        const startTime = new Date(Date.now() + 3600000 * (i + 1));
        const endTime = new Date(Date.now() + 7200000 * (i + 1));

        const booking = await prisma.booking.create({
          data: {
            slotId: testData.slot.id,
            userId: testData.users.driver.id,
            startTime,
            endTime,
            price: 50,
            platformFee: 2.5,
            hostEarnings: 47.5,
            status: 'pending',
          },
        });

        await prisma.payment.create({
          data: {
            userId: testData.users.driver.id,
            bookingId: booking.id,
            paymentMethod: 'card',
            amount: 50,
            status: 'completed',
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    it('should return user payments', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should include booking and slot information', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('booking');
        expect(response.body[0].booking).toHaveProperty('slot');
      }
    });

    it('should order payments by creation date (newest first)', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);

      for (let i = 1; i < response.body.length; i++) {
        const prev = new Date(response.body[i - 1].createdAt);
        const curr = new Date(response.body[i].createdAt);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });

    it('should only return payments for authenticated user', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      response.body.forEach((payment) => {
        expect(payment.userId).toBe(testData.users.driver.id);
      });
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/payments');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/payments/:id', () => {
    let testPayment;

    beforeAll(async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const booking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime,
          endTime,
          price: 50,
          platformFee: 2.5,
          hostEarnings: 47.5,
          status: 'pending',
        },
      });

      testPayment = await prisma.payment.create({
        data: {
          userId: testData.users.driver.id,
          bookingId: booking.id,
          paymentMethod: 'card',
          amount: 50,
          status: 'completed',
        },
      });
    });

    it('should return a specific payment', async () => {
      const response = await request(app)
        .get(`/api/payments/${testPayment.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testPayment.id);
      expect(response.body.userId).toBe(testData.users.driver.id);
      expect(response.body).toHaveProperty('booking');
    });

    it('should include booking and slot information', async () => {
      const response = await request(app)
        .get(`/api/payments/${testPayment.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('booking');
      expect(response.body.booking).toHaveProperty('slot');
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get(`/api/payments/${testPayment.id}`);

      expect(response.status).toBe(401);
    });

    it('should fail when accessing another users payment', async () => {
      const response = await request(app)
        .get(`/api/payments/${testPayment.id}`)
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should fail for non-existent payment', async () => {
      const response = await request(app)
        .get('/api/payments/99999')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(403);
    });
  });
});
