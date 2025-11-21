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
  const authRoutes = require('../auth');
  const parkingRoutes = require('../parking');
  const paymentRoutes = require('../payments');
  const alertRoutes = require('../alerts');
  const marketplaceRoutes = require('../marketplace');
  const configRoutes = require('../config');
  const userRoutes = require('../users');
  const healthRoutes = require('../health');

  // Health routes (no auth required)
  healthRoutes(router);

  // Auth routes get stricter rate limiting
  authRoutes(router, authLimiter);

  // Other routes
  parkingRoutes(router);
  paymentRoutes(router);
  alertRoutes(router);
  marketplaceRoutes(router);
  configRoutes(router);
  userRoutes(router);

  return router;
};
