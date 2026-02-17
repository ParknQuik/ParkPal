const Joi = require('joi');

/**
 * Analytics API Validation Schemas
 * Service 1 - Smart Parking Analytics
 */

// Valid activity types from Activity Recognition API
const ACTIVITY_TYPES = ['IN_VEHICLE', 'STILL', 'ON_FOOT', 'WALKING', 'RUNNING', 'ON_BICYCLE'];

// Valid zone types
const ZONE_TYPES = ['commercial', 'roadside', 'residential'];

// Valid period types for metrics
const PERIOD_TYPES = ['hourly', 'daily'];

/**
 * POST /api/v1/analytics/zone/enter
 * User enters a parking zone
 */
exports.zoneEnterSchema = Joi.object({
  userId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'User ID must be a number',
      'number.integer': 'User ID must be an integer',
      'number.positive': 'User ID must be positive',
      'any.required': 'User ID is required'
    }),

  zoneId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Zone ID must be a number',
      'number.integer': 'Zone ID must be an integer',
      'number.positive': 'Zone ID must be positive',
      'any.required': 'Zone ID is required'
    }),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.base': 'Latitude must be a number',
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'any.required': 'Latitude is required'
    }),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.base': 'Longitude must be a number',
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'any.required': 'Longitude is required'
    })
});

/**
 * POST /api/v1/analytics/activity
 * Log user activity update
 */
exports.activityLogSchema = Joi.object({
  userId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'User ID must be a number',
      'number.integer': 'User ID must be an integer',
      'number.positive': 'User ID must be positive',
      'any.required': 'User ID is required'
    }),

  sessionId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Session ID must be a number',
      'number.integer': 'Session ID must be an integer',
      'number.positive': 'Session ID must be positive',
      'any.required': 'Session ID is required'
    }),

  activityType: Joi.string()
    .valid(...ACTIVITY_TYPES)
    .required()
    .messages({
      'string.base': 'Activity type must be a string',
      'any.only': `Activity type must be one of: ${ACTIVITY_TYPES.join(', ')}`,
      'any.required': 'Activity type is required'
    }),

  confidence: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.base': 'Confidence must be a number',
      'number.integer': 'Confidence must be an integer',
      'number.min': 'Confidence must be between 0 and 100',
      'number.max': 'Confidence must be between 0 and 100',
      'any.required': 'Confidence is required'
    }),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Latitude must be a number',
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90'
    }),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Longitude must be a number',
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180'
    })
});

/**
 * POST /api/v1/analytics/zone/exit
 * User exits parking zone
 */
exports.zoneExitSchema = Joi.object({
  sessionId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Session ID must be a number',
      'number.integer': 'Session ID must be an integer',
      'number.positive': 'Session ID must be positive',
      'any.required': 'Session ID is required'
    }),

  exitTime: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'Exit time must be a valid date',
      'date.format': 'Exit time must be in ISO 8601 format'
    }),

  parked: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Parked must be a boolean'
    })
});

/**
 * GET /api/v1/analytics/zones/:zoneId/availability
 * Param validation
 */
exports.zoneIdParamSchema = Joi.object({
  zoneId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Zone ID must be a number',
      'number.integer': 'Zone ID must be an integer',
      'number.positive': 'Zone ID must be positive',
      'any.required': 'Zone ID is required'
    })
});

/**
 * GET /api/v1/analytics/sessions/:sessionId
 * Param validation
 */
exports.sessionIdParamSchema = Joi.object({
  sessionId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Session ID must be a number',
      'number.integer': 'Session ID must be an integer',
      'number.positive': 'Session ID must be positive',
      'any.required': 'Session ID is required'
    })
});

/**
 * GET /api/v1/analytics/zones/:zoneId/metrics
 * Query validation
 */
exports.zoneMetricsQuerySchema = Joi.object({
  period: Joi.string()
    .valid(...PERIOD_TYPES)
    .default('hourly')
    .messages({
      'string.base': 'Period must be a string',
      'any.only': `Period must be one of: ${PERIOD_TYPES.join(', ')}`
    }),

  from: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'From date must be a valid date',
      'date.format': 'From date must be in ISO 8601 format'
    }),

  to: Joi.date()
    .iso()
    .optional()
    .min(Joi.ref('from'))
    .messages({
      'date.base': 'To date must be a valid date',
      'date.format': 'To date must be in ISO 8601 format',
      'date.min': 'To date must be after from date'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(24)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must be at most 1000'
    })
});

/**
 * GET /api/v1/analytics/zones
 * Query validation
 */
exports.zonesListQuerySchema = Joi.object({
  city: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.base': 'City must be a string',
      'string.max': 'City must be less than 100 characters'
    }),

  type: Joi.string()
    .valid(...ZONE_TYPES)
    .optional()
    .messages({
      'string.base': 'Type must be a string',
      'any.only': `Type must be one of: ${ZONE_TYPES.join(', ')}`
    }),

  isActive: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'isActive must be a boolean'
    })
});

module.exports = exports;
