const Joi = require('joi');

const triggerIndexSchema = Joi.object({
  dryRun: Joi.boolean().default(false),
  source: Joi.string().trim().max(120).allow(null),
  retries: Joi.number().integer().min(0).max(5).default(0),
});

const retrievalDebugSchema = Joi.object({
  query: Joi.string().trim().min(2).max(1000).required(),
  role: Joi.string().trim().max(40).default('user'),
  locale: Joi.string().trim().max(16).default('en'),
  tenant: Joi.string().trim().max(120).allow(null),
  version: Joi.string().trim().max(80).allow(null),
});

const ragTestSchema = retrievalDebugSchema.keys({
  generate: Joi.boolean().default(false),
});

const sourceQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  source: Joi.string().trim().max(120).allow(null),
});

module.exports = {
  triggerIndexSchema,
  retrievalDebugSchema,
  ragTestSchema,
  sourceQuerySchema,
};
