const request = require('supertest');
const express = require('express');
const cors = require('cors');
const {
  setupTestDatabase,
  teardownTestDatabase,
} = require('./setup');

const app = express();
app.use(cors());
app.use(express.json());

const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

const v1Router = require('../routes/v1');
app.use('/api/v1', v1Router(authLimiter));

let testData = {};
let authTokens = {};

beforeAll(async () => {
  testData = await setupTestDatabase();

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

describe('Earnings API', () => {
  describe('GET /api/v1/earnings/summary', () => {
    it('should return earnings summary', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/summary')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('paid');
      expect(response.body).toHaveProperty('currency');
      expect(response.body).toHaveProperty('thisMonth');
      expect(response.body).toHaveProperty('lastMonth');
      expect(response.body).toHaveProperty('activeSlots');
      expect(response.body).toHaveProperty('totalBookings');
    });

    it('should return numeric values', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/summary')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.pending).toBe('number');
      expect(typeof response.body.paid).toBe('number');
      expect(typeof response.body.activeSlots).toBe('number');
      expect(typeof response.body.totalBookings).toBe('number');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/summary');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/earnings/transactions', () => {
    it('should return transactions with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/transactions')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/transactions?page=1&limit=2')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(response.body.transactions.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/transactions?status=completed')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      response.body.transactions.forEach((t) => {
        expect(t.status).toBe('completed');
      });
    });

    it('should filter by pending status', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/transactions?status=pending')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      response.body.transactions.forEach((t) => {
        expect(t.status).toBe('pending');
      });
    });

    it('should filter by paid_out status', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/transactions?status=paid_out')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      response.body.transactions.forEach((t) => {
        expect(t.status).toBe('paid_out');
      });
    });

    it('should return empty array for unknown status', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/transactions?status=nonexistent')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(response.body.transactions.length).toBe(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/transactions');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/earnings/analytics', () => {
    it('should return analytics data with default period', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/analytics')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('weekly');
      expect(response.body).toHaveProperty('monthly');
      expect(response.body).toHaveProperty('topSlots');
      expect(response.body).toHaveProperty('averagePerBooking');
      expect(response.body).toHaveProperty('peakHour');
      expect(response.body.period).toBe('monthly');
    });

    it('should return weekly analytics when period=weekly', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/analytics?period=weekly')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(response.body.period).toBe('weekly');
      expect(Array.isArray(response.body.weekly)).toBe(true);
    });

    it('should return monthly analytics when period=monthly', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/analytics?period=monthly')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(response.body.period).toBe('monthly');
      expect(Array.isArray(response.body.monthly)).toBe(true);
    });

    it('should include top slots data', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/analytics')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.topSlots)).toBe(true);
      response.body.topSlots.forEach((slot) => {
        expect(slot).toHaveProperty('slotId');
        expect(slot).toHaveProperty('slotName');
        expect(slot).toHaveProperty('earnings');
        expect(slot).toHaveProperty('bookings');
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v1/earnings/analytics');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/earnings/payout', () => {
    it('should request a payout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/earnings/payout')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          amount: 1000,
          method: 'gcash',
          accountDetails: { number: '09171234567' },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('payout');
      expect(response.body.payout.amount).toBe(1000);
      expect(response.body.payout.method).toBe('gcash');
      expect(response.body.payout.status).toBe('processing');
      expect(response.body.payout).toHaveProperty('referenceNumber');
      expect(response.body.payout).toHaveProperty('estimatedArrival');
    });

    it('should return 400 for missing amount', async () => {
      const response = await request(app)
        .post('/api/v1/earnings/payout')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          method: 'gcash',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/amount/i);
    });

    it('should return 400 for zero amount', async () => {
      const response = await request(app)
        .post('/api/v1/earnings/payout')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          amount: 0,
          method: 'gcash',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/amount/i);
    });

    it('should return 400 for negative amount', async () => {
      const response = await request(app)
        .post('/api/v1/earnings/payout')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          amount: -100,
          method: 'gcash',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/amount/i);
    });

    it('should return 400 for missing method', async () => {
      const response = await request(app)
        .post('/api/v1/earnings/payout')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          amount: 1000,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/method/i);
    });

    it('should return 400 for amount exceeding available balance', async () => {
      const response = await request(app)
        .post('/api/v1/earnings/payout')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          amount: 999999999,
          method: 'gcash',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/insufficient/i);
      expect(response.body).toHaveProperty('availableBalance');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/earnings/payout')
        .send({
          amount: 1000,
          method: 'gcash',
        });

      expect(response.status).toBe(401);
    });
  });
});
