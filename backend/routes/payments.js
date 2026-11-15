const paymentsController = require('../controllers/paymentsController');
const { authenticate } = require('../services/auth');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const {
  createPaymentIntentSchema,
  createExtensionIntentSchema,
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
    validateBody(createPaymentIntentSchema),
    asyncHandler(paymentsController.createPaymentIntent));

  app.post(
    '/payments/confirm',
    authenticate,
    validateBody(confirmPaymentSchema),
    asyncHandler(paymentsController.confirmPayment));

  app.post(
    '/payments/extension-intent',
    authenticate,
    validateBody(createExtensionIntentSchema),
    asyncHandler(paymentsController.createExtensionIntent));

   // GCash direct payment (alternative flow)
   app.post(
     '/payments/gcash',
     authenticate,
     asyncHandler(paymentsController.createGCashPayment));

   // Legacy payment endpoint (backward compatibility)
  app.post(
    '/payments',
    authenticate,
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
