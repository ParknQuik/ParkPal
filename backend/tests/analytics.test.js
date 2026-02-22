/**
 * Analytics API Routes Tests
 * Tests for Service 1 - Smart Parking Analytics endpoints
 */

const request = require('supertest');
const app = require('../index');
const { PrismaClient } = require('@prisma/client');
const { setupTestDatabase, teardownTestDatabase } = require('./setup');
const ParkingSessionTracking = require('../services/parkingSessionTracking');

const prisma = new PrismaClient();

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
  await prisma.$disconnect();
});

describe('Analytics API Routes', () => {
  let testUser;
  let testZone;

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'hashed_password_for_test',
        role: 'driver'
      }
    });

    // Create test zone with geofence
    testZone = await prisma.zone.create({
      data: {
        name: 'Test Zone',
        type: 'commercial',
        address: '123 Test St',
        city: 'Manila',
        centerLat: 14.5312,
        centerLon: 120.9844,
        radiusMeters: 500,
        totalCapacity: 100,
        pricePerHour: 50.00,
        isActive: true,
        geofencePolygon: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [120.9819, 14.5337],
              [120.9869, 14.5337],
              [120.9869, 14.5287],
              [120.9819, 14.5287],
              [120.9819, 14.5337]
            ]
          ]
        })
      }
    });
  });

  afterEach(async () => {
    // Clean up in reverse order of dependencies
    await prisma.activityEvent.deleteMany();
    await prisma.parkingSession.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/v1/analytics/zone/enter', () => {
    it('should create a new parking session when user enters zone', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/zone/enter')
        .send({
          userId: testUser.id,
          zoneId: testZone.id,
          latitude: 14.5312,
          longitude: 120.9844
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('circlingStartTime');
      expect(response.body.zoneId).toBe(testZone.id);
      expect(response.body.message).toBe('Circling timer started');
    });

    it('should return existing session if user already has active session', async () => {
      // Create first session
      const firstResponse = await request(app)
        .post('/api/v1/analytics/zone/enter')
        .send({
          userId: testUser.id,
          zoneId: testZone.id,
          latitude: 14.5312,
          longitude: 120.9844
        });

      const firstSessionId = firstResponse.body.sessionId;

      // Try to create second session
      const secondResponse = await request(app)
        .post('/api/v1/analytics/zone/enter')
        .send({
          userId: testUser.id,
          zoneId: testZone.id,
          latitude: 14.5312,
          longitude: 120.9844
        });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.sessionId).toBe(firstSessionId);
      expect(secondResponse.body.message).toBe('Active session already exists');
    });

    it('should return 404 if zone does not exist', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/zone/enter')
        .send({
          userId: testUser.id,
          zoneId: 99999,
          latitude: 14.5312,
          longitude: 120.9844
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Zone not found');
    });

    it('should return 400 if location is outside zone boundaries', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/zone/enter')
        .send({
          userId: testUser.id,
          zoneId: testZone.id,
          latitude: 14.9000, // Far outside zone
          longitude: 121.5000
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Location is not within zone boundaries');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/zone/enter')
        .send({
          userId: testUser.id,
          zoneId: testZone.id
          // Missing latitude and longitude
        });

      expect(response.status).toBe(400);
    });

    it('should validate coordinates are in valid range', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/zone/enter')
        .send({
          userId: testUser.id,
          zoneId: testZone.id,
          latitude: 91, // Invalid: > 90
          longitude: 120.9844
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/analytics/activity', () => {
    let testSession;

    beforeEach(async () => {
      // Create a session first
      testSession = await ParkingSessionTracking.startZoneSession(
        testUser.id,
        testZone.id,
        14.5312,
        120.9844
      );
    });

    it('should log activity update successfully', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/activity')
        .send({
          userId: testUser.id,
          sessionId: testSession.id,
          activityType: 'IN_VEHICLE',
          confidence: 85,
          latitude: 14.5312,
          longitude: 120.9844
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('activityEventId');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toBe('logged');
    });

    it('should accept activity without coordinates', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/activity')
        .send({
          userId: testUser.id,
          sessionId: testSession.id,
          activityType: 'STILL',
          confidence: 90
          // No latitude/longitude
        });

      expect(response.status).toBe(201);
    });

    it('should return 400 for invalid activity type', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/activity')
        .send({
          userId: testUser.id,
          sessionId: testSession.id,
          activityType: 'INVALID_TYPE',
          confidence: 85
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for confidence outside 0-100 range', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/activity')
        .send({
          userId: testUser.id,
          sessionId: testSession.id,
          activityType: 'STILL',
          confidence: 150 // Invalid: > 100
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/activity')
        .send({
          userId: testUser.id,
          sessionId: testSession.id
          // Missing activityType and confidence
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/analytics/zone/exit', () => {
    let testSession;

    beforeEach(async () => {
      testSession = await ParkingSessionTracking.startZoneSession(
        testUser.id,
        testZone.id,
        14.5312,
        120.9844
      );
    });

    it('should handle zone exit successfully', async () => {
      const exitTime = new Date().toISOString();

      const response = await request(app)
        .post('/api/v1/analytics/zone/exit')
        .send({
          sessionId: testSession.id,
          exitTime,
          parked: true
        });

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe(testSession.id);
      expect(response.body.status).toBe('completed');
      expect(response.body).toHaveProperty('exitTime');
    });

    it('should handle exit without explicit exit time', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/zone/exit')
        .send({
          sessionId: testSession.id
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('exitTime');
    });

    it('should return 400 if sessionId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/zone/exit')
        .send({
          exitTime: new Date().toISOString()
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/analytics/zones/:zoneId/availability', () => {
    beforeEach(async () => {
      // Create some parking slots
      await prisma.parkingSlot.createMany({
        data: [
          {
            zoneId: testZone.id,
            slotNumber: '1',
            status: 'available',
            isActive: true,
            lat: 14.5312,
            lon: 120.9844,
            address: '123 Test St, Manila',
            slotType: 'commercial_iot',
            price: 50.00
          },
          {
            zoneId: testZone.id,
            slotNumber: '2',
            status: 'occupied',
            isActive: true,
            lat: 14.5313,
            lon: 120.9845,
            address: '123 Test St, Manila',
            slotType: 'commercial_iot',
            price: 50.00
          },
          {
            zoneId: testZone.id,
            slotNumber: '3',
            status: 'available',
            isActive: true,
            lat: 14.5314,
            lon: 120.9846,
            address: '123 Test St, Manila',
            slotType: 'commercial_iot',
            price: 50.00
          }
        ]
      });
    });

    afterEach(async () => {
      await prisma.parkingSlot.deleteMany();
    });

    it('should return zone availability with occupancy stats', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/zones/${testZone.id}/availability`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('zoneId', testZone.id);
      expect(response.body).toHaveProperty('name', 'Test Zone');
      expect(response.body).toHaveProperty('totalSlots', 3);
      expect(response.body).toHaveProperty('occupied', 1);
      expect(response.body).toHaveProperty('available', 2);
      expect(response.body).toHaveProperty('occupancyPercentage');
      expect(response.body).toHaveProperty('estimatedCirclingTime');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent zone', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/zones/99999/availability');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Zone not found');
    });
  });

  describe('GET /api/v1/analytics/zones/:zoneId/metrics', () => {
    beforeEach(async () => {
      // Create some metrics
      await prisma.zoneMetrics.createMany({
        data: [
          {
            zoneId: testZone.id,
            periodType: 'hourly',
            timestamp: new Date(),
            totalSlots: 100,
            occupiedSlots: 75,
            availableSlots: 25,
            avgCirclingTimeSeconds: 300,
            minCirclingTimeSeconds: 120,
            maxCirclingTimeSeconds: 600,
            occupancyPercentage: 75.5,
            totalSessions: 10,
            totalRevenue: 500.00
          },
          {
            zoneId: testZone.id,
            periodType: 'hourly',
            timestamp: new Date(Date.now() - 3600000),
            totalSlots: 100,
            occupiedSlots: 80,
            availableSlots: 20,
            avgCirclingTimeSeconds: 350,
            minCirclingTimeSeconds: 150,
            maxCirclingTimeSeconds: 650,
            occupancyPercentage: 80.0,
            totalSessions: 12,
            totalRevenue: 600.00
          }
        ]
      });
    });

    afterEach(async () => {
      await prisma.zoneMetrics.deleteMany();
    });

    it('should return zone metrics with default parameters', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/zones/${testZone.id}/metrics`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('zoneId', testZone.id);
      expect(response.body).toHaveProperty('zoneName', 'Test Zone');
      expect(response.body).toHaveProperty('period', 'hourly');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.metrics)).toBe(true);
      expect(response.body.metrics.length).toBeGreaterThan(0);
    });

    it('should filter metrics by date range', async () => {
      const from = new Date(Date.now() - 7200000).toISOString();
      const to = new Date().toISOString();

      const response = await request(app)
        .get(`/api/v1/analytics/zones/${testZone.id}/metrics`)
        .query({ from, to });

      expect(response.status).toBe(200);
      expect(response.body.metrics.length).toBeLessThanOrEqual(2);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/zones/${testZone.id}/metrics`)
        .query({ limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.metrics.length).toBe(1);
    });

    it('should return 404 for non-existent zone', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/zones/99999/metrics');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/analytics/sessions/:sessionId', () => {
    let testSession;

    beforeEach(async () => {
      testSession = await ParkingSessionTracking.startZoneSession(
        testUser.id,
        testZone.id,
        14.5312,
        120.9844
      );

      // Add some activity events
      await ParkingSessionTracking.logActivity(
        testUser.id,
        testSession.id,
        'IN_VEHICLE',
        85,
        14.5312,
        120.9844
      );
    });

    it('should return session details with activities', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/sessions/${testSession.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId', testSession.id);
      expect(response.body).toHaveProperty('userId', testUser.id);
      expect(response.body).toHaveProperty('zone');
      expect(response.body.zone.id).toBe(testZone.id);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('activityCount');
      expect(Array.isArray(response.body.recentActivities)).toBe(true);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/sessions/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Session not found');
    });
  });

  describe('GET /api/v1/analytics/zones', () => {
    beforeEach(async () => {
      // Create additional zones
      await prisma.zone.createMany({
        data: [
          {
            name: 'Zone 2',
            type: 'residential',
            address: '456 Test Ave',
            city: 'Manila',
            centerLat: 14.5400,
            centerLon: 120.9900,
            radiusMeters: 300,
            totalCapacity: 50,
            pricePerHour: 30.00,
            isActive: true,
            geofencePolygon: JSON.stringify({
              type: 'Polygon',
              coordinates: [[[120.9850, 14.5380], [120.9950, 14.5380], [120.9950, 14.5420], [120.9850, 14.5420], [120.9850, 14.5380]]]
            })
          },
          {
            name: 'Zone 3',
            type: 'roadside',
            address: '789 Test Rd',
            city: 'Quezon City',
            centerLat: 14.6000,
            centerLon: 121.0000,
            radiusMeters: 200,
            totalCapacity: 30,
            pricePerHour: 40.00,
            isActive: false,
            geofencePolygon: JSON.stringify({
              type: 'Polygon',
              coordinates: [[[120.9980, 14.5980], [121.0020, 14.5980], [121.0020, 14.6020], [120.9980, 14.6020], [120.9980, 14.5980]]]
            })
          }
        ]
      });
    });

    it('should return list of all active zones by default', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/zones');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.zones)).toBe(true);
      // Should only return active zones (testZone + Zone 2 = 2)
      expect(response.body.zones.length).toBe(2);
    });

    it('should filter zones by city', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/zones')
        .query({ city: 'Manila' });

      expect(response.status).toBe(200);
      expect(response.body.zones.length).toBe(2);
      expect(response.body.zones.every(z => z.city === 'Manila')).toBe(true);
    });

    it('should filter zones by type', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/zones')
        .query({ type: 'commercial' });

      expect(response.status).toBe(200);
      expect(response.body.zones.length).toBe(1);
      expect(response.body.zones[0].type).toBe('commercial');
    });

    it('should include inactive zones when requested', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/zones')
        .query({ isActive: 'false' });

      expect(response.status).toBe(200);
      expect(response.body.zones.length).toBe(1);
      expect(response.body.zones[0].name).toBe('Zone 3');
    });
  });
});
