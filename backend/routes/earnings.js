const earningsController = require('../controllers/earningsController');
const { authenticate } = require('../services/auth');

module.exports = (app) => {
  app.get(
    '/earnings/summary',
    authenticate,
    earningsController.getEarningsSummary
  );

  app.get(
    '/earnings/transactions',
    authenticate,
    earningsController.getTransactions
  );

  app.get(
    '/earnings/analytics',
    authenticate,
    earningsController.getAnalytics
  );

  app.post(
    '/earnings/payout',
    authenticate,
    earningsController.requestPayout
  );
};
