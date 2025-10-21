const paymentsController = require('../controllers/paymentsController');
const { authenticate } = require('../services/auth');

module.exports = (app) => {
  app.post('/payments', authenticate, paymentsController.processPayment);
  app.get('/payments', authenticate, paymentsController.getUserPayments);
  app.get('/payments/:id', authenticate, paymentsController.getPaymentById);
};
