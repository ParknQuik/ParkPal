const { ApiError } = require('./errorHandler');
const { localMfaBypass } = require('../services/adminMfa');

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return next(ApiError.forbidden('Admin access required'));
  }
  if (!req.user.mfaVerified && !localMfaBypass()) {
    return next(ApiError.forbidden('Admin MFA verification required'));
  }
  return next();
}

function requirePlatformOwner(req, res, next) {
  if (req.user?.role !== 'admin' || req.user?.isPlatformOwner !== true) {
    return next(ApiError.forbidden('Platform owner access required'));
  }
  if (!req.user.mfaVerified && !localMfaBypass()) {
    return next(ApiError.forbidden('Admin MFA verification required'));
  }
  return next();
}

module.exports = { requireAdmin, requirePlatformOwner };
