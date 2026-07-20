const { ApiError } = require('./errorHandler');

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return next(ApiError.forbidden('Admin access required'));
  }
  return next();
}

module.exports = { requireAdmin };
