const Joi = require('joi');

exports.parkingCandidateScanSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lon: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().integer().min(1).max(50000).required(),
  type: Joi.string().valid('parking', 'parking_lot', 'parking_garage').default('parking'),
});

exports.parkingCandidateListSchema = Joi.object({
  status: Joi.string()
    .valid('candidate_preview', 'geofence_verified', 'commercial_verified', 'rejected')
    .optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),
});

exports.parkingCandidateIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

exports.parkingCandidateGeofenceSchema = Joi.object({
  centerLat: Joi.number().min(-90).max(90).required(),
  centerLon: Joi.number().min(-180).max(180).required(),
  radiusMeters: Joi.number().positive().max(50000).required(),
  geofencePolygon: Joi.string().min(2).required(),
});

exports.parkingCandidateRejectSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(1000).required(),
});
