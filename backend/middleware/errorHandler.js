/**
 * Custom API Error class
 * Allows throwing errors with specific status codes and details
 */
class ApiError extends Error {
  constructor(statusCode, message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error factory methods
 */
ApiError.badRequest = (message, details) => new ApiError(400, message, details);
ApiError.unauthorized = (message = 'Unauthorized') => new ApiError(401, message);
ApiError.forbidden = (message = 'Forbidden') => new ApiError(403, message);
ApiError.notFound = (message, details) => new ApiError(404, message, details);
ApiError.conflict = (message, details) => new ApiError(409, message, details);
ApiError.internal = (message = 'Internal server error') => new ApiError(500, message);

/**
 * Global error handling middleware
 * Catches all errors and formats response
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 Internal Server Error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || {};

  // Handle specific error types

  // Prisma errors
  if (err.code === 'P2002') {
    // Unique constraint violation
    statusCode = 409;
    message = 'A record with this value already exists';
    details = {
      field: err.meta?.target || 'unknown',
      constraint: 'unique'
    };
  } else if (err.code === 'P2025') {
    // Record not found
    statusCode = 404;
    message = 'Record not found';
  } else if (err.code?.startsWith('P')) {
    // Other Prisma errors
    statusCode = 400;
    message = 'Database operation failed';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Validation errors (if Joi errors slip through)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  }

  // Build error response
  const response = {
    success: false,
    error: {
      message,
      statusCode,
      ...(Object.keys(details).length > 0 && { details })
    }
  };

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
    response.error.name = err.name;
  }

  // Log error
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  console[logLevel]('[ERROR]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    statusCode,
    message,
    userId: req.user?.id,
    ...(statusCode >= 500 && { stack: err.stack })
  });

  // Send response
  res.status(statusCode).json(response);
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = ApiError.notFound(
    `Route ${req.method} ${req.path} not found`,
    {
      method: req.method,
      path: req.path
    }
  );
  next(error);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch promise rejections
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
