const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const hourStart = (date) => {
  const start = new Date(date);
  start.setUTCMinutes(0, 0, 0);
  return start;
};

/**
 * Aggregate completed circling sessions for verified external facilities.
 * User-linked source rows are removed whether a bucket meets the publication
 * threshold or not; only a threshold-qualified anonymous aggregate is retained.
 */
async function aggregateCompletedCrowdParking(windowEnd = hourStart(new Date())) {
  const end = hourStart(windowEnd);
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  const candidates = await prisma.parkingCandidate.findMany({
    where: {
      candidateStatus: { in: ['geofence_verified', 'commercial_verified'] },
      linkedZoneId: { not: null },
    },
    select: { linkedZoneId: true },
    distinct: ['linkedZoneId'],
  });
  const zoneIds = candidates.map(({ linkedZoneId }) => linkedZoneId);
  if (!zoneIds.length) return { zonesProcessed: 0, sessionsAnonymized: 0 };

  const sessions = await prisma.parkingSession.findMany({
    where: {
      zoneId: { in: zoneIds },
      sessionType: 'commercial_activity',
      slotId: null,
      bookingId: null,
      status: { in: ['parked', 'completed'] },
      circlingEndTime: { gte: start, lt: end },
      circlingDurationSeconds: { not: null },
    },
    select: { id: true, zoneId: true, circlingDurationSeconds: true },
  });
  const byZone = new Map();
  for (const session of sessions) {
    if (!byZone.has(session.zoneId)) byZone.set(session.zoneId, []);
    byZone.get(session.zoneId).push(session);
  }

  let sessionsAnonymized = 0;
  for (const [zoneId, zoneSessions] of byZone) {
    await prisma.$transaction(async (tx) => {
      if (zoneSessions.length >= 3) {
        const average = Math.round(zoneSessions.reduce((sum, session) => sum + session.circlingDurationSeconds, 0) / zoneSessions.length);
        await tx.crowdParkingMetric.upsert({
          where: { zoneId_windowStart: { zoneId, windowStart: start } },
          create: {
            zoneId,
            windowStart: start,
            windowEnd: end,
            avgCirclingTimeSeconds: average,
            sampleCount: zoneSessions.length,
          },
          update: {
            windowEnd: end,
            avgCirclingTimeSeconds: average,
            sampleCount: zoneSessions.length,
          },
        });
      }
      const sessionIds = zoneSessions.map(({ id }) => id);
      await tx.activityEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await tx.parkingSession.deleteMany({ where: { id: { in: sessionIds } } });
    });
    sessionsAnonymized += zoneSessions.length;
  }

  return { zonesProcessed: byZone.size, sessionsAnonymized };
}

/** Remove outstanding user-linked external parking signals when consent is revoked. */
async function deleteUserCrowdParkingData(userId) {
  const sessions = await prisma.parkingSession.findMany({
    where: {
      userId: Number(userId),
      sessionType: 'commercial_activity',
      slotId: null,
      bookingId: null,
      zone: {
        linkedCandidates: {
          some: { candidateStatus: { in: ['geofence_verified', 'commercial_verified'] } },
        },
      },
    },
    select: { id: true },
  });
  const sessionIds = sessions.map(({ id }) => id);
  if (!sessionIds.length) return 0;
  await prisma.$transaction([
    prisma.activityEvent.deleteMany({ where: { sessionId: { in: sessionIds } } }),
    prisma.parkingSession.deleteMany({ where: { id: { in: sessionIds } } }),
  ]);
  return sessionIds.length;
}

module.exports = { aggregateCompletedCrowdParking, deleteUserCrowdParkingData, hourStart };
