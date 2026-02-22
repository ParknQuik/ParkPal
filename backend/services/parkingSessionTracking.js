/**
 * Parking Session Tracking Service
 *
 * Handles circling time tracking and parking confirmation detection
 * for Service 1 Analytics with sophisticated edge case handling.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const GeofencingService = require('./geofencing');

class ParkingSessionTrackingService {
  /**
   * Create a new parking session when user enters a zone
   * @param {number} userId - User ID
   * @param {number} zoneId - Zone ID
   * @param {number} latitude - Entry latitude
   * @param {number} longitude - Entry longitude
   * @returns {Object} Created parking session
   */
  static async startZoneSession(userId, zoneId, latitude, longitude) {
    try {
      const session = await prisma.parkingSession.create({
        data: {
          userId,
          zoneId,
          sessionType: 'commercial_activity',
          zoneEntryTime: new Date(),
          circlingStartTime: new Date(),
          status: 'searching',
          lastActivityStatus: 'IN_VEHICLE'
        }
      });

      // Create initial activity event
      await prisma.activityEvent.create({
        data: {
          userId,
          sessionId: session.id,
          activityType: 'IN_VEHICLE',
          confidence: 90,
          latitude,
          longitude,
          timestamp: new Date()
        }
      });

      return session;
    } catch (error) {
      console.error('Error starting zone session:', error);
      throw error;
    }
  }

  /**
   * Log an activity event for a session
   * @param {number} userId - User ID
   * @param {number} sessionId - Session ID
   * @param {string} activityType - IN_VEHICLE | STILL | ON_FOOT | WALKING | RUNNING
   * @param {number} confidence - 0-100
   * @param {number} latitude - Current latitude
   * @param {number} longitude - Current longitude
   * @returns {Object} Created activity event
   */
  static async logActivity(userId, sessionId, activityType, confidence, latitude, longitude) {
    try {
      const activityEvent = await prisma.activityEvent.create({
        data: {
          userId,
          sessionId,
          activityType,
          confidence,
          latitude,
          longitude,
          timestamp: new Date()
        }
      });

      // Update session's last activity
      await prisma.parkingSession.update({
        where: { id: sessionId },
        data: {
          lastActivityStatus: activityType,
          activityConfidenceLevel: confidence
        }
      });

      // Check if this activity indicates parking
      await this.detectParking(sessionId, activityType, confidence, latitude, longitude);

      return activityEvent;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  /**
   * Detect if user has parked based on activity patterns
   * Implements hybrid approach combining multiple techniques
   * @param {number} sessionId - Session ID
   * @param {string} currentActivityType - Current activity
   * @param {number} currentConfidence - Current confidence
   * @param {number} currentLat - Current latitude
   * @param {number} currentLon - Current longitude
   */
  static async detectParking(sessionId, currentActivityType, currentConfidence, currentLat, currentLon) {
    try {
      const session = await prisma.parkingSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.status !== 'searching') {
        return; // Already parked or session not active
      }

      // Only check if current activity suggests parking
      if (!['STILL', 'ON_FOOT', 'WALKING'].includes(currentActivityType)) {
        return;
      }

      // Calculate composite confidence score
      const activityScore = await this.checkActivityPattern(sessionId);
      const movementScore = await this.checkLocationMovement(sessionId, currentLat, currentLon);
      const durationScore = await this.checkStillDuration(sessionId);

      // Weighted combination (40% activity, 30% movement, 30% duration)
      const totalScore = (activityScore * 0.4) + (movementScore * 0.3) + (durationScore * 0.3);

      console.log(`Parking detection score for session ${sessionId}: ${totalScore.toFixed(2)}`);

      // High confidence threshold
      if (totalScore >= 0.75) {
        const parkingTime = await this.findEarliestParkingIndicator(sessionId);
        await this.confirmParking(sessionId, parkingTime);
      }
    } catch (error) {
      console.error('Error detecting parking:', error);
    }
  }

  /**
   * Check activity pattern - returns score 0-1
   */
  static async checkActivityPattern(sessionId) {
    const recentActivities = await prisma.activityEvent.findMany({
      where: {
        sessionId,
        timestamp: { gte: new Date(Date.now() - 3 * 60 * 1000) } // Last 3 minutes
      },
      orderBy: { timestamp: 'desc' }
    });

    if (recentActivities.length === 0) return 0;

    // Count STILL/ON_FOOT activities with high confidence
    const parkingActivities = recentActivities.filter(a =>
      (a.activityType === 'STILL' || a.activityType === 'ON_FOOT') &&
      a.confidence >= 70
    );

    // Return ratio of parking activities
    return parkingActivities.length / recentActivities.length;
  }

  /**
   * Check location movement - returns score 0-1
   */
  static async checkLocationMovement(sessionId, currentLat, currentLon) {
    const recentActivities = await prisma.activityEvent.findMany({
      where: {
        sessionId,
        timestamp: { gte: new Date(Date.now() - 60 * 1000) }, // Last 60 seconds
        latitude: { not: null },
        longitude: { not: null }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (recentActivities.length < 2) return 0;

    const firstActivity = recentActivities[0];
    const distanceMoved = GeofencingService.calculateDistance(
      firstActivity.latitude,
      firstActivity.longitude,
      currentLat,
      currentLon
    );

    // If moved < 10 meters in 60 seconds, likely parked
    if (distanceMoved !== null && distanceMoved < 10) {
      return 1.0;
    } else if (distanceMoved !== null && distanceMoved < 20) {
      return 0.5;
    }

    return 0;
  }

  /**
   * Check duration of STILL activity - returns score 0-1
   */
  static async checkStillDuration(sessionId) {
    const stillEvents = await prisma.activityEvent.findMany({
      where: {
        sessionId,
        activityType: { in: ['STILL', 'ON_FOOT'] },
        timestamp: { gte: new Date(Date.now() - 2 * 60 * 1000) } // Last 2 minutes
      },
      orderBy: { timestamp: 'asc' }
    });

    if (stillEvents.length === 0) return 0;

    const firstStill = stillEvents[0].timestamp;
    const durationSeconds = (Date.now() - new Date(firstStill).getTime()) / 1000;

    // Require 45+ seconds of STILL for high confidence
    if (durationSeconds >= 45) {
      return 1.0;
    } else if (durationSeconds >= 30) {
      return 0.7;
    } else if (durationSeconds >= 15) {
      return 0.4;
    }

    return 0;
  }

  /**
   * Find earliest parking indicator (retroactive correction)
   * Looks back up to 3 minutes to find first transition from IN_VEHICLE to STILL
   */
  static async findEarliestParkingIndicator(sessionId) {
    // Get session to use its circlingStartTime as reference
    const session = await prisma.parkingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return new Date();
    }

    const recentActivities = await prisma.activityEvent.findMany({
      where: {
        sessionId,
        timestamp: { gte: new Date(session.circlingStartTime.getTime() - 60 * 1000) } // 1 min before session start for safety
      },
      orderBy: { timestamp: 'asc' }
    });

    // Find first transition from IN_VEHICLE to STILL/ON_FOOT
    for (let i = 0; i < recentActivities.length - 1; i++) {
      const current = recentActivities[i];
      const next = recentActivities[i + 1];

      if (
        current.activityType === 'IN_VEHICLE' &&
        (next.activityType === 'STILL' || next.activityType === 'ON_FOOT') &&
        next.confidence >= 70
      ) {
        return next.timestamp; // Return earlier time
      }
    }

    // If no transition found, use current time
    return new Date();
  }

  /**
   * Confirm parking and calculate circling time
   */
  static async confirmParking(sessionId, parkingTime) {
    try {
      const session = await prisma.parkingSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.status === 'parked') {
        return; // Already confirmed
      }

      const parkingTimeMs = new Date(parkingTime).getTime();
      const circlingStartMs = new Date(session.circlingStartTime).getTime();
      const nowMs = Date.now();

      // Reject future parking times
      if (parkingTimeMs > nowMs) {
        console.warn(`Invalid parking time for session ${sessionId}: parking time is in the future`);
        return;
      }

      const circlingDurationSeconds = Math.floor((parkingTimeMs - circlingStartMs) / 1000);

      // Only confirm if circling time is reasonable (0-60 minutes)
      if (circlingDurationSeconds < 0 || circlingDurationSeconds > 3600) {
        console.warn(`Invalid circling time for session ${sessionId}: ${circlingDurationSeconds}s`);
        return;
      }

      await prisma.parkingSession.update({
        where: { id: sessionId },
        data: {
          parkingConfirmationTime: parkingTime,
          circlingEndTime: parkingTime,
          circlingDurationSeconds,
          status: 'parked'
        }
      });

      console.log(`Parking confirmed for session ${sessionId}. Circling time: ${circlingDurationSeconds}s (${Math.floor(circlingDurationSeconds / 60)} min ${circlingDurationSeconds % 60} sec)`);
    } catch (error) {
      console.error('Error confirming parking:', error);
      throw error;
    }
  }

  /**
   * Handle zone exit (user left without parking)
   */
  static async handleZoneExit(sessionId, exitTime) {
    try {
      const session = await prisma.parkingSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status === 'parked') {
        // User is leaving after parking - mark as completed
        await prisma.parkingSession.update({
          where: { id: sessionId },
          data: {
            exitTime,
            status: 'completed'
          }
        });
      } else {
        // User left without parking - mark as abandoned
        const circlingDurationSeconds = Math.floor(
          (new Date(exitTime).getTime() - new Date(session.circlingStartTime).getTime()) / 1000
        );

        await prisma.parkingSession.update({
          where: { id: sessionId },
          data: {
            status: 'abandoned',
            circlingEndTime: exitTime,
            exitTime,
            circlingDurationSeconds
            // Note: Abandoned sessions can be excluded from metrics in Databricks
          }
        });

        console.log(`Session ${sessionId} abandoned. User left without parking after ${Math.floor(circlingDurationSeconds / 60)} minutes`);
      }
    } catch (error) {
      console.error('Error handling zone exit:', error);
      throw error;
    }
  }

  /**
   * Get active session for user in a zone
   */
  static async getActiveSession(userId, zoneId) {
    return await prisma.parkingSession.findFirst({
      where: {
        userId,
        zoneId,
        status: { in: ['searching', 'parked'] }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get recent activities for a session
   */
  static async getRecentActivities(sessionId, minutesBack = 5) {
    return await prisma.activityEvent.findMany({
      where: {
        sessionId,
        timestamp: { gte: new Date(Date.now() - minutesBack * 60 * 1000) }
      },
      orderBy: { timestamp: 'desc' }
    });
  }
}

module.exports = ParkingSessionTrackingService;
