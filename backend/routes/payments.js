const paymentsController = require('../controllers/paymentsController');
const { authenticate } = require('../services/auth');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const {
  createPaymentSchema,
  getPaymentsQuerySchema,
  idParamSchema
} = require('../validators/payments');

module.exports = (app) => {
  // PayMongo Payment Intent flow (RECOMMENDED)
  app.post(
    '/payments/intent',
    authenticate,
    validateBody(createPaymentSchema),
    paymentsController.createPaymentIntent
  );

  app.post(
    '/payments/confirm',
    authenticate,
    paymentsController.confirmPayment
  );

  // GCash direct payment (alternative flow)
  app.post(
    '/payments/gcash',
    authenticate,
    validateBody(createPaymentSchema),
    paymentsController.createGCashPayment
  );

  // PayMongo Webhooks (no authentication - verified by signature)
  app.post(
    '/payments/webhook',
    paymentsController.handleWebhook
  );

  // Legacy payment endpoint (backward compatibility)
  app.post(
    '/payments',
    authenticate,
    validateBody(createPaymentSchema),
    paymentsController.processPayment
  );

  app.get(
    '/payments',
    authenticate,
    validateQuery(getPaymentsQuerySchema),
    paymentsController.getUserPayments
  );

  app.get(
    '/payments/:id',
    authenticate,
    validateParams(idParamSchema),
    paymentsController.getPaymentById
  );
};
