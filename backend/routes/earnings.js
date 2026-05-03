const earningsController = require('../controllers/earningsController');
const { authenticate } = require('../services/auth');
const { asyncHandler } = require('../middleware/errorHandler');

module.exports = (app) => {
  app.get(
    '/earnings/summary',
    authenticate,
    asyncHandler(earningsController.getEarningsSummary));

  app.get(
    '/earnings/transactions',
    authenticate,
    asyncHandler(earningsController.getTransactions));

  app.get(
    '/earnings/analytics',
    authenticate,
    asyncHandler(earningsController.getAnalytics));

  app.post(
    '/earnings/payout',
    authenticate,
    asyncHandler(earningsController.requestPayout));
};
