// Load local environment before importing modules that initialize Redis or read config.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { authRateLimit } = require('./middleware/authRateLimit');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const cron = require('node-cron');

const secretManager = require('./config/secretManager');
const logger = require('./config/logger');
const metrics = require('./config/metrics');
const { authenticate } = require('./services/auth');
const { requireAdmin } = require('./middleware/adminGuard');
const { pruneWebPerformanceMetrics } = require('./services/webPerformanceMetrics');
const { validateEnvironment, printEnvironmentSummary } = require('./config/env-validation');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

// Cloud Run adds one trusted forwarding hop; req.ip must use the originating client.
app.set('trust proxy', 1);

// Validate environment variables
const envValidation = validateEnvironment();
if (!envValidation.valid && process.env.NODE_ENV === 'production') {
  logger.error('Cannot start server: Environment validation failed');
  process.exit(1);
}

// Initialize Secret Manager
secretManager.initialize();

// Log startup information
// CD Pipeline: Database URL v4 with TCP connection
logger.logStartup();
printEnvironmentSummary();

// Rate limiting configuration
const mapDiscoveryReadPaths = new Set([
  '/v1/marketplace/search',
  '/v1/marketplace/discovery/candidates',
  '/marketplace/search',
  '/marketplace/discovery/candidates',
  '/api/v1/marketplace/search',
  '/api/v1/marketplace/discovery/candidates',
  '/api/marketplace/search',
  '/api/marketplace/discovery/candidates',
]);

const isMapDiscoveryRead = (req) =>
  ['GET', 'HEAD', 'OPTIONS'].includes(req.method) && mapDiscoveryReadPaths.has(req.path);

const apiReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1200, // Normal browsing can issue repeated read bursts across screens
  message: { error: 'Too many read requests from this IP, please try again later.' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

const apiMapDiscoveryReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2400,
  message: { error: 'Map refreshes are busy. Please wait a moment and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Keep write traffic tighter than read-only API browsing
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiMethodLimiter = (req, res, next) => {
  if (isMapDiscoveryRead(req)) {
    return apiMapDiscoveryReadLimiter(req, res, next);
  }

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return apiReadLimiter(req, res, next);
  }

  return apiWriteLimiter(req, res, next);
};

const authLimiter = {
  login: authRateLimit('login'),
  register: authRateLimit('register'),
  reset: authRateLimit('reset'),
};

// Middleware
// Security headers with helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false, // Allow Swagger UI to work
}));

// Configure CORS properly
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
    ? [
        'https://parkpal.com',
        'https://www.parkpal.com',
        // Cloud Run web frontends
        'https://parkpal-web-dev-cxntrkjjmq-as.a.run.app',
        'https://parkpal-web-staging-cxntrkjjmq-as.a.run.app',
        'https://parkpal-web-prod-cxntrkjjmq-as.a.run.app',
      ]
    : [
        'http://localhost:3000',
        'http://localhost:5173', // Vite dev server
        'http://localhost:5174', // Vite dev server (alternate port)
        'http://localhost:19006', // Expo web
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{4,5}$/, // Allow all local network IPs
        // Cloud Run web frontends (for development)
        'https://parkpal-web-dev-cxntrkjjmq-as.a.run.app',
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Webhook route MUST be before express.json() to capture raw body
const paymongoController = require('./controllers/paymentsController');
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), paymongoController.handleWebhook);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// HTTP request logging with Morgan + Winston
app.use(morgan('combined', {
  stream: logger.stream,
  skip: (req) => req.path === '/api/v1/analytics/performance' || req.path === '/api/analytics/performance',
}));

// Prometheus metrics middleware
app.use(metrics.metricsMiddleware);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ParknQuik API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Apply method-aware rate limiting to API routes
app.use('/api/', apiMethodLimiter);

// Routes
const healthRoutes = require('./routes/health');
const v1Router = require('./routes/v1');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { deprecate } = require('./middleware/deprecation');

// Metrics endpoint (before other routes)
app.get('/metrics', authenticate, requireAdmin, metrics.getMetrics);

