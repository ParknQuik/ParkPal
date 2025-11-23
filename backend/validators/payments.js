const Joi = require('joi');

/**
 * Validator for creating a payment
 */
exports.createPaymentSchema = Joi.object({
  sessionId: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Session ID must be a number',
      'number.positive': 'Session ID must be positive'
    }),

  bookingId: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Booking ID must be a number',
      'number.positive': 'Booking ID must be positive'
    }),

  amount: Joi.number()
    .min(0)
    .max(100000)
    .required()
    .messages({
      'number.min': 'Amount must be at least 0',
      'number.max': 'Amount must be less than 100,000',
      'any.required': 'Amount is required'
    }),

  currency: Joi.string()
    .length(3)
    .uppercase()
    .default('PHP')
    .optional()
    .messages({
      'string.length': 'Currency must be a 3-letter code (e.g., PHP, USD)',
      'string.uppercase': 'Currency must be uppercase'
    }),

  paymentMethod: Joi.string()
    .valid('card', 'cash', 'gcash', 'paymaya', 'paymongo', 'debit', 'credit')
    .required()
    .messages({
      'any.only': 'Payment method must be one of: card, cash, gcash, paymaya, paymongo, debit, credit',
      'any.required': 'Payment method is required'
    }),

  description: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Description must be less than 500 characters'
    }),

  metadata: Joi.object()
    .optional()
    .messages({
      'object.base': 'Metadata must be an object'
    })
}).xor('sessionId', 'bookingId').messages({
  'object.xor': 'Either sessionId or bookingId must be provided, but not both'
});

/**
 * Validator for payment query parameters
 */
exports.getPaymentsQuerySchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'completed', 'failed', 'refunded')
    .optional(),

  paymentMethod: Joi.string()
    .valid('card', 'cash', 'gcash', 'paymaya', 'paymongo', 'debit', 'credit')
    .optional(),

  startDate: Joi.date()
    .iso()
    .optional(),

  endDate: Joi.date()
    .iso()
    .greater(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.greater': 'End date must be after start date'
    }),

  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional()
});
