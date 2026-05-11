const pointsController = require('../controllers/pointsController');
const { authenticate } = require('../services/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody } = require('../middleware/validation');
const {
  earnPointsSchema,
  redeemPointsSchema,
  validateReferralCodeSchema,
  processReferralRewardSchema
} = require('../validators/points');

/**
 * Points and Referrals Routes
 * All routes require authentication
 */
module.exports = (app) => {
  // Points routes
  app.get('/points/balance', authenticate, asyncHandler(pointsController.getBalance));
  app.post('/points/earn', authenticate, validateBody(earnPointsSchema), asyncHandler(pointsController.earnPoints));
  app.post('/points/redeem', authenticate, validateBody(redeemPointsSchema), asyncHandler(pointsController.redeemPoints));
  app.get('/points/history', authenticate, asyncHandler(pointsController.getHistory));

  // Referral routes
  app.post('/referrals/generate', authenticate, asyncHandler(pointsController.generateReferralCode));
  app.post('/referrals/validate', authenticate, validateBody(validateReferralCodeSchema), asyncHandler(pointsController.validateReferralCode));
  app.get('/referrals/stats', authenticate, asyncHandler(pointsController.getReferralStats));
  app.post('/referrals/process', authenticate, validateBody(processReferralRewardSchema), asyncHandler(pointsController.processReferralReward));
};