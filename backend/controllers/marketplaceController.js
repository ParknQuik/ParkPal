const prisma = require('../config/prisma');
const { broadcast } = require('../services/websocket');
const { generateQRCodeImage, validateQRCode } = require('../services/qrcode');

/**
 * @swagger
 * /api/marketplace/listings:
 *   post:
 *     summary: Create a new marketplace listing
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
 *               lon:
 *                 type: number
 *               price:
 *                 type: number
 *               address:
 *                 type: string
 *               slotType:
 *                 type: string
 *                 enum: [roadside_qr, commercial_manual, commercial_iot]
 *               description:
 *                 type: string
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *               zoneId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Listing created successfully
 */
exports.createListing = async (req, res) => {
  try {
    const {
      lat,
      lon,
      price,
      address,
      slotType,
      description,
      amenities,
      photos,
      zoneId,
    } = req.body;
    const ownerId = req.user.id;

    // Validate required fields
    if (!lat || !lon || !price || !address || !slotType) {
      return res.status(400).json({
        error: 'Missing required fields: lat, lon, price, address, slotType',
      });
    }

    // Create parking slot
    const slot = await prisma.parkingSlot.create({
      data: {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        price: parseFloat(price),
        address,
        status: 'available',
        ownerId,
        slotType,
        description: description || null,
        amenities: amenities ? JSON.stringify(amenities) : null,
        photos: photos ? JSON.stringify(photos) : null,
        rating: 0,
        zoneId: zoneId ? parseInt(zoneId) : null,
      },
    });

    // Generate QR code for the slot
    const qrCodeImage = await generateQRCodeImage(slot.id.toString());

    // Update slot with QR code
    const updatedSlot = await prisma.parkingSlot.update({
      where: { id: slot.id },
      data: { qrCode: qrCodeImage },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        zone: true,
      },
    });

    broadcast({ type: 'listing_created', listing: updatedSlot });
    res.status(201).json(updatedSlot);
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: error.message });
  }
};

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
 *       - in: query
 *         name: lon
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           description: Search radius in kilometers
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: amenities
 *         schema:
 *           type: string
 *           description: Comma-separated amenities
 *       - in: query
 *         name: slotType
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, occupied, reserved]
 *     responses:
 *       200:
 *         description: List of matching parking slots
 */
exports.searchListings = async (req, res) => {
  try {
    const {
      lat,
      lon,
      radius,
      minPrice,
      maxPrice,
      amenities,
      slotType,
      status,
    } = req.query;

    const where = {};

    // Filter by status
    if (status) {
      where.status = status;
    } else {
      where.status = 'available'; // Default to available slots
    }

    // Filter by slot type
    if (slotType) {
      where.slotType = slotType;
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Get all matching slots
    let slots = await prisma.parkingSlot.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        zone: true,
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            author: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    // Filter by location (basic distance calculation)
    if (lat && lon && radius) {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);
      const radiusKm = parseFloat(radius);

      slots = slots.filter((slot) => {
        const distance = calculateDistance(
          userLat,
          userLon,
          slot.lat,
          slot.lon
        );
        return distance <= radiusKm;
      });

      // Add distance to each slot
      slots = slots.map((slot) => ({
        ...slot,
        distance: calculateDistance(userLat, userLon, slot.lat, slot.lon),
      }));

      // Sort by distance
      slots.sort((a, b) => a.distance - b.distance);
    }

    // Filter by amenities
    if (amenities) {
      const requiredAmenities = amenities.split(',').map((a) => a.trim());
      slots = slots.filter((slot) => {
        if (!slot.amenities) return false;
        const slotAmenities = JSON.parse(slot.amenities);
        return requiredAmenities.every((amenity) =>
          slotAmenities.includes(amenity)
        );
      });
    }

    // Parse JSON fields for response
    slots = slots.map((slot) => ({
      ...slot,
      amenities: slot.amenities ? JSON.parse(slot.amenities) : [],
      photos: slot.photos ? JSON.parse(slot.photos) : [],
    }));

    res.json({ count: slots.length, listings: slots });
  } catch (error) {
    console.error('Search listings error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @swagger
 * /api/marketplace/bookings:
 *   post:
 *     summary: Create a new booking
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
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Booking created successfully
 */
exports.createBooking = async (req, res) => {
  try {
    const { slotId, startTime, endTime } = req.body;
    const userId = req.user.id;

    // Validate slot exists and is available
    const slot = await prisma.parkingSlot.findUnique({
      where: { id: parseInt(slotId) },
    });

    if (!slot) {
      return res.status(404).json({ error: 'Parking slot not found' });
    }

    if (slot.status !== 'available') {
      return res.status(400).json({ error: 'Slot is not available' });
    }

    // Calculate price (basic: hourly rate * hours)
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    const totalPrice = slot.price * hours;

    // Calculate platform fee (5% commission)
    const platformFeeRate = 0.05;
    const platformFee = totalPrice * platformFeeRate;
    const hostEarnings = totalPrice - platformFee;

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        slotId: parseInt(slotId),
        userId,
        startTime: start,
        endTime: end,
        price: totalPrice,
        platformFee,
        hostEarnings,
        status: 'confirmed',
      },
      include: {
        slot: {
          include: {
            owner: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update slot status
    await prisma.parkingSlot.update({
      where: { id: parseInt(slotId) },
      data: { status: 'reserved' },
    });

    broadcast({ type: 'booking_created', booking });
    res.status(201).json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: error.message });
  }
};

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
 *               bookingId:
 *                 type: integer
 *                 description: Optional for pre-booked slots
 *     responses:
 *       200:
 *         description: Check-in successful
 */
exports.qrCheckIn = async (req, res) => {
  try {
    const { qrData, bookingId } = req.body;
    const userId = req.user.id;

    // Validate QR code
    const qrValidation = validateQRCode(qrData);

    if (!qrValidation.valid) {
      return res.status(400).json({ error: qrValidation.error });
    }

    const { slotId } = qrValidation;

    // Verify slot exists
    const slot = await prisma.parkingSlot.findUnique({
      where: { id: parseInt(slotId) },
    });

    if (!slot) {
      return res.status(404).json({ error: 'Parking slot not found' });
    }

    // If booking ID provided, verify booking
    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: parseInt(bookingId) },
      });

      if (!booking || booking.userId !== userId || booking.slotId !== slot.id) {
        return res.status(403).json({ error: 'Invalid booking' });
      }

      // Update booking status
      await prisma.booking.update({
        where: { id: parseInt(bookingId) },
        data: { status: 'active' },
      });
    }

    // Create parking session
    const session = await prisma.parkingSession.create({
      data: {
        userId,
        slotId: slot.id,
        bookingId: bookingId ? parseInt(bookingId) : null,
        sessionType: 'roadside_qr',
        checkInTime: new Date(),
        status: 'active',
      },
    });

    // Update slot status
    await prisma.parkingSlot.update({
      where: { id: slot.id },
      data: { status: 'occupied' },
    });

    broadcast({ type: 'qr_checkin', session });
    res.json({ message: 'Check-in successful', session });
  } catch (error) {
    console.error('QR check-in error:', error);
    res.status(500).json({ error: error.message });
  }
};

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
 *     responses:
 *       200:
 *         description: Check-out successful
 */
