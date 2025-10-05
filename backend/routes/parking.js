const parkingController = require('../controllers/parkingController');
const { authenticate } = require('../services/auth');

module.exports = (app) => {
  /**
   * @swagger
   * /api/slots:
   *   get:
   *     summary: Get all parking slots
   *     tags: [Parking Spots]
   *     parameters:
   *       - in: query
   *         name: latitude
   *         schema:
   *           type: number
   *         description: Filter by latitude
   *       - in: query
   *         name: longitude
   *         schema:
   *           type: number
   *         description: Filter by longitude
   *       - in: query
   *         name: radius
   *         schema:
   *           type: number
   *         description: Search radius in kilometers
   *     responses:
   *       200:
   *         description: List of parking slots
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Slot'
   */
  app.get('/api/slots', parkingController.getSlots);

  /**
   * @swagger
   * /api/slots/{id}:
   *   get:
   *     summary: Get parking slot by ID
   *     tags: [Parking Spots]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Slot ID
   *     responses:
   *       200:
   *         description: Parking slot details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Slot'
   *       404:
   *         description: Slot not found
   */
  app.get('/api/slots/:id', parkingController.getSlotById);

  /**
   * @swagger
   * /api/slots:
   *   post:
   *     summary: Create a new parking slot (Host only)
   *     tags: [Parking Spots]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - address
   *               - latitude
   *               - longitude
   *               - price
   *             properties:
   *               title:
   *                 type: string
   *                 example: Downtown Parking
   *               description:
   *                 type: string
   *                 example: Covered parking near mall
   *               address:
   *                 type: string
   *                 example: 123 Main St
   *               latitude:
   *                 type: number
   *                 example: 40.7128
   *               longitude:
   *                 type: number
   *                 example: -74.0060
   *               price:
   *                 type: number
   *                 example: 15.50
   *               amenities:
   *                 type: object
   *                 example: { "covered": true, "ev_charging": false }
   *     responses:
   *       201:
   *         description: Slot created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Slot'
   *       401:
   *         description: Unauthorized
   */
  app.post('/api/slots', authenticate, parkingController.listSlot);

  /**
   * @swagger
   * /api/slots/{id}:
   *   put:
   *     summary: Update parking slot (Owner only)
   *     tags: [Parking Spots]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               price:
   *                 type: number
   *               availability:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Slot updated successfully
   *       403:
   *         description: Not authorized to update this slot
   */
  app.put('/api/slots/:id', authenticate, parkingController.updateSlot);

  /**
   * @swagger
   * /api/slots/{id}:
   *   delete:
   *     summary: Delete parking slot (Owner only)
   *     tags: [Parking Spots]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Slot deleted successfully
   *       403:
   *         description: Not authorized to delete this slot
   */
  app.delete('/api/slots/:id', authenticate, parkingController.deleteSlot);

  /**
   * @swagger
   * /api/bookings:
   *   post:
   *     summary: Create a new booking
   *     tags: [Bookings]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - slotId
   *               - startDate
   *               - endDate
   *             properties:
   *               slotId:
   *                 type: integer
   *                 example: 1
   *               startDate:
   *                 type: string
   *                 format: date-time
   *                 example: 2025-10-05T09:00:00Z
   *               endDate:
   *                 type: string
   *                 format: date-time
   *                 example: 2025-10-05T17:00:00Z
   *     responses:
   *       201:
   *         description: Booking created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Booking'
   *       400:
   *         description: Slot not available
   */
  app.post('/api/bookings', authenticate, parkingController.reserveSlot);

  /**
   * @swagger
   * /api/bookings:
   *   get:
   *     summary: Get user's bookings
   *     tags: [Bookings]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of user bookings
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Booking'
   */
  app.get('/api/bookings', authenticate, parkingController.getUserBookings);
};
