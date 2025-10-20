/**
 * Validation middleware using Joi
 * Validates request body, query, or params against a Joi schema
 */

/**
 * Validate request data against a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
exports.validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown keys
      convert: true // Convert values to correct types
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace original data with validated and sanitized data
    req[source] = value;

    // Also store in validatedData for clarity
    req.validatedData = value;

    next();
  };
};

/**
 * Validate body data (most common use case)
 */
exports.validateBody = (schema) => exports.validate(schema, 'body');

/**
 * Validate query parameters
 */
exports.validateQuery = (schema) => exports.validate(schema, 'query');

/**
 * Validate URL parameters
 */
exports.validateParams = (schema) => exports.validate(schema, 'params');
