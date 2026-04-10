const Joi = require('joi');

exports.createListingSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title must be less than 200 characters',
      'any.required': 'Title is required'
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

  lat: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'any.required': 'Latitude is required'
    }),

  lon: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'any.required': 'Longitude is required'
    }),

  price: Joi.number()
    .min(0)
    .max(10000)
    .required()
    .messages({
      'number.min': 'Price must be at least 0',
      'number.max': 'Price must be less than 10,000',
      'any.required': 'Price is required'
    }),

  description: Joi.string()
    .max(2000)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Description must be less than 2000 characters'
    }),

  amenities: Joi.array()
    .items(Joi.string().max(100))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Maximum 20 amenities allowed'
    }),

  photos: Joi.array()
    .items(Joi.string().uri())
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 photos allowed',
      'string.uri': 'Photo must be a valid URL'
    }),

  availableFrom: Joi.date()
    .iso()
    .optional(),

  availableTo: Joi.date()
    .iso()
    .greater(Joi.ref('availableFrom'))
    .optional()
    .messages({
      'date.greater': 'Available to date must be after available from date'
    }),

  vehicleType: Joi.string()
    .valid('car', 'motorcycle', 'suv', 'van', 'truck')
    .optional(),

  accessType: Joi.string()
    .valid('24/7', 'scheduled', 'on-demand')
    .optional(),

  maxHeight: Joi.number()
    .min(0)
    .max(10)
    .optional()
    .messages({
      'number.min': 'Max height must be positive',
      'number.max': 'Max height must be less than 10 meters'
    }),

  zoneId: Joi.number()
    .integer()
    .positive()
    .optional(),

  slotType: Joi.string()
    .valid('roadside_qr', 'commercial_manual', 'commercial_iot')
    .optional()
});

exports.updateListingSchema = Joi.object({
  address: Joi.string().min(10).max(500).optional(),
  price: Joi.number().min(0).max(10000).optional(),
  description: Joi.string().max(2000).optional().allow(null, ''),
  amenities: Joi.array().items(Joi.string().max(100)).max(20).optional(),
  photos: Joi.array().items(Joi.string().uri()).max(10).optional(),
  availableFrom: Joi.date().iso().optional(),
  availableTo: Joi.date().iso().optional(),
  vehicleType: Joi.string().valid('car', 'motorcycle', 'suv', 'van', 'truck').optional(),
  accessType: Joi.string().valid('24/7', 'scheduled', 'on-demand').optional(),
  maxHeight: Joi.number().min(0).max(10).optional(),
  status: Joi.string().valid('available', 'unavailable', 'pending').optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided'
});

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

  startTime: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.min': 'Start time must be in the future',
      'any.required': 'Start time is required'
    }),

  endTime: Joi.date()
    .iso()
    .greater(Joi.ref('startTime'))
    .required()
    .messages({
      'date.greater': 'End time must be after start time',
      'any.required': 'End time is required'
    }),

  vehicleType: Joi.string()
    .valid('car', 'motorcycle', 'suv', 'van', 'truck')
    .optional(),

  licensePlate: Joi.string()
    .pattern(/^[A-Z0-9\-]+$/)
    .max(15)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid license plate format (use uppercase letters, numbers, and hyphens only)',
      'string.max': 'License plate must be less than 15 characters'
    })
});

exports.reviewSchema = Joi.object({
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.min': 'Rating must be between 1 and 5',
      'number.max': 'Rating must be between 1 and 5',
      'any.required': 'Rating is required'
    }),

  comment: Joi.string()
    .max(1000)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Comment must be less than 1000 characters'
    }),

  slotId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Slot ID is required'
    }),

  bookingId: Joi.number()
    .integer()
    .positive()
    .optional()
});

exports.searchListingsSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).optional(),
  lon: Joi.number().min(-180).max(180).optional(),
  radius: Joi.number().min(0).max(50).default(5).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().max(10000).optional(),
  vehicleType: Joi.string().valid('car', 'motorcycle', 'suv', 'van', 'truck').optional(),
  amenities: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string() // Allow comma-separated string from query params
  ).optional(),
  availableFrom: Joi.date().iso().optional(),
  availableTo: Joi.date().iso().optional(),
  slotType: Joi.string().optional(),
  status: Joi.string().valid('available', 'occupied', 'reserved').optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional()
});

// QR Code validation schemas
exports.qrCheckinSchema = Joi.object({
  qrData: Joi.string()
    .pattern(/^PARKPAL:[0-9]+:[0-9]+:[a-zA-Z0-9]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid QR code format',
      'any.required': 'QR code data is required'
    }),
  bookingId: Joi.number()
    .integer()
    .positive()
    .optional()
});

exports.qrCheckoutSchema = Joi.object({
  sessionId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Session ID must be a number',
      'number.positive': 'Session ID must be positive',
      'any.required': 'Session ID is required'
    })
});

// ID parameter validation
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

// Host earnings query parameters
exports.hostEarningsQuerySchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Start date must be in ISO format (YYYY-MM-DD)'
    }),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
      'date.min': 'End date must be after start date'
    })
});
