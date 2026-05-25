const request = require('supertest');
const express = require('express');
const cors = require('cors');
const {
  setupTestDatabase,
  teardownTestDatabase,
  prisma,
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
let driverToken;

beforeAll(async () => {
  testData = await setupTestDatabase();

  const driverLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'test-driver@example.com',
      password: 'testpass123',
    });

  driverToken = driverLogin.body.token;
});

afterAll(async () => {
  await teardownTestDatabase();
});

describe('User API Tests', () => {
  beforeEach(async () => {
    await prisma.user.update({
      where: { id: testData.users.driver.id },
      data: {
        noShowCount: 0,
        lateCancelCount: 0,
        suspendedUntil: null,
        lastStrikeAt: null,
      },
    });
  });

  describe('GET /api/v1/users/behavior-status', () => {
    it('returns good standing with no strikes', async () => {
      const response = await request(app)
        .get('/api/v1/users/behavior-status')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        noShowCount: 0,
        lateCancelCount: 0,
        totalStrikes: 0,
        isSuspended: false,
        suspendedUntil: null,
        lastStrikeAt: null,
        strikeResetDays: 60,
      });
      expect(response.body.policySummary.noShow).toContain('missed open-time check-ins');
    });

    it('returns warning state with one strike', async () => {
      const lastStrikeAt = new Date();
      await prisma.user.update({
        where: { id: testData.users.driver.id },
        data: {
          noShowCount: 1,
          lastStrikeAt,
        },
      });

      const response = await request(app)
        .get('/api/v1/users/behavior-status')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        noShowCount: 1,
        lateCancelCount: 0,
        totalStrikes: 1,
        isSuspended: false,
      });
      expect(response.body.lastStrikeAt).toBe(lastStrikeAt.toISOString());
    });

    it('derives total strikes from mixed strike counts', async () => {
      await prisma.user.update({
        where: { id: testData.users.driver.id },
        data: {
          noShowCount: 1,
          lateCancelCount: 2,
          lastStrikeAt: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/v1/users/behavior-status')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.noShowCount).toBe(1);
      expect(response.body.lateCancelCount).toBe(2);
      expect(response.body.totalStrikes).toBe(3);
    });

    it('returns expired suspension as not actively suspended', async () => {
      const suspendedUntil = new Date(Date.now() - 60 * 1000);
      await prisma.user.update({
        where: { id: testData.users.driver.id },
        data: {
          noShowCount: 2,
          suspendedUntil,
          lastStrikeAt: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/v1/users/behavior-status')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalStrikes).toBe(2);
      expect(response.body.isSuspended).toBe(false);
      expect(response.body.suspendedUntil).toBe(suspendedUntil.toISOString());
    });

    it('returns active suspension with the suspension end time', async () => {
      const suspendedUntil = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: testData.users.driver.id },
        data: {
          noShowCount: 1,
          lateCancelCount: 1,
          suspendedUntil,
          lastStrikeAt: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/v1/users/behavior-status')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        noShowCount: 1,
        lateCancelCount: 1,
        totalStrikes: 2,
        isSuspended: true,
      });
      expect(response.body.suspendedUntil).toBe(suspendedUntil.toISOString());
    });
  });
});
