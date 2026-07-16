const logger = require('./logger');

/**
 * Environment Variable Validation
 * Validates required environment variables on startup
 */

const REQUIRED_VARS = {
  production: [
    'DATABASE_URL',
    'GCS_BUCKET_NAME',
    'JWT_SECRET',
    'NODE_ENV',
    'PORT',
  ],
  development: [
    'DATABASE_URL',
    'GCS_BUCKET_NAME',
    'JWT_SECRET',
  ],
  test: [
    'DATABASE_URL',
    'JWT_SECRET',
  ],
};

const RECOMMENDED_VARS = [
  'REDIS_URL',
  'PAYMONGO_SECRET_KEY',
  'PAYMONGO_PUBLIC_KEY',
  'GOOGLE_MAPS_API_KEY',
  'GOOGLE_PLACES_API_KEY',
  'FRONTEND_URL',
];

const SECRET_VARS = [
  'JWT_SECRET',
  'QR_SECRET',
  'PAYMONGO_SECRET_KEY',
  'PAYMONGO_WEBHOOK_SECRET',
];

/**
 * Validate JWT secret strength
 */
function validateJwtSecret(secret) {
  if (!secret) return false;

  // Check if it's a placeholder
  const placeholders = [
    'your_jwt_secret',
    'change_this',
    'test_jwt',
    'development',
  ];

  const isPlaceholder = placeholders.some(p =>
    secret.toLowerCase().includes(p)
  );

  if (isPlaceholder && process.env.NODE_ENV === 'production') {
    return false;
  }

  // In production, require at least 64 characters
  if (process.env.NODE_ENV === 'production' && secret.length < 64) {
    return false;
  }

  // In development, require at least 32 characters
  if (secret.length < 32) {
    return false;
  }

  return true;
}

/**
 * Validate database URL format
 */
function validateDatabaseUrl(url) {
  if (!url) return false;

  // Check if it's PostgreSQL
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    logger.warn('Database URL should use PostgreSQL (not SQLite or other)');
    return process.env.NODE_ENV !== 'production';
  }

  // In production, check for SSL
  if (process.env.NODE_ENV === 'production' && !url.includes('sslmode=require')) {
    logger.warn('Production database should use SSL (sslmode=require)');
  }

  // Check for connection pooling parameters
  if (!url.includes('connection_limit')) {
    logger.warn('Database URL missing connection_limit parameter (recommended: 20)');
  }

  return true;
}

/**
 * Check if a variable looks like a secret that should be rotated
 */
function isWeakSecret(varName, value) {
  if (!SECRET_VARS.includes(varName)) return false;
  if (!value) return true;

  const weakPatterns = [
    'test',
    'development',
    'placeholder',
    'your_',
    'change_this',
    'example',
    'demo',
  ];

  return weakPatterns.some(pattern =>
    value.toLowerCase().includes(pattern)
  );
}

/**
 * Validate all environment variables
 */
function validateEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  const errors = [];
  const warnings = [];

  logger.info(`Validating environment variables for: ${env}`);

  // Check required variables
  const required = REQUIRED_VARS[env] || REQUIRED_VARS.development;

  required.forEach(varName => {
    const value = process.env[varName];

    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`);
      return;
    }

    // Specific validations
    if (varName === 'JWT_SECRET') {
      if (!validateJwtSecret(value)) {
        if (env === 'production') {
          errors.push('JWT_SECRET is weak or placeholder (requires 64+ chars in production)');
        } else {
          warnings.push('JWT_SECRET is weak (should be 64+ chars)');
        }
      }
    }

    if (varName === 'DATABASE_URL') {
      if (!validateDatabaseUrl(value)) {
        if (env === 'production') {
          errors.push('DATABASE_URL is invalid or not PostgreSQL');
        } else {
          warnings.push('DATABASE_URL should use PostgreSQL for production');
        }
      }
    }

    if (varName === 'NODE_ENV') {
      const validEnvs = ['development', 'production', 'test'];
      if (!validEnvs.includes(value)) {
        warnings.push(`NODE_ENV="${value}" is not standard (use: ${validEnvs.join(', ')})`);
      }
    }
  });

  // Check recommended variables
  RECOMMENDED_VARS.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(`Recommended variable not set: ${varName}`);
    }
  });

  if (env !== 'test' && process.env.GOOGLE_AUTH_ENABLED !== 'false' && !process.env.GOOGLE_CLIENT_ID) {
    warnings.push('GOOGLE_CLIENT_ID is required for Google Sign-In id_token audience verification');
  }

  // Check for weak secrets in production
  if (env === 'production') {
    SECRET_VARS.forEach(varName => {
      const value = process.env[varName];
      if (value && isWeakSecret(varName, value)) {
        warnings.push(`${varName} appears to be a test/placeholder value - rotate for production`);
      }
    });
  }

  // Check for development-only features in production
  if (env === 'production') {
    if (process.env.USE_SECRET_MANAGER !== 'true') {
      warnings.push('USE_SECRET_MANAGER should be "true" in production');
    }
  }

  // Report results
  if (errors.length > 0) {
    logger.error('Environment validation failed:');
    errors.forEach(err => logger.error(`  - ${err}`));

    if (env === 'production') {
      throw new Error(`Environment validation failed: ${errors.length} error(s)`);
    }
  }

  if (warnings.length > 0) {
    logger.warn('Environment validation warnings:');
    warnings.forEach(warn => logger.warn(`  - ${warn}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    logger.info('Environment validation passed - all checks OK');
  } else {
    logger.info(`Environment validation: ${errors.length} error(s), ${warnings.length} warning(s)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Print environment summary (without exposing secrets)
 */
function printEnvironmentSummary() {
  const env = process.env.NODE_ENV || 'development';

  logger.info('Environment Configuration:');
  logger.info(`  Node Environment: ${env}`);
  logger.info(`  Port: ${process.env.PORT || '3001'}`);
  logger.info(`  Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Not configured'}`);
  logger.info(`  GCS Bucket: ${process.env.GCS_BUCKET_NAME || 'Not configured'}`);
  logger.info(`  Redis: ${process.env.REDIS_URL ? 'Enabled' : 'Disabled'}`);
  logger.info(`  Secret Manager: ${process.env.USE_SECRET_MANAGER === 'true' ? 'Enabled' : 'Disabled'}`);
  logger.info(`  JWT Secret: ${process.env.JWT_SECRET ? 'Set (' + process.env.JWT_SECRET.length + ' chars)' : 'Not set'}`);
  logger.info(`  PayMongo: ${process.env.PAYMONGO_SECRET_KEY ? 'Configured' : 'Not configured'}`);
  logger.info(`  Google Maps: ${process.env.GOOGLE_MAPS_API_KEY ? 'Configured' : 'Not configured'}`);
  logger.info(`  Google Places: ${process.env.GOOGLE_PLACES_API_KEY ? 'Configured' : 'Not configured'}`);
  logger.info(`  Google Auth: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'}`);
  logger.info(`  Google Parking Scan: ${process.env.GOOGLE_PARKING_SCAN_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
}

module.exports = {
  validateEnvironment,
  printEnvironmentSummary,
  validateJwtSecret,
  validateDatabaseUrl,
};
