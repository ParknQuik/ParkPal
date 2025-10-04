const parkingController = require('../controllers/parkingController');
const { authenticate } = require('../services/auth');

module.exports = (app) => {
  app.get('/api/slots', parkingController.getSlots);
  app.get('/api/slots/:id', parkingController.getSlotById);
  app.post('/api/slots', authenticate, parkingController.listSlot);
  app.put('/api/slots/:id', authenticate, parkingController.updateSlot);
  app.delete('/api/slots/:id', authenticate, parkingController.deleteSlot);
  app.post('/api/bookings', authenticate, parkingController.reserveSlot);
  app.get('/api/bookings', authenticate, parkingController.getUserBookings);
};
