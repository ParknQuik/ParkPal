const request = require('supertest');
const express = require('express');
const cors = require('cors');
const {
  setupTestDatabase,
  teardownTestDatabase,
  prisma,
} = require('./setup');

jest.mock('axios');
const axios = require('axios');

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

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

beforeAll(async () => {
  testData = await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(() => {
  axios.get.mockReset();
  axios.post?.mockReset?.();
  mockVerifyIdToken.mockReset();
});

describe('Google Auth API', () => {
  describe('POST /api/v1/auth/google', () => {
    it('should return 400 when googleToken is missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/google token/i);
    });

    it('should return 401 for invalid google token', async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({ googleToken: 'invalid-token-12345' });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid google token/i);
    });

    it('should authenticate with a valid id_token', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: 'google-id-12345',
          email: 'googleuser@example.com',
          name: 'Google User',
          picture: 'https://example.com/photo.jpg',
        }),
      });

      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({ googleToken: 'valid-id-token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('googleuser@example.com');
      expect(response.body.user.name).toBe('Google User');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('role');
    });

    it('should link google account to existing user by email', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: 'google-id-existing',
          email: 'test-driver@example.com',
          name: 'Test Driver',
          picture: 'https://example.com/new-photo.jpg',
        }),
      });

      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({ googleToken: 'valid-id-token-existing' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test-driver@example.com');
      expect(response.body.user.id).toBe(testData.users.driver.id);
    });

    it('should return JWT token on success', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: 'google-id-jwt-test',
          email: 'jwt-test@example.com',
          name: 'JWT Test',
        }),
      });

      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({ googleToken: 'valid-jwt-token' });

      expect(response.status).toBe(200);
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
    });

    it('should exchange an authorization code and authenticate with returned id_token', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          id_token: 'server-id-token',
          access_token: 'server-access-token',
        },
      });
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: 'google-code-id',
          email: 'code-user@example.com',
          name: 'Code User',
        }),
      });

      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({ code: 'valid-auth-code' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('code-user@example.com');
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(mockVerifyIdToken).toHaveBeenCalledWith(
        expect.objectContaining({ idToken: 'server-id-token' })
      );
    });

    it('should return 401 when both id_token and access_token fail', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Verification failed'));

      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({ googleToken: 'bad-token-both-fail' });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid google token/i);
    });

    it('should return 401 when google response has no sub', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          email: 'no-sub@example.com',
          name: 'No Sub User',
        }),
      });

      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({ googleToken: 'no-sub-token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid google token payload/i);
    });
  });
});
