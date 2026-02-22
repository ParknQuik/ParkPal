/**
 * Parking Session Tracking Service Tests
 * Tests for circling time detection and parking confirmation
 */

const ParkingSessionTracking = require('../services/parkingSessionTracking');
const { prisma, setupTestDatabase, teardownTestDatabase } = require('./setup');

describe('ParkingSessionTracking', () => {
  let testData;

  beforeAll(async () => {
    testData = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  afterEach(async () => {
    // Clean up sessions and activities between tests
    await prisma.activityEvent.deleteMany();
    await prisma.parkingSession.deleteMany();
  });

  describe('startZoneSession', () => {
    it('should create a new parking session', async () => {
      const session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(testData.users.driver.id);
      expect(session.zoneId).toBe(testData.zone.id);
      expect(session.sessionType).toBe('commercial_activity');
      expect(session.status).toBe('searching');
      expect(session.lastActivityStatus).toBe('IN_VEHICLE');
      expect(session.zoneEntryTime).toBeDefined();
      expect(session.circlingStartTime).toBeDefined();
    });

    it('should create initial activity event', async () => {
      const session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );

      const activities = await prisma.activityEvent.findMany({
        where: { sessionId: session.id }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].activityType).toBe('IN_VEHICLE');
      expect(activities[0].confidence).toBe(90);
      expect(activities[0].latitude).toBe(14.5312);
      expect(activities[0].longitude).toBe(120.9844);
    });
  });

  describe('logActivity', () => {
    let session;

    beforeEach(async () => {
      session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );
    });

    it('should log activity event', async () => {
      const activity = await ParkingSessionTracking.logActivity(
        testData.users.driver.id,
        session.id,
        'STILL',
        85,
        14.5313,
        120.9845
      );

      expect(activity).toBeDefined();
      expect(activity.id).toBeDefined();
      expect(activity.userId).toBe(testData.users.driver.id);
      expect(activity.sessionId).toBe(session.id);
      expect(activity.activityType).toBe('STILL');
      expect(activity.confidence).toBe(85);
      expect(activity.latitude).toBe(14.5313);
      expect(activity.longitude).toBe(120.9845);
    });

    it('should update session last activity', async () => {
      await ParkingSessionTracking.logActivity(
        testData.users.driver.id,
        session.id,
        'ON_FOOT',
        90,
        14.5313,
        120.9845
      );

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: session.id }
      });

      expect(updatedSession.lastActivityStatus).toBe('ON_FOOT');
      expect(updatedSession.activityConfidenceLevel).toBe(90);
    });

    it('should handle activity without location', async () => {
      const activity = await ParkingSessionTracking.logActivity(
        testData.users.driver.id,
        session.id,
        'STILL',
        80,
        null,
        null
      );

      expect(activity).toBeDefined();
      expect(activity.latitude).toBeNull();
      expect(activity.longitude).toBeNull();
    });
  });

  describe('checkActivityPattern', () => {
    let session;

    beforeEach(async () => {
      session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );
    });

    it('should return high score for mostly STILL activities', async () => {
      // Log multiple STILL activities
      for (let i = 0; i < 5; i++) {
        await ParkingSessionTracking.logActivity(
          testData.users.driver.id,
          session.id,
          'STILL',
          85,
          14.5312,
          120.9844
        );
      }

      const score = await ParkingSessionTracking.checkActivityPattern(session.id);

      expect(score).toBeGreaterThan(0.8); // Should be high
    });

    it('should return low score for mostly IN_VEHICLE activities', async () => {
      // Log multiple IN_VEHICLE activities
      for (let i = 0; i < 5; i++) {
        await ParkingSessionTracking.logActivity(
          testData.users.driver.id,
          session.id,
          'IN_VEHICLE',
          85,
          14.5312 + (i * 0.001),
          120.9844 + (i * 0.001)
        );
      }

      const score = await ParkingSessionTracking.checkActivityPattern(session.id);

      expect(score).toBeLessThan(0.3); // Should be low
    });

    it('should return 0 for no activities', async () => {
      // Clear initial activity
      await prisma.activityEvent.deleteMany({
        where: { sessionId: session.id }
      });

      const score = await ParkingSessionTracking.checkActivityPattern(session.id);

      expect(score).toBe(0);
    });

    it('should ignore low confidence activities', async () => {
      // Log STILL with low confidence
      await ParkingSessionTracking.logActivity(
        testData.users.driver.id,
        session.id,
        'STILL',
        50, // Low confidence
        14.5312,
        120.9844
      );

      const score = await ParkingSessionTracking.checkActivityPattern(session.id);

      expect(score).toBeLessThan(0.5);
    });
  });

  describe('checkLocationMovement', () => {
    let session;

    beforeEach(async () => {
      session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );
    });

    it('should return high score for minimal movement', async () => {
      // Log activities with minimal movement
      await ParkingSessionTracking.logActivity(
        testData.users.driver.id,
        session.id,
        'STILL',
        85,
        14.5312,
        120.9844
      );
      await ParkingSessionTracking.logActivity(
        testData.users.driver.id,
        session.id,
        'STILL',
        85,
        14.5312, // Same location
        120.9844
      );

      const score = await ParkingSessionTracking.checkLocationMovement(
        session.id,
        14.5312,
        120.9844
      );

      expect(score).toBe(1.0); // Perfect score for no movement
    });

    it('should return medium score for moderate movement', async () => {
      // Log activities with ~15m movement
      await ParkingSessionTracking.logActivity(
        testData.users.driver.id,
        session.id,
        'STILL',
        85,
        14.5312,
        120.9844
      );

      const score = await ParkingSessionTracking.checkLocationMovement(
        session.id,
        14.53125, // ~15m away
        120.98445
      );

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1.0);
    });

    it('should return 0 for significant movement', async () => {
      // Log activities with significant movement
      await ParkingSessionTracking.logActivity(
        testData.users.driver.id,
        session.id,
        'IN_VEHICLE',
        85,
        14.5312,
        120.9844
      );

      const score = await ParkingSessionTracking.checkLocationMovement(
        session.id,
        14.5320, // ~100m away
        120.9850
      );

      expect(score).toBe(0);
    });

    it('should return 0 for insufficient data', async () => {
      // Clear activities
      await prisma.activityEvent.deleteMany({
        where: { sessionId: session.id }
      });

      const score = await ParkingSessionTracking.checkLocationMovement(
        session.id,
        14.5312,
        120.9844
      );

      expect(score).toBe(0);
    });
  });

  describe('checkStillDuration', () => {
    let session;

    beforeEach(async () => {
      session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );
    });

    it('should return high score for long STILL duration', async () => {
      // Create STILL activity 60 seconds ago
      const oldTimestamp = new Date(Date.now() - 60000);
      await prisma.activityEvent.create({
        data: {
          userId: testData.users.driver.id,
          sessionId: session.id,
          activityType: 'STILL',
          confidence: 85,
          latitude: 14.5312,
          longitude: 120.9844,
          timestamp: oldTimestamp
        }
      });

      const score = await ParkingSessionTracking.checkStillDuration(session.id);

      expect(score).toBe(1.0); // 60s > 45s threshold
    });

    it('should return medium score for moderate STILL duration', async () => {
      // Create STILL activity 35 seconds ago
      const oldTimestamp = new Date(Date.now() - 35000);
      await prisma.activityEvent.create({
        data: {
          userId: testData.users.driver.id,
          sessionId: session.id,
          activityType: 'STILL',
          confidence: 85,
          latitude: 14.5312,
          longitude: 120.9844,
          timestamp: oldTimestamp
        }
      });

      const score = await ParkingSessionTracking.checkStillDuration(session.id);

      expect(score).toBe(0.7); // 30-45s range
    });

    it('should return low score for short STILL duration', async () => {
      // Create STILL activity 20 seconds ago
      const oldTimestamp = new Date(Date.now() - 20000);
      await prisma.activityEvent.create({
        data: {
          userId: testData.users.driver.id,
          sessionId: session.id,
          activityType: 'STILL',
          confidence: 85,
          latitude: 14.5312,
          longitude: 120.9844,
          timestamp: oldTimestamp
        }
      });

      const score = await ParkingSessionTracking.checkStillDuration(session.id);

      expect(score).toBe(0.4); // 15-30s range
    });

    it('should return 0 for no STILL activities', async () => {
      const score = await ParkingSessionTracking.checkStillDuration(session.id);

      expect(score).toBe(0);
    });
  });

  describe('findEarliestParkingIndicator', () => {
    let session;

    beforeEach(async () => {
      session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );
    });

    it('should find first transition from IN_VEHICLE to STILL', async () => {
      const now = Date.now();

      // Create activity sequence
      await prisma.activityEvent.createMany({
        data: [
          {
            userId: testData.users.driver.id,
            sessionId: session.id,
            activityType: 'IN_VEHICLE',
            confidence: 85,
            timestamp: new Date(now - 180000) // 3 min ago
          },
          {
            userId: testData.users.driver.id,
            sessionId: session.id,
            activityType: 'STILL', // First transition
            confidence: 80,
            timestamp: new Date(now - 120000) // 2 min ago
          },
          {
            userId: testData.users.driver.id,
            sessionId: session.id,
            activityType: 'STILL',
            confidence: 85,
            timestamp: new Date(now - 60000) // 1 min ago
          }
        ]
      });

      const parkingTime = await ParkingSessionTracking.findEarliestParkingIndicator(session.id);

      const expectedTime = new Date(now - 120000);
      expect(Math.abs(parkingTime.getTime() - expectedTime.getTime())).toBeLessThan(1000); // Within 1 second
    });

    it('should return current time if no transition found', async () => {
      const before = Date.now();
      const parkingTime = await ParkingSessionTracking.findEarliestParkingIndicator(session.id);
      const after = Date.now();

      expect(parkingTime.getTime()).toBeGreaterThanOrEqual(before);
      expect(parkingTime.getTime()).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('confirmParking', () => {
    let session;

    beforeEach(async () => {
      session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );
    });

    it('should confirm parking and calculate circling time', async () => {
      const parkingTime = new Date(Date.now() - 300000); // 5 minutes ago

      await ParkingSessionTracking.confirmParking(session.id, parkingTime);

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: session.id }
      });

      expect(updatedSession.status).toBe('parked');
      expect(updatedSession.parkingConfirmationTime).toBeDefined();
      expect(updatedSession.circlingEndTime).toBeDefined();
      expect(updatedSession.circlingDurationSeconds).toBeGreaterThan(290);
      expect(updatedSession.circlingDurationSeconds).toBeLessThan(310);
    });

    it('should not confirm already parked session', async () => {
      const parkingTime = new Date();

      // First confirmation
      await ParkingSessionTracking.confirmParking(session.id, parkingTime);

      // Try to confirm again
      await ParkingSessionTracking.confirmParking(session.id, parkingTime);

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: session.id }
      });

      expect(updatedSession.status).toBe('parked');
    });

    it('should reject invalid circling times', async () => {
      // Future time (invalid)
      const futureTime = new Date(Date.now() + 60000);

      await ParkingSessionTracking.confirmParking(session.id, futureTime);

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: session.id }
      });

      // Should not be confirmed due to invalid time
      expect(updatedSession.status).toBe('searching');
    });
  });

  describe('handleZoneExit', () => {
    let session;

    beforeEach(async () => {
      session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );
    });

    it('should mark parked session as completed on exit', async () => {
      // First park the vehicle
      await prisma.parkingSession.update({
        where: { id: session.id },
        data: { status: 'parked' }
      });

      const exitTime = new Date();
      await ParkingSessionTracking.handleZoneExit(session.id, exitTime);

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: session.id }
      });

      expect(updatedSession.status).toBe('completed');
      expect(updatedSession.exitTime).toBeDefined();
    });

    it('should mark searching session as abandoned on exit', async () => {
      const exitTime = new Date();
      await ParkingSessionTracking.handleZoneExit(session.id, exitTime);

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: session.id }
      });

      expect(updatedSession.status).toBe('abandoned');
      expect(updatedSession.exitTime).toBeDefined();
      expect(updatedSession.circlingEndTime).toBeDefined();
      expect(updatedSession.circlingDurationSeconds).toBeDefined();
    });

    it('should calculate circling duration for abandoned session', async () => {
      // Wait a bit before exit
      await new Promise(resolve => setTimeout(resolve, 100));

      const exitTime = new Date();
      await ParkingSessionTracking.handleZoneExit(session.id, exitTime);

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: session.id }
      });

      expect(updatedSession.circlingDurationSeconds).toBeGreaterThan(0);
    });
  });

  describe('getActiveSession', () => {
    it('should return active session for user in zone', async () => {
      const session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );

      const activeSession = await ParkingSessionTracking.getActiveSession(
        testData.users.driver.id,
        testData.zone.id
      );

      expect(activeSession).toBeDefined();
      expect(activeSession.id).toBe(session.id);
    });

    it('should return parked session', async () => {
      const session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );

      // Mark as parked
      await prisma.parkingSession.update({
        where: { id: session.id },
        data: { status: 'parked' }
      });

      const activeSession = await ParkingSessionTracking.getActiveSession(
        testData.users.driver.id,
        testData.zone.id
      );

      expect(activeSession).toBeDefined();
      expect(activeSession.status).toBe('parked');
    });

    it('should return null for completed session', async () => {
      const session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );

      // Mark as completed
      await prisma.parkingSession.update({
        where: { id: session.id },
        data: { status: 'completed' }
      });

      const activeSession = await ParkingSessionTracking.getActiveSession(
        testData.users.driver.id,
        testData.zone.id
      );

      expect(activeSession).toBeNull();
    });

    it('should return null when no session exists', async () => {
      const activeSession = await ParkingSessionTracking.getActiveSession(
        testData.users.driver.id,
        testData.zone.id
      );

      expect(activeSession).toBeNull();
    });
  });

  describe('getRecentActivities', () => {
    let session;

    beforeEach(async () => {
      session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );
    });

    it('should return recent activities', async () => {
      // Log some activities
      await ParkingSessionTracking.logActivity(
        testData.users.driver.id,
        session.id,
        'STILL',
        85,
        14.5312,
        120.9844
      );

      const activities = await ParkingSessionTracking.getRecentActivities(session.id, 5);

      expect(activities.length).toBeGreaterThan(0);
    });

    it('should respect minutes back parameter', async () => {
      // Create old activity (10 minutes ago)
      await prisma.activityEvent.create({
        data: {
          userId: testData.users.driver.id,
          sessionId: session.id,
          activityType: 'STILL',
          confidence: 85,
          timestamp: new Date(Date.now() - 600000)
        }
      });

      const activities = await ParkingSessionTracking.getRecentActivities(session.id, 5);

      // Should not include 10-minute old activity
      const oldActivity = activities.find(a =>
        Date.now() - new Date(a.timestamp).getTime() > 600000
      );
      expect(oldActivity).toBeUndefined();
    });

    it('should return empty array for no activities', async () => {
      await prisma.activityEvent.deleteMany({
        where: { sessionId: session.id }
      });

      const activities = await ParkingSessionTracking.getRecentActivities(session.id, 5);

      expect(activities).toHaveLength(0);
    });
  });

  describe('Integration: Full parking detection flow', () => {
    it('should detect parking with high confidence activities', async () => {
      const session = await ParkingSessionTracking.startZoneSession(
        testData.users.driver.id,
        testData.zone.id,
        14.5312,
        120.9844
      );

      // Simulate user searching for parking (IN_VEHICLE)
      for (let i = 0; i < 3; i++) {
        await ParkingSessionTracking.logActivity(
          testData.users.driver.id,
          session.id,
          'IN_VEHICLE',
          85,
          14.5312 + (i * 0.0001),
          120.9844 + (i * 0.0001)
        );
      }

      // Wait a bit to simulate time passing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create STILL activities (60 seconds ago)
      const stillTime = new Date(Date.now() - 60000);
      await prisma.activityEvent.create({
        data: {
          userId: testData.users.driver.id,
          sessionId: session.id,
          activityType: 'STILL',
          confidence: 85,
          latitude: 14.5313,
          longitude: 120.9845,
          timestamp: stillTime
        }
      });

      // Simulate user parked (multiple STILL activities)
      for (let i = 0; i < 5; i++) {
        await ParkingSessionTracking.logActivity(
          testData.users.driver.id,
          session.id,
          'STILL',
          90,
          14.5313, // Same location
          120.9845
        );
      }

      // Check if parking would be detected
      const activityScore = await ParkingSessionTracking.checkActivityPattern(session.id);
      const movementScore = await ParkingSessionTracking.checkLocationMovement(
        session.id,
        14.5313,
        120.9845
      );
      const durationScore = await ParkingSessionTracking.checkStillDuration(session.id);

      const totalScore = (activityScore * 0.4) + (movementScore * 0.3) + (durationScore * 0.3);

      expect(totalScore).toBeGreaterThanOrEqual(0.75); // Should trigger parking detection
    });
  });
});
