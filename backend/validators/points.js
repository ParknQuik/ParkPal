const Joi = require('joi');

exports.earnPointsSchema = Joi.object({
  bookingId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Booking ID must be a number',
      'number.integer': 'Booking ID must be an integer',
      'number.positive': 'Booking ID must be a positive number',
      'any.required': 'Booking ID is required'
    }),
  
  amount: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Amount must be a number',
      'number.integer': 'Amount must be an integer',
      'number.positive': 'Amount must be a positive number'
    })
});

exports.redeemPointsSchema = Joi.object({
  amount: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.integer': 'Amount must be an integer',
      'number.positive': 'Amount must be a positive number',
      'any.required': 'Amount is required'
    }),
  
  bookingId: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Booking ID must be a number',
      'number.integer': 'Booking ID must be an integer',
      'number.positive': 'Booking ID must be a positive number'
    })
});

exports.validateReferralCodeSchema = Joi.object({
  referralCode: Joi.string()
    .min(3)
    .max(20)
    .required()
    .messages({
      'string.base': 'Referral code must be a string',
      'string.min': 'Referral code must be at least 3 characters long',
      'string.max': 'Referral code must be at most 20 characters long',
      'any.required': 'Referral code is required'
    })
});

exports.processReferralRewardSchema = Joi.object({
  referredUserId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Referred user ID must be a number',
      'number.integer': 'Referred user ID must be an integer',
      'number.positive': 'Referred user ID must be a positive number',
      'any.required': 'Referred user ID is required'
    })
});