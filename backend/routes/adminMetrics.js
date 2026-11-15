const { authenticate } = require('../services/auth');
const { requireAdmin } = require('../middleware/adminGuard');
const adminMetricsController = require('../controllers/adminMetricsController');

module.exports = (router) => {
  router.get('/admin/dashboard/metrics', authenticate, requireAdmin, adminMetricsController.getDashboardMetrics);
};
