const Joi = require('joi');

/**
 * Validator for generating upload URL
 */
exports.generateUploadUrlSchema = Joi.object({
  slotId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Slot ID must be a number',
      'number.positive': 'Slot ID must be positive',
      'any.required': 'Slot ID is required'
    }),

  fileName: Joi.string()
    .min(1)
    .max(255)
    .pattern(/\.(jpg|jpeg|png|webp)$/i)
    .required()
    .messages({
      'string.min': 'File name must not be empty',
      'string.max': 'File name must be less than 255 characters',
      'string.pattern.base': 'File must be a valid image (jpg, jpeg, png, webp)',
      'any.required': 'File name is required'
    })
});

/**
 * Validator for confirming upload
 */
exports.confirmUploadSchema = Joi.object({
  slotId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Slot ID must be a number',
      'number.positive': 'Slot ID must be positive',
      'any.required': 'Slot ID is required'
    }),

  fileName: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.min': 'File name must not be empty',
      'string.max': 'File name must be less than 500 characters',
      'any.required': 'File name is required'
    })
});

/**
 * Validator for photo ID path parameter
 */
exports.photoIdParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Photo ID must be a number',
      'number.positive': 'Photo ID must be positive',
      'any.required': 'Photo ID is required'
    })
});

/**
 * Validator for slot ID path parameter
 */
exports.slotIdParamSchema = Joi.object({
  slotId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Slot ID must be a number',
      'number.positive': 'Slot ID must be positive',
      'any.required': 'Slot ID is required'
    })
});
