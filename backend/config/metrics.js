const promClient = require('prom-client');

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'parkpal_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom metrics

// HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'parkpal_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// HTTP request counter
const httpRequestsTotal = new promClient.Counter({
  name: 'parkpal_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Active connections gauge
const activeConnections = new promClient.Gauge({
  name: 'parkpal_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

// WebSocket connections gauge
const wsConnections = new promClient.Gauge({
  name: 'parkpal_websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

// Database query duration histogram
const dbQueryDuration = new promClient.Histogram({
  name: 'parkpal_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Cache operations counter
const cacheOperations = new promClient.Counter({
  name: 'parkpal_cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status'], // operation: get/set/del, status: hit/miss/error
  registers: [register],
});

// Bookings counter
const bookingsTotal = new promClient.Counter({
  name: 'parkpal_bookings_total',
  help: 'Total number of bookings created',
  labelNames: ['status'], // pending, confirmed, completed, cancelled
  registers: [register],
});

// Revenue gauge (in PHP)
const revenueTotal = new promClient.Gauge({
  name: 'parkpal_revenue_total_php',
  help: 'Total revenue in PHP',
  labelNames: ['type'], // platform_fee, host_earnings, total
  registers: [register],
});

// Listings counter
const listingsTotal = new promClient.Counter({
  name: 'parkpal_listings_total',
  help: 'Total number of listings created',
  labelNames: ['slot_type'], // roadside_qr, commercial_manual, commercial_iot
  registers: [register],
});

// Active listings gauge
const activeListings = new promClient.Gauge({
  name: 'parkpal_active_listings',
  help: 'Number of currently active listings',
  labelNames: ['status'], // available, occupied, reserved
  registers: [register],
});

// Authentication attempts counter
const authAttempts = new promClient.Counter({
  name: 'parkpal_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'status'], // type: login/register, status: success/failure
  registers: [register],
});

// API errors counter
const apiErrors = new promClient.Counter({
  name: 'parkpal_api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['endpoint', 'error_type'],
  registers: [register],
});

// Middleware to track HTTP metrics
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  // Increment active connections
  activeConnections.inc();

  // Track response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode;

    // Record histogram
    httpRequestDuration.labels(req.method, route, statusCode).observe(duration);

    // Increment counter
    httpRequestsTotal.labels(req.method, route, statusCode).inc();

    // Decrement active connections
    activeConnections.dec();
  });

  next();
}

// Helper functions to record metrics

function recordBooking(status) {
  bookingsTotal.labels(status).inc();
}

function recordRevenue(type, amount) {
  revenueTotal.labels(type).set(amount);
}

function recordListing(slotType) {
  listingsTotal.labels(slotType).inc();
}

function updateActiveListings(status, count) {
  activeListings.labels(status).set(count);
}

function recordAuthAttempt(type, success) {
  const status = success ? 'success' : 'failure';
  authAttempts.labels(type, status).inc();
}

function recordApiError(endpoint, errorType) {
  apiErrors.labels(endpoint, errorType).inc();
}

function recordDbQuery(operation, model, duration) {
  dbQueryDuration.labels(operation, model).observe(duration);
}

function recordCacheOperation(operation, status) {
  cacheOperations.labels(operation, status).inc();
}

function updateWsConnections(count) {
  wsConnections.set(count);
}

// Metrics endpoint handler
async function getMetrics(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
}

module.exports = {
  register,
  metricsMiddleware,
  getMetrics,
  // Metric recorders
  recordBooking,
  recordRevenue,
  recordListing,
  updateActiveListings,
  recordAuthAttempt,
  recordApiError,
  recordDbQuery,
  recordCacheOperation,
  updateWsConnections,
};
