/**
 * API v1 Router
 * 
 * All v1 API routes are organized here
 * This allows for safe API evolution and breaking changes in future versions
 */

const express = require('express');
const router = express.Router();

/**
 * Mount all v1 route modules
 * Each route module handles its own endpoints
 */
module.exports = (authLimiter) => {
  const authLimiters = typeof authLimiter === 'function'
    ? { login: authLimiter, register: authLimiter, reset: authLimiter }
    : authLimiter;
  const authRoutes = require('../auth');
  const googleAuthRoutes = require('../googleAuth');
  const appleAuthRoutes = require('../appleAuth');
  const facebookAuthRoutes = require('../facebookAuth');
  const parkingRoutes = require('../parking');
  const paymentRoutes = require('../payments');
  const alertRoutes = require('../alerts');
  const marketplaceRoutes = require('../marketplace');
  const configRoutes = require('../config');
  const userRoutes = require('../users');
  const healthRoutes = require('../health');
  const mediaRoutes = require('../media');
  const analyticsRoutes = require('../analytics');
  const vehiclesRoutes = require('../vehicles');
  const notificationsRoutes = require('../notifications');
  const earningsRoutes = require('../earnings');
  const pointsRoutes = require('../points');
  const knowledgeAdminRoutes = require('../knowledgeAdmin');
  const adminMetricsRoutes = require('../adminMetrics');

  // Health routes (no auth required)
  healthRoutes(router);

  // Auth routes get stricter rate limiting
  authRoutes(router, authLimiters);

  // Social Auth routes
  googleAuthRoutes(router, authLimiters);
  appleAuthRoutes(router, authLimiters);
  facebookAuthRoutes(router, authLimiters);

  // Admin routes
  const adminRoutes = require('../admin');
  adminRoutes(router);
  adminMetricsRoutes(router);
  knowledgeAdminRoutes(router);

  // Other routes
  parkingRoutes(router);
  paymentRoutes(router);
  alertRoutes(router);
  marketplaceRoutes(router);
  configRoutes(router);
  userRoutes(router);
  mediaRoutes(router);
  analyticsRoutes(router);
  vehiclesRoutes(router);
  notificationsRoutes(router);
  earningsRoutes(router);
  pointsRoutes(router);

  return router;
};
