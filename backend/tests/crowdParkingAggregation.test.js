const { PrismaClient } = require('@prisma/client');
const { setupTestDatabase, teardownTestDatabase } = require('./setup');
const { aggregateCompletedCrowdParking, hourStart } = require('../services/crowdParkingAggregation');

const prisma = new PrismaClient();

beforeAll(async () => setupTestDatabase());
afterAll(async () => {
  await teardownTestDatabase();
  await prisma.$disconnect();
});

describe('external parking crowd aggregation', () => {
  let driver;
  let verifiedZone;
  let previewZone;
  let windowEnd;

  beforeEach(async () => {
    driver = await prisma.user.findUnique({ where: { email: 'test-driver@example.com' } });
    verifiedZone = await prisma.zone.create({
      data: {
        name: 'Verified Lot', type: 'commercial', address: 'Verified address', city: 'Manila',
        geofencePolygon: JSON.stringify({ type: 'Polygon', coordinates: [[[120.98, 14.53], [120.99, 14.53], [120.99, 14.54], [120.98, 14.53]]] }),
        centerLat: 14.53, centerLon: 120.98,
      },
    });
    previewZone = await prisma.zone.create({
      data: {
        name: 'Preview Lot', type: 'commercial', address: 'Preview address', city: 'Manila',
        geofencePolygon: JSON.stringify({ type: 'Polygon', coordinates: [[[120.98, 14.53], [120.99, 14.53], [120.99, 14.54], [120.98, 14.53]]] }),
        centerLat: 14.53, centerLon: 120.98,
      },
    });
    await prisma.parkingCandidate.createMany({ data: [
      { googlePlaceId: `verified-${Date.now()}`, candidateStatus: 'geofence_verified', scanArea: 'Manila', scanSource: 'test', linkedZoneId: verifiedZone.id },
      { googlePlaceId: `preview-${Date.now()}`, candidateStatus: 'candidate_preview', scanArea: 'Manila', scanSource: 'test', linkedZoneId: previewZone.id },
    ] });
    windowEnd = hourStart(new Date());
  });

  afterEach(async () => {
    await prisma.activityEvent.deleteMany();
    await prisma.parkingSession.deleteMany();
    await prisma.crowdParkingMetric.deleteMany();
    await prisma.parkingCandidate.deleteMany();
    await prisma.zone.deleteMany();
  });

  it('publishes only verified zones with at least three completed sessions and removes source rows', async () => {
    const endTime = new Date(windowEnd.getTime() - 30 * 60 * 1000);
    const sessions = await Promise.all([60, 120, 180].map((duration) => prisma.parkingSession.create({
      data: {
        userId: driver.id, zoneId: verifiedZone.id, sessionType: 'commercial_activity', status: 'completed',
        circlingEndTime: endTime, circlingDurationSeconds: duration,
      },
    })));
    const previewSession = await prisma.parkingSession.create({
      data: {
        userId: driver.id, zoneId: previewZone.id, sessionType: 'commercial_activity', status: 'completed',
        circlingEndTime: endTime, circlingDurationSeconds: 90,
      },
    });
    await prisma.activityEvent.createMany({ data: sessions.map((session) => ({
      userId: driver.id, sessionId: session.id, activityType: 'IN_VEHICLE', confidence: 90,
    })) });

    await aggregateCompletedCrowdParking(windowEnd);

    const metric = await prisma.crowdParkingMetric.findUnique({
      where: { zoneId_windowStart: { zoneId: verifiedZone.id, windowStart: new Date(windowEnd.getTime() - 60 * 60 * 1000) } },
    });
    expect(metric).toMatchObject({ avgCirclingTimeSeconds: 120, sampleCount: 3, windowEnd });
    expect(await prisma.parkingSession.findMany({ where: { id: { in: sessions.map(({ id }) => id) } } })).toHaveLength(0);
    expect(await prisma.activityEvent.findMany({ where: { sessionId: { in: sessions.map(({ id }) => id) } } })).toHaveLength(0);
    expect(await prisma.parkingSession.findUnique({ where: { id: previewSession.id } })).not.toBeNull();
  });

  it('does not publish undersampled hours and still removes their user-linked source rows', async () => {
    const session = await prisma.parkingSession.create({
      data: {
        userId: driver.id, zoneId: verifiedZone.id, sessionType: 'commercial_activity', status: 'completed',
        circlingEndTime: new Date(windowEnd.getTime() - 30 * 60 * 1000), circlingDurationSeconds: 90,
      },
    });
    await aggregateCompletedCrowdParking(windowEnd);
    expect(await prisma.crowdParkingMetric.count({ where: { zoneId: verifiedZone.id } })).toBe(0);
    expect(await prisma.parkingSession.findUnique({ where: { id: session.id } })).toBeNull();
  });
});
