/**
 * Analytics Routes (Service 1)
 *
 * Handles circling time tracking, zone analytics, and parking predictions.
 * Part of the Smart Parking Analytics platform.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GeofencingService = require('../services/geofencing');
const ParkingSessionTracking = require('../services/parkingSessionTracking');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const {
  zoneEnterSchema,
  activityLogSchema,
  zoneExitSchema,
  zoneIdParamSchema,
  sessionIdParamSchema,
  zoneMetricsQuerySchema,
  zonesListQuerySchema
} = require('../validators/analytics');

module.exports = (router) => {

/**
 * POST /api/v1/analytics/zone/enter
 * User enters a parking zone (geofence detected)
 */
router.post('/analytics/zone/enter', validateBody(zoneEnterSchema), async (req, res) => {
  try {
    const { userId, zoneId, latitude, longitude } = req.body;

    // Validate required fields
    if (!userId || !zoneId || !latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required fields: userId, zoneId, latitude, longitude'
      });
    }

    // Verify zone exists
    const zone = await prisma.zone.findUnique({
      where: { id: parseInt(zoneId) }
    });

    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Verify point is actually in zone
    const isInZone = GeofencingService.isPointInZone(latitude, longitude, zone.geofencePolygon);
    if (!isInZone) {
      return res.status(400).json({
        error: 'Location is not within zone boundaries'
      });
    }

    // Check if user already has an active session in this zone
    const existingSession = await ParkingSessionTracking.getActiveSession(userId, zoneId);
    if (existingSession) {
      return res.json({
        sessionId: existingSession.id,
        circlingStartTime: existingSession.circlingStartTime,
        message: 'Active session already exists'
      });
    }

    // Create new session
    const session = await ParkingSessionTracking.startZoneSession(
      parseInt(userId),
      parseInt(zoneId),
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.status(201).json({
      sessionId: session.id,
      circlingStartTime: session.circlingStartTime,
      zoneId: session.zoneId,
      message: 'Circling timer started'
    });
  } catch (error) {
    console.error('Zone entry error:', error);
    res.status(500).json({ error: 'Failed to process zone entry' });
  }
});

/**
 * POST /api/v1/analytics/activity
 * Log user activity update (from Activity Recognition API)
 */
router.post('/analytics/activity', validateBody(activityLogSchema), async (req, res) => {
  try {
    const { userId, sessionId, activityType, confidence, latitude, longitude } = req.body;

    // Validate required fields
    if (!userId || !sessionId || !activityType || confidence === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: userId, sessionId, activityType, confidence'
      });
    }

    // Validate activity type
    const validActivities = ['IN_VEHICLE', 'STILL', 'ON_FOOT', 'WALKING', 'RUNNING', 'ON_BICYCLE'];
    if (!validActivities.includes(activityType)) {
      return res.status(400).json({
        error: `Invalid activityType. Must be one of: ${validActivities.join(', ')}`
      });
    }

    // Validate confidence
    if (confidence < 0 || confidence > 100) {
      return res.status(400).json({
        error: 'Confidence must be between 0 and 100'
      });
    }

    // Log activity
    const activityEvent = await ParkingSessionTracking.logActivity(
      parseInt(userId),
      parseInt(sessionId),
      activityType,
      parseInt(confidence),
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null
    );

    res.status(201).json({
      activityEventId: activityEvent.id,
      timestamp: activityEvent.timestamp,
      status: 'logged'
    });
  } catch (error) {
    console.error('Activity logging error:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

/**
 * POST /api/v1/analytics/zone/exit
 * User exits parking zone
 */
router.post('/analytics/zone/exit', validateBody(zoneExitSchema), async (req, res) => {
  try {
    const { sessionId, exitTime, parked } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing required field: sessionId' });
    }

    const exitTimestamp = exitTime ? new Date(exitTime) : new Date();

    await ParkingSessionTracking.handleZoneExit(
      parseInt(sessionId),
      exitTimestamp
    );

    res.json({
      sessionId: parseInt(sessionId),
      exitTime: exitTimestamp,
      status: 'completed'
    });
  } catch (error) {
    console.error('Zone exit error:', error);
    res.status(500).json({ error: 'Failed to process zone exit' });
  }
});

/**
 * GET /api/v1/analytics/zones/:zoneId/availability
 * Get real-time zone availability and circling time estimate
 */
router.get('/analytics/zones/:zoneId/availability', validateParams(zoneIdParamSchema), async (req, res) => {
  try {
    const { zoneId } = req.params;

    const zone = await prisma.zone.findUnique({
      where: { id: parseInt(zoneId) },
      include: {
        parkingSlots: {
          where: { isActive: true }
        }
      }
    });

    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Calculate occupancy
    const totalSlots = zone.parkingSlots.length;
    const occupiedSlots = zone.parkingSlots.filter(slot => slot.status === 'occupied').length;
    const availableSlots = totalSlots - occupiedSlots;
    const occupancyPercentage = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

    // Get latest metrics (from cache or DB)
    const latestMetrics = await prisma.zoneMetrics.findFirst({
      where: { zoneId: parseInt(zoneId) },
      orderBy: { timestamp: 'desc' }
    });

    // Default circling time if no metrics available
    let estimatedCirclingTime = 300; // 5 minutes default
    let dataFreshness = null;
    let message = 'No recent data available';

    if (latestMetrics && latestMetrics.avgCirclingTimeSeconds) {
      estimatedCirclingTime = latestMetrics.avgCirclingTimeSeconds;
      dataFreshness = latestMetrics.timestamp;

      // Generate user-friendly message
      const minutes = Math.floor(estimatedCirclingTime / 60);
      if (minutes <= 3) {
        message = `Light traffic. Average ${minutes} min to find parking.`;
      } else if (minutes <= 7) {
        message = `Moderate traffic. Average ${minutes} min to find parking.`;
      } else {
        message = `Heavy traffic. Average ${minutes} min to find parking.`;
      }
    }

    res.json({
      zoneId: parseInt(zoneId),
      name: zone.name,
      totalSlots,
      occupied: occupiedSlots,
      available: availableSlots,
      occupancyPercentage: parseFloat(occupancyPercentage.toFixed(1)),
      estimatedCirclingTime,
      estimatedCirclingTimeMinutes: Math.floor(estimatedCirclingTime / 60),
      message,
      dataFreshness
    });
  } catch (error) {
    console.error('Zone availability error:', error);
    res.status(500).json({ error: 'Failed to get zone availability' });
  }
});

/**
 * GET /api/v1/analytics/zones/:zoneId/metrics
 * Get historical metrics for a zone
 */
router.get('/analytics/zones/:zoneId/metrics', validateParams(zoneIdParamSchema), validateQuery(zoneMetricsQuerySchema), async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { period = 'hourly', from, to, limit = 24 } = req.query;

    const zone = await prisma.zone.findUnique({
      where: { id: parseInt(zoneId) }
    });

    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Build where clause
    const where = { zoneId: parseInt(zoneId), periodType: period };

    if (from) {
      where.timestamp = { gte: new Date(from) };
    }
    if (to) {
      where.timestamp = where.timestamp || {};
      where.timestamp.lte = new Date(to);
    }

    // Get metrics
    const metrics = await prisma.zoneMetrics.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      zoneId: parseInt(zoneId),
      zoneName: zone.name,
      period,
      count: metrics.length,
      metrics: metrics.map(m => ({
        timestamp: m.timestamp,
        avgCirclingTime: m.avgCirclingTimeSeconds,
        avgCirclingTimeMinutes: m.avgCirclingTimeSeconds ? Math.floor(m.avgCirclingTimeSeconds / 60) : null,
        minCirclingTime: m.minCirclingTimeSeconds,
        maxCirclingTime: m.maxCirclingTimeSeconds,
        occupancyPercentage: m.occupancyPercentage,
        totalSessions: m.totalSessions,
        totalRevenue: m.totalRevenue
      }))
    });
  } catch (error) {
    console.error('Zone metrics error:', error);
    res.status(500).json({ error: 'Failed to get zone metrics' });
  }
});

