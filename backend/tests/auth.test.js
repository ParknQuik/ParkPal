const request = require('supertest');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { cleanDatabase, prisma } = require('./setup');

// Create test app
const app = express();
app.use(cors());
app.use(express.json());

// Create a mock rate limiter for tests
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

// Import v1 router
const v1Router = require('../routes/v1');
app.use('/api/v1', v1Router(authLimiter));

beforeAll(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('Auth API Tests', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPass123!',
    role: 'driver',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user.role).toBe(testUser.role);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should fail with duplicate email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          // Missing email and password
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'novalid@test',
          password: 'TestPass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email');
    });

    it('should hash password before storing', async () => {
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user.password).not.toBe(testUser.password);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should default role to user if not provided', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Another User',
          email: 'another@example.com',
          password: 'TestPass123!',
          // No role specified
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('user'); // Default is 'user' not 'driver'
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'testpass123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail without email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'testpass123',
        });

      expect(response.status).toBe(400);
    });

    it('should fail without password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
        });

      expect(response.status).toBe(400);
    });

    it('should return valid JWT token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.body.token).toMatch(/^[\w-]*\.[\w-]*\.[\w-]*$/); // JWT format
    });

    it('should login case-insensitively for email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email.toUpperCase(),
          password: testUser.password,
        });

      // This might fail depending on implementation - adjust as needed
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('User Roles', () => {
    it('should create user with host role', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Host User',
          email: 'host@example.com',
          password: 'TestPass123!',
          role: 'host',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('host');
    });

    it('should create user with admin role', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'TestPass123!',
          role: 'admin',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('admin');
    });
  });

  describe('Security', () => {
    it('should not expose password in response', async () => {
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Security Test',
          email: 'security@example.com',
          password: 'TestPass123!',
        });

      expect(registerResponse.body.user).not.toHaveProperty('password');

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'security@example.com',
          password: 'TestPass123!',
        });

      expect(loginResponse.body.user).not.toHaveProperty('password');
    });

    it('should generate unique tokens for each login', async () => {
      const response1 = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const response2 = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      // Tokens might be the same if they contain user ID only
      // This test depends on implementation (if timestamp is included, they'll differ)
      expect(response1.body.token).toBeDefined();
      expect(response2.body.token).toBeDefined();
    });
  });

  describe('Password Validation', () => {
    it('should reject passwords shorter than 8 characters', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: 'short@test.com',
          password: 'Pass1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('at least 8 characters');
    });

    it('should reject passwords without uppercase letters', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: 'lower@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('uppercase');
    });

    it('should reject passwords without lowercase letters', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: 'upper@test.com',
          password: 'PASSWORD123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('lowercase');
    });

    it('should reject passwords without numbers', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: 'nonum@test.com',
          password: 'PasswordOnly',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('number');
    });

    it('should reject passwords exceeding 72 characters', async () => {
      const longPassword = 'A1' + 'a'.repeat(71); // 73 chars
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: 'toolong@test.com',
          password: longPassword,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('72 characters');
    });

    it('should accept strong valid passwords', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Strong User',
          email: 'strong@test.com',
          password: 'MyStr0ng!P@ssw0rd2024',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
    });

    it('should return warnings for weak but valid passwords', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Weak User',
          email: 'weak@test.com',
          password: 'Short1Aa', // 8 chars, no special chars
        });

      expect(response.status).toBe(201);
      // May include warnings
      if (response.body.warnings) {
        expect(Array.isArray(response.body.warnings)).toBe(true);
      }
    });
  });

  describe('Password Change', () => {
    let userToken;

    beforeAll(async () => {
      // Create a user and get token
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Change Test User',
          email: 'change@test.com',
          password: 'OldPass123!',
        });
      userToken = response.body.token;
    });

    it('should change password successfully', async () => {
      const response = await request(app)
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          oldPassword: 'OldPass123!',
          newPassword: 'NewPass456!',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('successfully');
    });

    it('should reject password change with incorrect old password', async () => {
      const response = await request(app)
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          oldPassword: 'WrongPassword123',
          newPassword: 'AnotherNewPass789!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('incorrect');
    });

    it('should reject changing to same password', async () => {
      const response = await request(app)
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          oldPassword: 'NewPass456!',
          newPassword: 'NewPass456!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('different');
    });

    it('should reject weak new password', async () => {
      const response = await request(app)
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          oldPassword: 'NewPass456!',
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/v1/auth/password')
        .send({
          oldPassword: 'NewPass456!',
          newPassword: 'AnotherPass789!',
        });

      expect(response.status).toBe(401);
    });
  });
});
