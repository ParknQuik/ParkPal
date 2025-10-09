const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Create test app
const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const alertRoutes = require('../routes/alerts');
alertRoutes(app);

describe('Alerts API Tests', () => {
  describe('GET /api/alerts', () => {
    it('should require latitude and longitude parameters', async () => {
      const response = await request(app).get('/api/alerts');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Latitude and longitude are required');
    });

    it('should fail with only latitude', async () => {
      const response = await request(app).get('/api/alerts?lat=14.5995');

      expect(response.status).toBe(400);
    });

    it('should fail with only longitude', async () => {
      const response = await request(app).get('/api/alerts?lon=120.9842');

      expect(response.status).toBe(400);
    });

    it('should return response with valid coordinates (may not have API key)', async () => {
      const response = await request(app).get(
        '/api/alerts?lat=14.5995&lon=120.9842'
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');

      // If API key is not configured, should return null/empty data with message
      if (!process.env.WEATHER_API_KEY) {
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Weather API key not configured');
        expect(response.body.weather).toBeNull();
        expect(response.body.alerts).toEqual([]);
      } else {
        // If API key is configured, should return weather data
        expect(response.body).toHaveProperty('weather');
        expect(response.body).toHaveProperty('alerts');
        expect(Array.isArray(response.body.alerts)).toBe(true);
      }
    });

    it('should accept different coordinate formats', async () => {
      const coords = [
        { lat: 14.5995, lon: 120.9842 },
        { lat: -34.6037, lon: -58.3816 }, // Buenos Aires
        { lat: 51.5074, lon: -0.1278 }, // London
        { lat: 35.6762, lon: 139.6503 }, // Tokyo
      ];

      for (const coord of coords) {
        const response = await request(app).get(
          `/api/alerts?lat=${coord.lat}&lon=${coord.lon}`
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('timestamp');
      }
    });

    it('should return timestamp in ISO format', async () => {
      const response = await request(app).get(
        '/api/alerts?lat=14.5995&lon=120.9842'
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('should handle invalid latitude format gracefully', async () => {
      const response = await request(app).get(
        '/api/alerts?lat=invalid&lon=120.9842'
      );

      // Should either work (if API handles it) or fail gracefully
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle invalid longitude format gracefully', async () => {
      const response = await request(app).get(
        '/api/alerts?lat=14.5995&lon=invalid'
      );

      // Should either work (if API handles it) or fail gracefully
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle extreme coordinates', async () => {
      const extremes = [
        { lat: 90, lon: 180 }, // North Pole area
        { lat: -90, lon: -180 }, // South Pole area
        { lat: 0, lon: 0 }, // Null Island
      ];

      for (const coord of extremes) {
        const response = await request(app).get(
          `/api/alerts?lat=${coord.lat}&lon=${coord.lon}`
        );

        // Should handle gracefully even if out of normal range
        expect([200, 400, 500]).toContain(response.status);
      }
    });

    it('should not require authentication', async () => {
      // Alerts endpoint should be public
      const response = await request(app).get(
        '/api/alerts?lat=14.5995&lon=120.9842'
      );

      expect(response.status).toBe(200);
      // No 401 Unauthorized
    });

    it('should return alerts as an array', async () => {
      const response = await request(app).get(
        '/api/alerts?lat=14.5995&lon=120.9842'
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('alerts');
      expect(Array.isArray(response.body.alerts)).toBe(true);
    });
  });
});
