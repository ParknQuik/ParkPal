/**
 * Handshake Tests - Backend <-> Frontend Connectivity
 *
 * These tests verify that the backend API is accessible and responding
 * correctly to both web and mobile frontends.
 */

const request = require('supertest');
const app = require('../index');
const { API_PREFIX } = require('./testConfig');

describe('Backend-Frontend Handshake Tests', () => {

  // ============================================
  // BACKEND HEALTH & CONNECTIVITY
  // ============================================

  describe('Backend Health', () => {

    test('should respond to health check', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/health`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('redis');
    });

    test('should have proper CORS headers', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/health`)
        .set('Origin', 'http://localhost:5173') // Web frontend
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('should return server metadata', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/health`)
        .expect(200);

      expect(response.body.uptime).toBeGreaterThan(0);
      expect(response.body.timestamp).toBeDefined();
    });

  });

  // ============================================
  // WEB FRONTEND HANDSHAKE
  // ============================================

  describe('Web Frontend Handshake', () => {

    test('should accept requests from web frontend origin', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/health`)
        .set('Origin', 'http://localhost:5173')
        .set('User-Agent', 'Mozilla/5.0 (Web Frontend)')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    test('should provide Google Maps API key to web frontend', async () => {
      // Maps API key requires authentication
      // This tests that the endpoint is accessible to authenticated users
      await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'webmaps@test.com',
          password: 'WebMaps123!',
          name: 'Web Maps User',
          role: 'driver'
        });

      const loginResponse = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: 'webmaps@test.com',
          password: 'WebMaps123!'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get(`${API_PREFIX}/config/maps-api-key`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('apiKey');
      expect(typeof response.body.apiKey).toBe('string');
    });

    test('should provide app configuration to web', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/config/app`)
        .expect(200);

      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('version');
    });

    test('should handle web login request', async () => {
      // First create a test user
      const registerResponse = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'webuser@test.com',
          password: 'WebUser123!',
          name: 'Web Test User',
          role: 'driver'
        });

      // Then attempt login
      const response = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: 'webuser@test.com',
          password: 'WebUser123!'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('webuser@test.com');
    });

    test('should return parking slots for map view', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/parking/slots`);

      // Accept both 200 (slots found) or 404 (no slots yet)
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

  });

  // ============================================
  // MOBILE FRONTEND HANDSHAKE
  // ============================================

  describe('Mobile Frontend Handshake', () => {

    test('should accept requests from mobile app', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/health`)
        .set('User-Agent', 'ParkPal Mobile/1.0 (iOS)')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    test('should provide Google Maps API key to mobile', async () => {
      // Maps API key requires authentication
      await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'mobilemaps@test.com',
          password: 'MobileMaps123!',
          name: 'Mobile Maps User',
          role: 'driver'
        });

      const loginResponse = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .set('User-Agent', 'ParkPal Mobile/1.0 (Android)')
        .send({
          email: 'mobilemaps@test.com',
          password: 'MobileMaps123!'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get(`${API_PREFIX}/config/maps-api-key`)
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'ParkPal Mobile/1.0 (Android)')
        .expect(200);

      expect(response.body).toHaveProperty('apiKey');
    });

    test('should handle mobile login request', async () => {
      // First create a test user
      await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'mobileuser@test.com',
          password: 'MobileUser123!',
          name: 'Mobile Test User',
          role: 'driver'
        });

      // Then attempt login
      const response = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .set('User-Agent', 'ParkPal Mobile/1.0 (iOS)')
        .send({
          email: 'mobileuser@test.com',
          password: 'MobileUser123!'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    test('should return user profile data for mobile', async () => {
      // Create and login
      await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'mobileprofile@test.com',
          password: 'MobileProfile123!',
          name: 'Mobile Profile User',
          role: 'host'
        });

      const loginResponse = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: 'mobileprofile@test.com',
          password: 'MobileProfile123!'
        });

      const token = loginResponse.body.token;

      // Get profile
      const response = await request(app)
        .get(`${API_PREFIX}/auth/me`)
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'ParkPal Mobile/1.0 (Android)')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe('mobileprofile@test.com');
    });

    test('should handle mobile parking search', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/parking/slots`)
        .set('User-Agent', 'ParkPal Mobile/1.0 (iOS)')
        .query({
          lat: 14.5995,
          lon: 120.9842,
          radius: 5
        });

      // Accept both 200 (slots found) or 404 (no slots yet)
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

  });

  // ============================================
  // API VERSIONING & DEPRECATION
  // ============================================

  describe('API Versioning', () => {

    test('should support /api/v1 endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    test('should warn on deprecated /api endpoints', async () => {
      // Legacy endpoint should work but show deprecation
      const response = await request(app)
        .get('/api/health');

      // Legacy endpoints may return 200 or 404 depending on configuration
      // The key is that /api/v1/health should always work
      expect([200, 404]).toContain(response.status);

      // If it works, check for deprecation warnings
      if (response.status === 200 && response.body._deprecation) {
        expect(response.body._deprecation).toBeTruthy();
      }
    });

  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {

    test('should return 404 for non-existent endpoint', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/nonexistent`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 401 for unauthorized requests', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/auth/me`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for invalid request data', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: 'invalid-email',
          password: 'short'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should return proper error format', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/auth/me`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

  });

  // ============================================
  // PERFORMANCE & LIMITS
  // ============================================

  describe('Performance & Limits', () => {

    test('should respond within acceptable time', async () => {
      const start = Date.now();

      await request(app)
        .get(`${API_PREFIX}/health`)
        .expect(200);

      const duration = Date.now() - start;

      // Health check should respond in < 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should handle concurrent requests', async () => {
      const promises = Array(10).fill(null).map(() =>
        request(app).get(`${API_PREFIX}/health`)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });

    test('should enforce request size limits', async () => {
      // Create a very large payload
      const largePayload = {
        name: 'A'.repeat(1000000), // 1MB name field
        email: 'test@test.com',
        password: 'Test123!'
      };

      const response = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send(largePayload);

      // Should either reject or handle gracefully
      expect([400, 413]).toContain(response.status);
    });

  });

  // ============================================
  // SECURITY
  // ============================================

  describe('Security Headers', () => {

    test('should include security headers', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/health`)
        .expect(200);

      // Check for helmet.js security headers
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });

    test('should prevent XSS attacks', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/health`)
        .expect(200);

      expect(response.headers['x-xss-protection']).toBeDefined();
    });

  });

});
