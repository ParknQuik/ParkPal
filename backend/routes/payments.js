const paymentsController = require('../controllers/paymentsController');
const { authenticate } = require('../services/auth');
const { validateBody, validateQuery } = require('../middleware/validation');
const {
  createPaymentSchema,
  getPaymentsQuerySchema
} = require('../validators/payments');

module.exports = (app) => {
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

  app.get('/payments/:id', authenticate, paymentsController.getPaymentById);
};
