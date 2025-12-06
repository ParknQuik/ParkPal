const paymentsController = require('../controllers/paymentsController');
const { authenticate } = require('../services/auth');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const {
  createPaymentSchema,
  getPaymentsQuerySchema,
  idParamSchema
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

  app.get(
    '/payments/:id',
    authenticate,
    validateParams(idParamSchema),
    paymentsController.getPaymentById
  );
};
