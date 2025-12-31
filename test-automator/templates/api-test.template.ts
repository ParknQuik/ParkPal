import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('API Endpoint: /api/v1/resource', () => {
  let authToken: string;
  let testUserId: string;
  let testResourceId: string;

  // Setup: Create test data
  beforeAll(async () => {
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        phoneNumber: '+639171234567',
      });

    authToken = registerResponse.body.token;
    testUserId = registerResponse.body.user.id;
  });

  // Cleanup: Remove test data
  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' },
    });

    await prisma.$disconnect();
  });

  // Reset state before each test
  beforeEach(async () => {
    // Reset any modified state
  });

  describe('GET /api/v1/resource', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/resource')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return resources for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/resource?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should support filtering', async () => {
      const response = await request(app)
        .get('/api/v1/resource?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.forEach((item: any) => {
        expect(item.status).toBe('active');
      });
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/v1/resource?sortBy=createdAt&order=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const dates = response.body.map((item: any) => new Date(item.createdAt));
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i + 1].getTime());
      }
    });
  });

  describe('GET /api/v1/resource/:id', () => {
    beforeEach(async () => {
      // Create test resource
      const createResponse = await request(app)
        .post('/api/v1/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Resource' });

      testResourceId = createResponse.body.id;
    });

    it('should return resource by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/resource/${testResourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testResourceId);
      expect(response.body.name).toBe('Test Resource');
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .get('/api/v1/resource/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Resource not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/v1/resource/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/resource', () => {
    it('should create new resource', async () => {
      const resourceData = {
        name: 'New Resource',
        description: 'Test description',
        price: 100,
      };

      const response = await request(app)
        .post('/api/v1/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .send(resourceData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(resourceData.name);
      expect(response.body.price).toBe(resourceData.price);

      // Cleanup
      testResourceId = response.body.id;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should validate field types', async () => {
      const response = await request(app)
        .post('/api/v1/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          price: 'invalid-price', // Should be number
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle duplicate entries', async () => {
      const resourceData = { name: 'Unique Resource' };

      // Create first resource
      await request(app)
        .post('/api/v1/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .send(resourceData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v1/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .send(resourceData)
        .expect(409);

      expect(response.body.error).toMatch(/already exists/i);
    });
  });

  describe('PUT /api/v1/resource/:id', () => {
    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Original Name' });

      testResourceId = createResponse.body.id;
    });

    it('should update resource', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/v1/resource/${testResourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });

    it('should return 404 for non-existent resource', async () => {
      await request(app)
        .put('/api/v1/resource/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put(`/api/v1/resource/${testResourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ price: -100 }) // Invalid price
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/v1/resource/:id', () => {
    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'To Be Deleted' });

      testResourceId = createResponse.body.id;
    });

    it('should delete resource', async () => {
      await request(app)
        .delete(`/api/v1/resource/${testResourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/api/v1/resource/${testResourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent resource', async () => {
      await request(app)
        .delete('/api/v1/resource/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make multiple requests quickly
      const requests = Array(100).fill(null).map(() =>
        request(app)
          .get('/api/v1/resource')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/v1/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // 500ms threshold
    });
  });
});
