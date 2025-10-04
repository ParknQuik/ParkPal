const paymentsController = require('../controllers/paymentsController');
const { authenticate } = require('../services/auth');

module.exports = (app) => {
  app.post('/api/payments', authenticate, paymentsController.processPayment);
  app.get('/api/payments', authenticate, paymentsController.getUserPayments);
  app.get('/api/payments/:id', authenticate, paymentsController.getPaymentById);
};
