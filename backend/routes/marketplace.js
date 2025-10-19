const marketplaceController = require('../controllers/marketplaceController');
const { authenticate } = require('../services/auth');

module.exports = (app) => {
  /**
   * @swagger
   * /api/marketplace/listings:
   *   post:
   *     summary: Create a new marketplace listing with QR code
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - lat
   *               - lon
   *               - price
   *               - address
   *               - slotType
   *             properties:
   *               lat:
   *                 type: number
   *                 example: 14.5995
   *               lon:
   *                 type: number
   *                 example: 120.9842
   *               price:
   *                 type: number
   *                 example: 50
   *               address:
   *                 type: string
   *                 example: Manila City Hall, Manila
   *               slotType:
   *                 type: string
   *                 enum: [roadside_qr, commercial_manual, commercial_iot]
   *                 example: roadside_qr
   *               description:
   *                 type: string
   *                 example: Safe covered parking near the mall
   *               amenities:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["covered", "security", "cctv"]
   *               photos:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["https://example.com/photo1.jpg"]
   *               zoneId:
   *                 type: integer
   *                 example: 1
   *     responses:
   *       201:
   *         description: Listing created with QR code
   *       400:
   *         description: Invalid input
   */
  app.post(
    '/api/marketplace/listings',
    authenticate,
    marketplaceController.createListing
  );

  /**
   * @swagger
   * /api/marketplace/search:
   *   get:
   *     summary: Search marketplace listings with filters
   *     tags: [Marketplace]
   *     parameters:
   *       - in: query
   *         name: lat
   *         schema:
   *           type: number
   *         description: User's latitude
   *         example: 14.5995
   *       - in: query
   *         name: lon
   *         schema:
   *           type: number
   *         description: User's longitude
   *         example: 120.9842
   *       - in: query
   *         name: radius
   *         schema:
   *           type: number
   *         description: Search radius in kilometers
   *         example: 5
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *         example: 20
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *         example: 100
   *       - in: query
   *         name: amenities
   *         schema:
   *           type: string
   *         description: Comma-separated amenities
   *         example: "covered,security"
   *       - in: query
   *         name: slotType
   *         schema:
   *           type: string
   *         example: roadside_qr
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [available, occupied, reserved]
   *         example: available
   *     responses:
   *       200:
   *         description: List of matching parking slots
   */
  app.get('/api/marketplace/search', marketplaceController.searchListings);

  /**
   * @swagger
   * /api/marketplace/bookings:
   *   post:
   *     summary: Create a new booking for a parking slot
   *     tags: [Marketplace]
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
   *               - startTime
   *               - endTime
   *             properties:
   *               slotId:
   *                 type: integer
   *                 example: 1
   *               startTime:
   *                 type: string
   *                 format: date-time
   *                 example: 2025-10-05T10:00:00Z
   *               endTime:
   *                 type: string
   *                 format: date-time
   *                 example: 2025-10-05T14:00:00Z
   *     responses:
   *       201:
   *         description: Booking created successfully
   *       400:
   *         description: Slot not available
   *       404:
   *         description: Slot not found
   */
  app.post(
    '/api/marketplace/bookings',
    authenticate,
    marketplaceController.createBooking
  );

  /**
   * @swagger
   * /api/marketplace/qr/checkin:
   *   post:
   *     summary: Check in to a parking slot using QR code
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - qrData
   *             properties:
   *               qrData:
   *                 type: string
   *                 example: "PARKPAL:1:1696512000000:a1b2c3d4"
   *               bookingId:
   *                 type: integer
   *                 description: Optional for pre-booked slots
   *                 example: 5
   *     responses:
   *       200:
   *         description: Check-in successful
   *       400:
   *         description: Invalid QR code
   *       403:
   *         description: Invalid booking
   *       404:
   *         description: Slot not found
   */
  app.post(
    '/api/marketplace/qr/checkin',
    authenticate,
    marketplaceController.qrCheckIn
  );

  /**
   * @swagger
   * /api/marketplace/qr/checkout:
   *   post:
   *     summary: Check out from a parking slot
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - sessionId
   *             properties:
   *               sessionId:
   *                 type: integer
   *                 example: 1
   *     responses:
   *       200:
   *         description: Check-out successful with payment details
   *       400:
   *         description: Session not active
   *       403:
   *         description: Unauthorized
   *       404:
   *         description: Session not found
   */
  app.post(
    '/api/marketplace/qr/checkout',
    authenticate,
    marketplaceController.qrCheckOut
  );

  /**
   * @swagger
   * /api/marketplace/reviews:
   *   post:
   *     summary: Leave a review for a parking slot
   *     tags: [Marketplace]
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
   *               - rating
   *             properties:
   *               slotId:
   *                 type: integer
   *                 example: 1
   *               bookingId:
   *                 type: integer
   *                 example: 5
   *               rating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 example: 5
   *               comment:
   *                 type: string
   *                 example: "Great parking spot, very convenient!"
   *     responses:
   *       201:
   *         description: Review created successfully
   *       400:
   *         description: Invalid rating or review already exists
   *       403:
   *         description: Invalid booking
   *       404:
   *         description: Slot not found
   */
  app.post(
    '/api/marketplace/reviews',
    authenticate,
    marketplaceController.createReview
  );

  /**
   * @swagger
   * /api/marketplace/host/earnings:
   *   get:
   *     summary: Get host earnings and payout information
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         example: "2025-01-01"
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         example: "2025-12-31"
   *     responses:
   *       200:
   *         description: Host earnings data with summary and detailed bookings
   */
  app.get(
    '/api/marketplace/host/earnings',
    authenticate,
    marketplaceController.getHostEarnings
  );
};
