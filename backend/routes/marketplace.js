const marketplaceController = require('../controllers/marketplaceController');
const { authenticate } = require('../services/auth');
const { paginate, validateSort } = require('../middleware/pagination');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const {
  createListingSchema,
  updateListingSchema,
  createBookingSchema,
  reviewSchema,
  searchListingsSchema,
  qrCheckinSchema,
  qrCheckoutSchema,
  idParamSchema,
  hostEarningsQuerySchema
} = require('../validators/marketplace');

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
    '/marketplace/listings',
    authenticate,
    validateBody(createListingSchema),
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
  app.get(
    '/marketplace/search',
    validateQuery(searchListingsSchema),
    paginate({ defaultLimit: 20, maxLimit: 100 }),
    validateSort(['price', 'createdAt', 'averageRating'], 'createdAt', 'desc'),
    marketplaceController.searchListings
  );

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
    '/marketplace/bookings',
    authenticate,
    validateBody(createBookingSchema),
    marketplaceController.createBooking
  );

  /**
   * @swagger
   * /api/marketplace/bookings/{id}:
   *   get:
   *     summary: Get a single booking by ID
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Booking ID
   *     responses:
   *       200:
   *         description: Booking details
   *       403:
   *         description: Unauthorized access
   *       404:
   *         description: Booking not found
   */
  app.get(
    '/marketplace/bookings/:id',
    authenticate,
    validateParams(idParamSchema),
    marketplaceController.getBookingById
  );

  /**
   * @swagger
   * /api/marketplace/bookings/{id}/cancel:
   *   patch:
   *     summary: Cancel a booking
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Booking ID
   *     responses:
   *       200:
   *         description: Booking cancelled successfully
   *       400:
   *         description: Booking already cancelled or completed
   *       403:
   *         description: Unauthorized
   *       404:
   *         description: Booking not found
   */
  app.patch(
    '/marketplace/bookings/:id/cancel',
    authenticate,
    validateParams(idParamSchema),
    marketplaceController.cancelBooking
  );

  /**
   * @swagger
   * /api/marketplace/bookings/{id}/extension-availability:
   *   get:
   *     summary: Check if booking can be extended
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Booking ID
   *       - in: query
   *         name: hours
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 4
   *         description: Number of hours to extend (1-4)
   *         example: 1
   *     responses:
   *       200:
   *         description: Extension availability check result
   *       400:
   *         description: Invalid booking state for extension
   *       403:
   *         description: Unauthorized
   *       404:
   *         description: Booking not found
   */
  app.get(
    '/marketplace/bookings/:id/extension-availability',
    authenticate,
    validateParams(idParamSchema),
    marketplaceController.checkExtensionAvailability
  );

  /**
   * @swagger
   * /api/marketplace/bookings/{id}/extend:
   *   post:
   *     summary: Extend an active booking
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Booking ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - hours
   *               - paymentIntentId
   *             properties:
   *               hours:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 4
   *                 example: 1
   *               paymentIntentId:
   *                 type: string
   *                 example: "pi_3AbCdEfGhIjKlMnO"
   *     responses:
   *       200:
   *         description: Booking extended successfully
   *       400:
   *         description: Invalid input or booking state
   *       403:
   *         description: Unauthorized
   *       404:
   *         description: Booking not found
   *       409:
   *         description: Slot conflict - no longer available for extension
   */
  app.post(
    '/marketplace/bookings/:id/extend',
    authenticate,
    validateParams(idParamSchema),
    marketplaceController.extendBooking
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
    '/marketplace/qr/checkin',
    authenticate,
    validateBody(qrCheckinSchema),
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
    '/marketplace/qr/checkout',
    authenticate,
    validateBody(qrCheckoutSchema),
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
    '/marketplace/reviews',
    authenticate,
    validateBody(reviewSchema),
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
    '/marketplace/host/earnings',
    authenticate,
    validateQuery(hostEarningsQuerySchema),
    marketplaceController.getHostEarnings
  );

  /**
   * @swagger
   * /api/marketplace/listings/:id:
   *   get:
   *     summary: Get a single listing by ID
   *     tags: [Marketplace]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         example: 1
   *     responses:
   *       200:
   *         description: Listing details with owner and reviews
   *       404:
   *         description: Listing not found
   */
  app.get(
    '/marketplace/listings/:id',
    validateParams(idParamSchema),
    marketplaceController.getListingById
  );

  /**
   * @swagger
   * /api/marketplace/host/listings:
   *   get:
   *     summary: Get host's own listings
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of host's parking listings
   */
  app.get(
    '/marketplace/host/listings',
    authenticate,
    marketplaceController.getHostListings
  );

  /**
   * @swagger
   * /api/marketplace/bookings:
   *   get:
   *     summary: Get user's marketplace bookings
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of user's bookings
   */
  app.get(
    '/marketplace/bookings',
    authenticate,
    marketplaceController.getUserBookings
  );

  /**
   * @swagger
   * /api/marketplace/bookings/upcoming:
   *   get:
   *     summary: Get upcoming bookings (for notifications)
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of upcoming bookings
   */
  app.get(
    '/marketplace/bookings/upcoming',
    authenticate,
    marketplaceController.getUpcomingBookings
  );

  /**
   * @swagger
   * /api/marketplace/listings/:id/reviews:
   *   get:
   *     summary: Get reviews for a specific listing
   *     tags: [Marketplace]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         example: 1
   *     responses:
   *       200:
   *         description: List of reviews for the listing
   */
  app.get(
    '/marketplace/listings/:id/reviews',
    validateParams(idParamSchema),
    marketplaceController.getListingReviews
  );

  /**
   * @swagger
   * /api/marketplace/listings/:id/toggle:
   *   patch:
   *     summary: Toggle listing availability (activate/pause)
   *     tags: [Marketplace]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Listing ID
   *     responses:
   *       200:
   *         description: Listing availability toggled successfully
   *       403:
   *         description: Unauthorized (not the owner)
   *       404:
   *         description: Listing not found
   */
  app.patch(
    '/marketplace/listings/:id/toggle',
    authenticate,
    validateParams(idParamSchema),
    marketplaceController.toggleListingAvailability
  );
  // Delete a listing
  app.delete(
    '/marketplace/listings/:id',
    authenticate,
    validateParams(idParamSchema),
    marketplaceController.deleteListing
  );
};
