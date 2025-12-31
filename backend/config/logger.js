const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston about our colors
winston.addColors(colors);

// Determine the log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => {
          const { timestamp, level, message, ...meta } = info;
          let msg = `${timestamp} [${level}]: ${message}`;

          // Add metadata if present
          if (Object.keys(meta).length > 0) {
            // Filter out empty objects and symbols
            const cleanMeta = {};
            for (const key in meta) {
              if (meta[key] && typeof meta[key] !== 'symbol' && key !== 'Symbol(level)') {
                cleanMeta[key] = meta[key];
              }
            }
            if (Object.keys(cleanMeta).length > 0) {
              msg += ` ${JSON.stringify(cleanMeta)}`;
            }
          }

          return msg;
        }
      )
    ),
  }),

  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Combined log file
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Don't exit on uncaught errors
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    // Remove trailing newline
    logger.http(message.trim());
  },
};

// Helper functions for common log patterns
logger.logRequest = (req, statusCode, responseTime) => {
  logger.http(`${req.method} ${req.path} ${statusCode} - ${responseTime}ms`, {
    method: req.method,
    path: req.path,
    statusCode,
    responseTime,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};

logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

logger.logApiCall = (service, endpoint, status, duration) => {
  logger.info(`External API call: ${service} ${endpoint}`, {
    service,
    endpoint,
    status,
    duration,
  });
};

logger.logCacheOperation = (operation, key, hit = null) => {
  const msg = hit !== null
    ? `Cache ${operation}: ${key} - ${hit ? 'HIT' : 'MISS'}`
    : `Cache ${operation}: ${key}`;

  logger.debug(msg, { operation, key, hit });
};

logger.logDatabaseQuery = (query, duration) => {
  logger.debug(`Database query: ${query}`, {
    query,
    duration,
  });
};

logger.logAuth = (action, userId, success, reason = null) => {
  const level = success ? 'info' : 'warn';
  const msg = `Auth ${action}: User ${userId} - ${success ? 'SUCCESS' : 'FAILED'}`;

  logger[level](msg, {
    action,
    userId,
    success,
    reason,
  });
};

logger.logWebSocket = (event, userId, data = {}) => {
  logger.info(`WebSocket ${event}: User ${userId}`, {
    event,
    userId,
    ...data,
  });
};

// Log startup information
logger.logStartup = () => {
  logger.info('='.repeat(60));
  logger.info('ParkPal Backend Starting');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Log Level: ${level()}`);
  logger.info(`Port: ${process.env.PORT || 3001}`);
  logger.info(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Not configured'}`);
  logger.info(`Redis: ${process.env.REDIS_URL ? 'Enabled' : 'Disabled'}`);
  logger.info(`Secret Manager: ${process.env.USE_SECRET_MANAGER === 'true' ? 'Enabled' : 'Disabled'}`);
  logger.info('='.repeat(60));
};

module.exports = logger;