/**
 * GET /api/v1/analytics/sessions/:sessionId
 * Get session details and activities
 */
router.get('/analytics/sessions/:sessionId', validateParams(sessionIdParamSchema), async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.parkingSession.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        zone: true,
        activityEvents: {
          orderBy: { timestamp: 'desc' },
          take: 50
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.id,
      userId: session.userId,
      zone: session.zone ? {
        id: session.zone.id,
        name: session.zone.name,
        type: session.zone.type
      } : null,
      status: session.status,
      zoneEntryTime: session.zoneEntryTime,
      parkingConfirmationTime: session.parkingConfirmationTime,
      exitTime: session.exitTime,
      circlingDurationSeconds: session.circlingDurationSeconds,
      circlingDurationMinutes: session.circlingDurationSeconds
        ? Math.floor(session.circlingDurationSeconds / 60)
        : null,
      lastActivity: session.lastActivityStatus,
      activityCount: session.activityEvents.length,
      recentActivities: session.activityEvents.slice(0, 10).map(a => ({
        activityType: a.activityType,
        confidence: a.confidence,
        timestamp: a.timestamp
      }))
    });
  } catch (error) {
    console.error('Session details error:', error);
    res.status(500).json({ error: 'Failed to get session details' });
  }
});

/**
 * GET /api/v1/analytics/zones
 * List all zones with basic stats
 */
router.get('/analytics/zones', validateQuery(zonesListQuerySchema), async (req, res) => {
  try {
    const { city, type, isActive = true } = req.query;

    const where = {};
    if (city) where.city = city;
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const zones = await prisma.zone.findMany({
      where,
      include: {
        _count: {
          select: {
            parkingSlots: true,
            parkingSessions: true
          }
        }
      }
    });

    res.json({
      count: zones.length,
      zones: zones.map(z => ({
        id: z.id,
        name: z.name,
        type: z.type,
        address: z.address,
        city: z.city,
        centroidLat: z.centerLat,
        centroidLon: z.centerLon,
        totalCapacity: z.totalCapacity,
        pricePerHour: z.pricePerHour,
        totalSlots: z._count.parkingSlots,
        totalSessions: z._count.parkingSessions
      }))
    });
  } catch (error) {
    console.error('Zones list error:', error);
    res.status(500).json({ error: 'Failed to get zones' });
  }
});

}; // End of module.exports
