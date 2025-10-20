const Joi = require('joi');

// Password validation regex - matches backend PASSWORD_POLICY.md requirements
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,72}$/;

exports.registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must be less than 100 characters',
      'any.required': 'Name is required'
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .min(8)
    .max(72)
    .pattern(passwordRegex)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password must be less than 72 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),

  role: Joi.string()
    .valid('driver', 'host', 'admin', 'operator')
    .default('driver')
    .messages({
      'any.only': 'Role must be one of: driver, host, admin, operator'
    }),

  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Invalid phone number format (use E.164 format, e.g., +639171234567)'
    })
});

exports.loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

exports.updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional(),

  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .allow(null, ''),

  // Don't allow email or role updates for security
}).min(1).messages({
  'object.min': 'At least one field must be provided'
});

exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .max(72)
    .pattern(passwordRegex)
    .required()
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'string.min': 'New password must be at least 8 characters',
      'string.max': 'New password must be less than 72 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required',
      'any.invalid': 'New password must be different from current password'
    })
});