// Health check routes (before other routes)
healthRoutes(app);

// API v1 Routes - Primary endpoints
app.use('/api/v1', v1Router(authLimiter));

// Legacy /api routes - Deprecated but maintained for backward compatibility
app.use('/api',
  deprecate({
    alternative: '/api/v1',
    sunset: '2026-12-31',
    message: 'Please migrate to /api/v1. The /api prefix without version will be removed on December 31, 2026.'
  }),
  v1Router(authLimiter)
);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ParknQuik API',
    status: 'healthy',
    version: '1.0.0',
    apiVersions: {
      current: 'v1',
      available: ['v1'],
      deprecated: {
        '/api': {
          alternative: '/api/v1',
          sunset: '2026-12-31'
        }
      }
    },
    endpoints: {
      health: '/health',
      docs: '/api-docs',
      apiV1: '/api/v1',
      legacyApi: '/api (deprecated)'
    },
    documentation: {
      swagger: '/api-docs',
      swaggerJson: '/api-docs.json'
    }
  });
});

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// WebSocket setup
const websocketService = require('./services/websocket');
websocketService.init(server);

// Auto-checkout cron job setup
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 3 * * 1', async () => {
    const { refreshRegions } = require('./services/regionalParkingRefresh');
    const results = await refreshRegions(require('./config/prisma'), process.env.PARKING_EXTRACT_DIRECTORY);
    for (const result of results) {
      if (result.error) logger.error('Regional parking refresh failed', result);
      else logger.info('Regional parking refresh completed', result);
    }
  }, { timezone: 'UTC', noOverlap: true });
  const { autoCheckoutExpiredSessions } = require('./services/autoCheckout');
  
  // Schedule auto-checkout job - runs every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      await autoCheckoutExpiredSessions();
    } catch (error) {
      logger.error('[Cron] Auto-checkout failed:', error);
    }
  });
  
  logger.info('Auto-checkout cron job scheduled (every 30 minutes)');

  // Booking expiry cron jobs
  const { checkExpiredBookings, checkMissedOpenTimeBookings, sendExpiryReminders } = require('./services/bookingExpiry');
  
  // Check for expired bookings every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await checkExpiredBookings();
    } catch (error) {
      logger.error('[Cron] Booking expiry check failed:', error);
    }
  });

  // Check for missed open time bookings every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await checkMissedOpenTimeBookings();
    } catch (error) {
      logger.error('[Cron] Missed open time bookings check failed:', error);
    }
  });
  
  // Send expiry reminders every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    try {
      await sendExpiryReminders();
    } catch (error) {
      logger.error('[Cron] Expiry reminder check failed:', error);
    }
  });
  
  logger.info('Booking expiry cron jobs scheduled (expire: every 5min, reminders: every 10min)');

  // Google Places coordinates are retained for no more than 30 days.
  const { expireOldCandidateCoordinates } = require('./services/parkingCandidateScanService');
  cron.schedule('30 2 * * *', async () => {
    try {
      await expireOldCandidateCoordinates();
    } catch (error) {
      logger.error('[Cron] Candidate coordinate cleanup failed:', error);
    }
  });

  const { aggregateCompletedCrowdParking } = require('./services/crowdParkingAggregation');
  cron.schedule('5 * * * *', async () => {
    try {
      const result = await aggregateCompletedCrowdParking();
      logger.info('[Cron] Aggregated external parking guidance', result);
    } catch (error) {
      logger.error('[Cron] External parking guidance aggregation failed', { error: error.message });
    }
  });

  cron.schedule('15 2 * * *', async () => {
    try {
      const result = await pruneWebPerformanceMetrics();
      logger.info(`Pruned ${result.count} expired web performance samples`);
    } catch (error) {
      logger.error('Failed to prune expired web performance samples', { error: error.message });
    }
  });
  logger.info('Web performance sample retention scheduled (90 days)');
}

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server.listen(port, '0.0.0.0', () => {
    console.log(`Backend listening at http://localhost:${port}`);
    console.log(`Network access: http://192.168.100.176:${port}`);
  });
}

// Export app for testing
module.exports = app;
