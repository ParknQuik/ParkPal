const request = require('supertest');
const app = require('../index');
const prisma = require('../config/prisma');
const crypto = require('crypto');

describe('Password Reset Flow', () => {
  let testUser;
  let resetToken;

  beforeAll(async () => {
    // Clean up any existing test users
    await prisma.user.deleteMany({
      where: { email: 'test-reset@example.com' }
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test-reset@example.com',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz', // Hashed password
        role: 'driver'
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: 'test-reset@example.com' }
    });
    await prisma.$disconnect();
  });

  // Add delay between tests to avoid rate limiting
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should accept valid email and return success message', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('password reset link has been sent');

      // Verify token was saved in database
      const updatedUser = await prisma.user.findUnique({
        where: { email: testUser.email }
      });

      expect(updatedUser.resetPasswordToken).toBeTruthy();
      expect(updatedUser.resetPasswordToken).toHaveLength(64);
      expect(updatedUser.resetPasswordExpires).toBeTruthy();
      expect(new Date(updatedUser.resetPasswordExpires).getTime()).toBeGreaterThan(Date.now());

      // Verify email service was called (in test mode, using fallback logger)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Password reset email sent:'),
        expect.any(String)
      );

      consoleSpy.mockRestore();

      // Save token for next test
      resetToken = updatedUser.resetPasswordToken;
    });

    it('should return success message even for non-existent email (security)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('password reset link has been sent');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it.skip('should rate limit excessive requests', async () => {
      // Note: Rate limiting is bypassed in test environment (NODE_ENV=test)
      // This test would only work in production/staging
      // Make multiple rapid requests
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/v1/auth/forgot-password')
            .send({ email: testUser.email })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      // Generate fresh token for this test
      const validToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetPasswordToken: validToken,
          resetPasswordExpires: new Date(Date.now() + 3600000)
        }
      });

      const newPassword = 'NewPassword123!';

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: validToken,
          newPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password reset successfully');

      // Verify token was cleared
      const updatedUser = await prisma.user.findUnique({
        where: { email: testUser.email }
      });

      expect(updatedUser.resetPasswordToken).toBeNull();
      expect(updatedUser.resetPasswordExpires).toBeNull();

      // Verify user can login with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeTruthy();
    });

    it('should reject invalid token', async () => {
      // Generate a token that's 64 chars but not in DB
      const invalidToken = crypto.randomBytes(32).toString('hex');

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: invalidToken,
          newPassword: 'NewPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('should reject expired token', async () => {
      // Create expired token
      const expiredToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetPasswordToken: expiredToken,
          resetPasswordExpires: new Date(Date.now() - 3600000) // 1 hour ago
        }
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: expiredToken,
          newPassword: 'NewPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('expired');
    });

    it('should reject weak password', async () => {
      // Generate new valid token
      const validToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetPasswordToken: validToken,
          resetPasswordExpires: new Date(Date.now() + 3600000)
        }
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'weak' // Too short, no uppercase, no number
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('should reject password without uppercase', async () => {
      const validToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetPasswordToken: validToken,
          resetPasswordExpires: new Date(Date.now() + 3600000)
        }
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'nouppercase123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('should reject password without number', async () => {
      const validToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetPasswordToken: validToken,
          resetPasswordExpires: new Date(Date.now() + 3600000)
        }
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'NoNumbersHere'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('should reject missing token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          newPassword: 'NewPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'some_token_here'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });
  });

  describe('Security Tests', () => {
    it('should generate unique tokens for each request', async () => {
      const tokens = [];

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({ email: testUser.email });

        const user = await prisma.user.findUnique({
          where: { email: testUser.email }
        });

        tokens.push(user.resetPasswordToken);
      }

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it('should not allow token reuse after successful reset', async () => {
      // Generate token
      const validToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          resetPasswordToken: validToken,
          resetPasswordExpires: new Date(Date.now() + 3600000)
        }
      });

      // First reset (should succeed)
      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'FirstPassword123!'
        });

      // Try to reuse same token (should fail)
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'SecondPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid or expired');
    });

    it('should invalidate old token when new one is requested', async () => {
      // Request first token
      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email });

      const user1 = await prisma.user.findUnique({
        where: { email: testUser.email }
      });
      const firstToken = user1.resetPasswordToken;

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));

      // Request second token
      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email });

      const user2 = await prisma.user.findUnique({
        where: { email: testUser.email }
      });
      const secondToken = user2.resetPasswordToken;

      // Tokens should be different
      expect(firstToken).not.toBe(secondToken);

      // First token should not work
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: firstToken,
          newPassword: 'NewPassword123!'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full password reset flow', async () => {
      // 1. User forgets password
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email });

      expect(forgotRes.status).toBe(200);

      // 2. Get token from database (simulating email click)
      const user = await prisma.user.findUnique({
        where: { email: testUser.email }
      });
      const token = user.resetPasswordToken;

      // 3. User resets password
      const newPassword = 'BrandNewPassword123!';
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token, newPassword });

      expect(resetRes.status).toBe(200);

      // 4. User logs in with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeTruthy();
      expect(loginRes.body.user.email).toBe(testUser.email);
    });
  });
});