exports.qrCheckOut = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    // Get session
    const session = await prisma.parkingSession.findUnique({
      where: { id: parseInt(sessionId) },
      include: { slot: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Calculate duration and amount
    const checkOutTime = new Date();
    const durationMinutes = Math.ceil(
      (checkOutTime - session.checkInTime) / (1000 * 60)
    );
    const hours = Math.ceil(durationMinutes / 60);
    const totalAmount = session.slot.price * hours;

    // Update session
    const updatedSession = await prisma.parkingSession.update({
      where: { id: parseInt(sessionId) },
      data: {
        checkOutTime,
        durationMinutes,
        totalAmount,
        status: 'completed',
      },
      include: { slot: true },
    });

    // Update slot status
    await prisma.parkingSlot.update({
      where: { id: session.slotId },
      data: { status: 'available' },
    });

    // Create payment record (link to booking if session has one)
    const payment = await prisma.payment.create({
      data: {
        userId,
        sessionId: session.id,
        bookingId: session.bookingId,
        amount: totalAmount,
        paymentMethod: 'pending',
        status: 'pending',
      },
    });

    broadcast({ type: 'qr_checkout', session: updatedSession });
    res.json({
      message: 'Check-out successful',
      session: updatedSession,
      payment,
      totalAmount,
      durationMinutes,
    });
  } catch (error) {
    console.error('QR check-out error:', error);
    res.status(500).json({ error: error.message });
  }
};

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
 *               bookingId:
 *                 type: integer
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 */
exports.createReview = async (req, res) => {
  try {
    const { slotId, bookingId, rating, comment } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify slot exists
    const slot = await prisma.parkingSlot.findUnique({
      where: { id: parseInt(slotId) },
    });

    if (!slot) {
      return res.status(404).json({ error: 'Parking slot not found' });
    }

    // If bookingId provided, verify it exists and belongs to user
    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: parseInt(bookingId) },
      });

      if (!booking || booking.userId !== userId) {
        return res.status(403).json({ error: 'Invalid booking' });
      }

      // Check if review already exists for this booking
      const existingReview = await prisma.review.findUnique({
        where: { bookingId: parseInt(bookingId) },
      });

      if (existingReview) {
        return res.status(400).json({ error: 'Review already exists for this booking' });
      }
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        authorId: userId,
        targetId: slot.ownerId,
        slotId: parseInt(slotId),
        bookingId: bookingId ? parseInt(bookingId) : null,
        rating: parseInt(rating),
        comment: comment || null,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        slot: {
          select: { id: true, address: true },
        },
      },
    });

    // Update slot average rating
    const reviews = await prisma.review.findMany({
      where: { slotId: parseInt(slotId) },
    });

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.parkingSlot.update({
      where: { id: parseInt(slotId) },
      data: { rating: avgRating },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: error.message });
  }
};

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
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Host earnings data
 */
exports.getHostEarnings = async (req, res) => {
  try {
    const hostId = req.user.id;
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const where = {
      slot: {
        ownerId: hostId,
      },
      status: 'completed',
    };

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    // Get all completed bookings for host's slots
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        slot: {
          select: { id: true, address: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totalEarnings = bookings.reduce((sum, b) => sum + b.hostEarnings, 0);
    const totalBookings = bookings.length;
    const platformFeesTotal = bookings.reduce((sum, b) => sum + b.platformFee, 0);

    // Get payout history
    const payouts = await prisma.payout.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate pending payout (total earnings - total paid out)
    const totalPaidOut = payouts
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayout = totalEarnings - totalPaidOut;

    res.json({
      summary: {
        totalEarnings,
        totalBookings,
        platformFeesTotal,
        totalPaidOut,
        pendingPayout,
      },
      bookings,
      payouts,
    });
  } catch (error) {
    console.error('Get host earnings error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}
