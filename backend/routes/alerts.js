const alertsController = require('../controllers/alertsController');

module.exports = (app) => {
  app.get('/api/alerts', alertsController.getAlerts);
};
