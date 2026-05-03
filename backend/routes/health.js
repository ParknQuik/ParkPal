const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redisClient = require('../config/redis');
const secretManager = require('../config/secretManager');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Enhanced health check endpoint
 * Checks status of critical services
 */
module.exports = (app) => {
  app.get('/health', async (req, res) => {
    const health = {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {}
    };

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = { status: 'up', responseTime: null };
    } catch (err) {
      health.checks.database = {
        status: 'down',
        error: err.message
      };
      health.status = 'degraded';
    }

    // Check Redis connection (if available)
    try {
      const startTime = Date.now();
      await redisClient.ping();
      const responseTime = Date.now() - startTime;
      health.checks.redis = {
        status: 'up',
        responseTime: `${responseTime}ms`
      };
    } catch (err) {
      health.checks.redis = {
        status: 'down',
        error: 'Redis not available'
      };
      // Redis is optional, don't mark as degraded
    }

    // Check Secret Manager
    health.checks.secretManager = {
      status: secretManager.isInitialized ? 'up' : 'down'
    };

    // Memory usage
    const memUsage = process.memoryUsage();
    health.memory = {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    };

    // Determine overall status code
    const statusCode = health.status === 'ok' ? 200 : 503;

    res.status(statusCode).json(health);
  });

  /**
   * Simple liveness probe (always returns 200)
   * For Kubernetes/container orchestration
   */
  app.get('/health/live', (req, res) => {
    res.status(200).json({
      status: 'alive',
      timestamp: Date.now()
    });
  });

  /**
   * Readiness probe (checks if ready to accept traffic)
   */
  app.get('/health/ready', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'ready',
        timestamp: Date.now()
      });
    } catch (err) {
      res.status(503).json({
        status: 'not ready',
        error: 'Database connection failed',
        timestamp: Date.now()
      });
    }
  });
};
