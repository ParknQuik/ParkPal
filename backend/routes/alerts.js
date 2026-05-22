const alertsController = require('../controllers/alertsController');
const { asyncHandler } = require('../middleware/errorHandler');

module.exports = (app) => {
  app.get('/alerts', asyncHandler(alertsController.getAlerts));
};
