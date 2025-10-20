const alertsController = require('../controllers/alertsController');

module.exports = (app) => {
  app.get('/alerts', alertsController.getAlerts);
};
