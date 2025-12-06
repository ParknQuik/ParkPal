const Joi = require('joi');

/**
 * Validator for creating a parking slot (legacy /slots endpoint)
 * Note: This is deprecated in favor of /marketplace/listings
 */
exports.createSlotSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(100)
    .optional() // Make optional since marketplace API doesn't use title
    .messages({
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title must be less than 100 characters'
    }),

  address: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Address must be at least 10 characters',
      'string.max': 'Address must be less than 500 characters',
      'any.required': 'Address is required'
    }),

  // Accept both lat/latitude for compatibility
  lat: Joi.number()
    .min(-90)
    .max(90)
    .optional(),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional(),

  // Accept both lon/longitude for compatibility
  lon: Joi.number()
    .min(-180)
    .max(180)
    .optional(),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional(),

  price: Joi.number()
    .min(0)
    .max(10000)
    .required()
    .messages({
      'number.min': 'Price must be at least 0',
      'number.max': 'Price must be less than 10,000',
      'any.required': 'Price is required'
    }),

  slotType: Joi.string().optional(),

  description: Joi.string()
    .max(2000)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Description must be less than 2000 characters'
    }),

  amenities: Joi.alternatives().try(
    Joi.object(),
    Joi.array().items(Joi.string())
  ).optional()
}).or('lat', 'latitude').or('lon', 'longitude').messages({
  'object.missing': 'Either lat or latitude must be provided',
  'object.missing': 'Either lon or longitude must be provided'
});

/**
 * Validator for updating a parking slot
 */
exports.updateSlotSchema = Joi.object({
  title: Joi.string().min(5).max(100).optional(),
  address: Joi.string().min(10).max(500).optional(),
  description: Joi.string().max(2000).optional().allow(null, ''),
  price: Joi.number().min(0).max(10000).optional(),
  availability: Joi.boolean().optional(),
  status: Joi.string().valid('available', 'occupied', 'reserved', 'out_of_service').optional(),
  amenities: Joi.alternatives().try(
    Joi.object(),
    Joi.array().items(Joi.string())
  ).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Validator for creating a booking (legacy /bookings endpoint)
 * Note: Prefer /marketplace/bookings for new bookings
 */
exports.createBookingSchema = Joi.object({
  slotId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Slot ID must be a number',
      'number.positive': 'Slot ID must be positive',
      'any.required': 'Slot ID is required'
    }),

  // Accept both startDate and startTime for compatibility
  startDate: Joi.date()
    .iso()
    .min('now')
    .optional(),

  startTime: Joi.date()
    .iso()
    .min('now')
    .optional(),

  // Accept both endDate and endTime for compatibility
  endDate: Joi.date()
    .iso()
    .optional(),

  endTime: Joi.date()
    .iso()
    .optional()
}).or('startDate', 'startTime').or('endDate', 'endTime')
  .custom((value, helpers) => {
    const start = value.startDate || value.startTime;
    const end = value.endDate || value.endTime;

    if (end && start && new Date(end) <= new Date(start)) {
      return helpers.error('date.greater');
    }

    return value;
  }).messages({
    'object.missing': 'Either startDate or startTime must be provided',
    'date.greater': 'End time must be after start time'
  });

/**
 * Validator for get slots query parameters
 */
exports.getSlotsQuerySchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  radius: Joi.number().min(0).max(50).default(5).optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional()
});

/**
 * Validator for ID path parameter
 */
exports.idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'ID must be a number',
      'number.positive': 'ID must be positive',
      'any.required': 'ID is required'
    })
});
