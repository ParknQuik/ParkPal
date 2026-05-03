const paymentsController = require('../controllers/paymentsController');
const { authenticate } = require('../services/auth');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const {
  createPaymentSchema,
  confirmPaymentSchema,
  getPaymentsQuerySchema,
  idParamSchema
} = require('../validators/payments');
const { asyncHandler } = require('../middleware/errorHandler');

module.exports = (app) => {
  // PayMongo Payment Intent flow (RECOMMENDED)
  app.post(
    '/payments/intent',
    authenticate,
    validateBody(createPaymentSchema),
    asyncHandler(paymentsController.createPaymentIntent));

  app.post(
    '/payments/confirm',
    authenticate,
    validateBody(confirmPaymentSchema),
    asyncHandler(paymentsController.confirmPayment));

   // GCash direct payment (alternative flow)
   app.post(
     '/payments/gcash',
     authenticate,
     validateBody(createPaymentSchema),
     asyncHandler(paymentsController.createGCashPayment));

   // Legacy payment endpoint (backward compatibility)
  app.post(
    '/payments',
    authenticate,
    validateBody(createPaymentSchema),
    asyncHandler(paymentsController.processPayment));

  app.get(
    '/payments',
    authenticate,
    validateQuery(getPaymentsQuerySchema),
    asyncHandler(paymentsController.getUserPayments));

  app.get(
    '/payments/:id',
    authenticate,
    validateParams(idParamSchema),
    asyncHandler(paymentsController.getPaymentById));
};
