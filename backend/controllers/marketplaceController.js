const prisma = require('../config/prisma');
const { broadcast } = require('../services/websocket');
const { generateQRCodeImage, generateQRCodeData, validateQRCode } = require('../services/qrcode');
const cache = require('../services/cache');
const mediaService = require('../services/mediaService');

// Safe JSON parse that returns a fallback on invalid JSON
function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    // Handle comma-separated strings like "covered, security, cctv"
    if (typeof str === 'string' && str.includes(' ')) {
      return str.split(',').map(s => s.trim()).filter(Boolean);
    }
    return fallback;
  }
}

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
      title,
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
    if (!lat || !lon || !price || !address || !slotType || !title) {
      return res.status(400).json({
        error: 'Missing required fields: lat, lon, price, address, slotType, title',
      });
    }

    // Create parking slot
    const slot = await prisma.parkingSlot.create({
      data: {
        title,
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

    // Invalidate listings cache when new listing is created
    await cache.invalidateListingsCache();

    broadcast({ type: 'listing_created', listing: updatedSlot });
    res.status(201).json(updatedSlot);
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get signed URL for uploading a listing photo
 */
exports.getListingPhotoUploadUrl = async (req, res) => {
  try {
    const { listingId, fileName } = req.query;
    
    if (!listingId || !fileName) {
      return res.status(400).json({ error: 'listingId and fileName are required' });
    }

    const result = await mediaService.generateListingPhotoUploadUrl(
      parseInt(listingId),
      fileName
    );

    res.json(result);
  } catch (error) {
    console.error('Get listing photo upload URL error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Confirm listing photo upload and process it
 */
exports.confirmListingPhotoUpload = async (req, res) => {
  try {
    const { listingId, fileName } = req.body;
    
    if (!listingId || !fileName) {
      return res.status(400).json({ error: 'listingId and fileName are required' });
    }

    const result = await mediaService.processListingPhoto(
      fileName,
      parseInt(listingId)
    );

    res.json(result);
  } catch (error) {
    console.error('Confirm listing photo upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a parking slot listing
 */
exports.updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      address,
      lat,
      lon,
      price,
      slotType,
      amenities,
      photos,
    } = req.body;
    const userId = req.user.id;

    const existingListing = await prisma.parkingSlot.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingListing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (existingListing.ownerId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own listings' });
    }

    const updatedListing = await prisma.parkingSlot.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(address && { address }),
        ...(lat && { lat: parseFloat(lat) }),
        ...(lon && { lon: parseFloat(lon) }),
        ...(price && { price: parseFloat(price) }),
        ...(slotType && { slotType }),
        ...(amenities && { amenities: JSON.stringify(amenities) }),
        ...(photos && { photos: JSON.stringify(photos) }),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(updatedListing);
  } catch (error) {
    console.error('Update listing error:', error);
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
      q,
    } = req.query;

    console.log('Search params:', { q, lat, lon, radius, status });

    // Get pagination and sort info
    const { skip, take } = req.pagination || { skip: 0, take: 20 };
    const sortOptions = req.sort?.prisma || { createdAt: 'desc' };

    // Generate cache key
    const cacheKey = cache.getListingsCacheKey({
      lat,
      lon,
      radius,
      minPrice,
      maxPrice,
      amenities,
      slotType,
      status,
      q,
      offset: skip,
      limit: take,
      sort: JSON.stringify(sortOptions),
    });

    // Try to get from cache first (5 minute TTL)
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      console.log(`Cache HIT for listings: ${cacheKey}`);
      return res.json(cachedResult);
    }

    console.log(`Cache MISS for listings: ${cacheKey}`);

    const where = {};

    // Filter by status
    if (status) {
      where.status = status;
    } else {
      where.status = 'available'; // Default to available slots
    }

    // Text search by address or title (case-insensitive)
    if (q) {
      where.OR = [
        { address: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
      ];
    }

    console.log('Where clause:', JSON.stringify(where));

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

    // Apply location filtering in WHERE clause if possible
    if (lat && lon && radius) {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);
      const radiusKm = parseFloat(radius);

      console.log('📊 User search params - lat:', userLat, 'lon:', userLon, 'radius:', radiusKm, 'km');

      // Calculate approximate lat/lon bounds (much faster than filtering all records)
      // Use 2x radius to capture edge cases, then filter precisely in post-processing
      // 1 degree latitude ≈ 111km, 1 degree longitude ≈ 111km * cos(latitude)
      const boundsMultiplier = 2;
      const latDelta = (radiusKm * boundsMultiplier) / 111;
      const lonDelta = (radiusKm * boundsMultiplier) / (111 * Math.cos((userLat * Math.PI) / 180));

      // Skip Prisma lat/lon bounds - filter by distance in post-processing instead
      // This ensures accurate distance-based filtering

      console.log('🔍 Prisma lat bounds:', (userLat - latDelta).toFixed(6), 'to', (userLat + latDelta).toFixed(6));
      console.log('🔍 Prisma lon bounds:', (userLon - lonDelta).toFixed(6), 'to', (userLon + lonDelta).toFixed(6));
    }

    console.log('🔍 Full where clause:', JSON.stringify(where));
    console.log('🔍 Query params - take:', take, 'skip:', skip, 'radius:', radius);

    // Query with pagination - MUCH more efficient
    const [slots, totalCount] = await prisma.$transaction([
      prisma.parkingSlot.findMany({
        where,
        skip,
        take: take * 2, // Get extra records to account for distance filtering
        orderBy: sortOptions,
        select: {
          id: true,
          title: true,
          address: true,
          lat: true,
          lon: true,
          price: true,
          slotType: true,
          status: true,
          description: true,
          amenities: true,
          photos: true,
          rating: true,
          createdAt: true,
          isActive: true,
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
      }),
      prisma.parkingSlot.count({ where }),
    ]);

    console.log('🔍 Prisma query executed, found slots:', slots.length);
    if (slots.length > 0) {
      console.log('📍 First slot:', slots[0].address, 'lat:', slots[0].lat, 'lon:', slots[0].lon);
    }

    // Auto-expand radius fallback configuration
    const RADIUS_FALLBACK_STEPS = [3, 5, 10, 15];
    const requestedRadius = radius ? parseFloat(radius) : null;
    let expandedRadius = null;
    let radiusExpanded = false;

    // Post-process: precise distance filtering and calculation
    let processedSlots = slots;
    let currentRadius = requestedRadius;

    const performDistanceFilter = (slotsToFilter, radiusValue) => {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);
      console.log('📍 Location filter: user at', userLat, userLon, 'radius', radiusValue, 'km');

      return slotsToFilter
        .map((slot) => ({
          ...slot,
          distance: calculateDistance(userLat, userLon, slot.lat, slot.lon),
        }))
        .filter((slot) => slot.distance <= radiusValue)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, take);
    };

    if (lat && lon && currentRadius) {
      processedSlots = performDistanceFilter(slots, currentRadius);
      console.log('📍 After distance filter:', processedSlots.length, 'slots from', slots.length);
      if (processedSlots.length > 0) {
        console.log('📍 Closest slot:', processedSlots[0].address, 'distance:', processedSlots[0].distance?.toFixed(2), 'km');
      }
    }

    // Auto-expand radius fallback: if no results, expand radius and re-query
    if (lat && lon && requestedRadius && processedSlots.length === 0) {
      console.log('🔄 No results found with requested radius:', requestedRadius, 'km, starting radius expansion...');

      for (const fallbackRadius of RADIUS_FALLBACK_STEPS) {
        if (fallbackRadius <= requestedRadius) continue;

        console.log('🔄 Attempting fallback radius:', fallbackRadius, 'km');

        // Calculate new bounds for larger radius
        const userLat = parseFloat(lat);
        const userLon = parseFloat(lon);
        const boundsMultiplier = 2;
        const latDelta = (fallbackRadius * boundsMultiplier) / 111;
        const lonDelta = (fallbackRadius * boundsMultiplier) / (111 * Math.cos((userLat * Math.PI) / 180));

        // Re-query with expanded radius bounds
        const expandedCacheKey = cache.getListingsCacheKey({
          lat,
          lon,
          radius: fallbackRadius.toString(),
          minPrice,
          maxPrice,
          amenities,
          slotType,
          status,
          q,
          offset: skip,
          limit: take,
          sort: JSON.stringify(sortOptions),
        });

        // Check expanded cache first
        const cachedExpanded = await cache.get(expandedCacheKey);
        if (cachedExpanded) {
          console.log(`Cache HIT for expanded listings: ${expandedCacheKey}`);
          processedSlots = cachedExpanded.data;
          expandedRadius = fallbackRadius;
          radiusExpanded = true;
          break;
        }

        // Re-execute database query with expanded bounds
        const [expandedSlots, expandedCount] = await prisma.$transaction([
          prisma.parkingSlot.findMany({
            where,
            skip,
            take: take * 2,
            orderBy: sortOptions,
            select: {
              id: true,
              title: true,
              address: true,
              lat: true,
              lon: true,
              price: true,
              slotType: true,
              status: true,
              description: true,
              amenities: true,
              photos: true,
              rating: true,
              createdAt: true,
              isActive: true,
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
          }),
          prisma.parkingSlot.count({ where }),
        ]);

        console.log('🔄 Expanded query found slots:', expandedSlots.length);

        // Filter with expanded radius
        processedSlots = performDistanceFilter(expandedSlots, fallbackRadius);
        console.log('🔄 After expanded distance filter:', processedSlots.length, 'slots from', expandedSlots.length);

        if (processedSlots.length > 0) {
          console.log('🔄 Found', processedSlots.length, 'results with expanded radius:', fallbackRadius, 'km');
          expandedRadius = fallbackRadius;
          radiusExpanded = true;

          // Cache expanded results with different key (shorter TTL for expanded)
          const expandedResponse = {
            data: processedSlots,
            pagination: { page: 1, limit: take, total: processedSlots.length, totalPages: Math.ceil(processedSlots.length / take), hasNextPage: false, hasPrevPage: null, nextPage: null, prevPage: null },
          };
          await cache.set(expandedCacheKey, expandedResponse, cache.CACHE_TTL.SHORT);
          break;
        }
      }
    }

    // Filter by amenities if specified (only if not already expanded)
    if (amenities && !radiusExpanded) {
      const requiredAmenities = amenities.split(',').map((a) => a.trim());
      processedSlots = processedSlots.filter((slot) => {
        if (!slot.amenities) return false;
        const slotAmenities = safeJsonParse(slot.amenities);
        return requiredAmenities.every((amenity) =>
          slotAmenities.includes(amenity)
        );
      });
    }

    // Parse JSON fields for response
    processedSlots = processedSlots.map((slot) => ({
      ...slot,
      amenities: safeJsonParse(slot.amenities),
      photos: safeJsonParse(slot.photos),
    }));

    // Use the actual filtered count for pagination
    const actualTotal = lat && lon && (currentRadius || expandedRadius) ? processedSlots.length : totalCount;
    const response = req.buildPaginatedResponse
      ? req.buildPaginatedResponse(processedSlots, actualTotal)
      : {
          data: processedSlots,
          pagination: { page: 1, limit: take, total: actualTotal, totalPages: Math.ceil(actualTotal / take), hasNextPage: false, hasPrevPage: null, nextPage: null, prevPage: null },
          requestedRadius: requestedRadius,
          radiusExpanded: radiusExpanded,
          expandedRadius: expandedRadius,
        };

    // Cache the result (5 minute TTL)
    await cache.set(cacheKey, response, cache.CACHE_TTL.MEDIUM);

    res.json(response);
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
    const { slotId, startTime, endTime, rentalMode = 'fixed', maxDuration } = req.body;
    console.log('Create booking request:', { slotId, startTime, endTime, rentalMode, maxDuration });
    const userId = req.user.id;

    // Parse time inputs
    const start = new Date(startTime);
    let end;
    let hours, totalPrice, authAmount;

    // Check for conflicting bookings (overlapping time slots) - for fixed mode
    if (rentalMode === 'fixed' && endTime) {
      end = new Date(endTime);
      const conflictingBookings = await prisma.booking.findMany({
        where: {
          slotId: parseInt(slotId),
          status: { in: ['confirmed', 'pending', 'active'] },
          OR: [
            {
              startTime: { lte: start },
              endTime: { gt: start }
            },
            {
              startTime: { lt: end },
              endTime: { gte: end }
            },
            {
              startTime: { gte: start },
              endTime: { lte: end }
            }
          ]
        }
      });

      if (conflictingBookings.length > 0) {
        const earliestConflict = conflictingBookings[0];
        const conflictStart = new Date(earliestConflict.startTime);
        return res.status(409).json({ 
          error: 'Slot is already booked for this time period',
          conflictingBooking: {
            startTime: conflictStart.toISOString(),
            message: `This slot is booked from ${conflictStart.toLocaleString()}`
          }
        });
      }
    }

    // Validate required fields based on rental mode
    if (!slotId || !startTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: slotId, startTime' 
      });
    }

    if (rentalMode === 'fixed' && !endTime) {
      return res.status(400).json({ 
        error: 'endTime is required for fixed rental mode' 
      });
    }

    if (rentalMode === 'open' && !maxDuration) {
      return res.status(400).json({ 
        error: 'maxDuration is required for open rental mode' 
      });
    }

    // Validate rental mode value
    if (rentalMode !== 'fixed' && rentalMode !== 'open') {
      return res.status(400).json({ 
        error: 'rentalMode must be either "fixed" or "open"' 
      });
    }

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

    // For open mode, check if there's any active booking
    if (rentalMode === 'open') {
      const activeOpenBookings = await prisma.booking.findMany({
        where: {
          slotId: parseInt(slotId),
          status: 'active',
          rentalMode: 'open'
        }
      });

      if (activeOpenBookings.length > 0) {
        return res.status(409).json({ 
          error: 'Slot already has an active open-time booking',
        });
      }
    }

    // Calculate price based on rental mode
    hours = 0;
    totalPrice = 0;
    authAmount = 0;

    if (rentalMode === 'fixed') {
      // Fixed mode: calculate exact price
      end = new Date(endTime);
      hours = Math.ceil((end - start) / (1000 * 60 * 60));
      totalPrice = slot.price * hours;
      authAmount = null;
    } else {
      // Open mode: calculate authorization amount for max duration
      end = null;
      hours = maxDuration;
      // Pre-auth amount = price per hour × max duration × 1.5 (buffer)
      const estimatedMaxPrice = slot.price * hours;
      authAmount = Math.ceil(estimatedMaxPrice * 1.5);
      totalPrice = authAmount; // Initial charge is the pre-auth amount
    }

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
        endTime: end, // null for open mode
        rentalMode,
        maxDuration: rentalMode === 'open' ? maxDuration : null,
        authAmount: authAmount,
        price: totalPrice,
        platformFee,
        hostEarnings,
        status: 'pending',
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

    // Create notification for user booking confirmation
    const userNotification = await prisma.notification.create({
      data: {
        userId: booking.userId,
        title: 'Booking Confirmed! 🎉',
        body: rentalMode === 'open' 
          ? `Your parking at ${booking.slot?.address || 'the parking spot'} is confirmed. Pre-auth hold: ₱${authAmount}. You'll be charged based on actual usage.`
          : `Your parking booking at ${booking.slot?.address || 'the parking spot'} is confirmed for ${new Date(booking.startTime).toLocaleDateString()}.`,
        type: 'booking_confirmation',
        data: JSON.stringify({ bookingId: booking.id }),
      },
    });

    // Create notification for host new booking
    await prisma.notification.create({
      data: {
        userId: booking.slot.ownerId,
        title: 'New Booking! 💰',
        body: `You have a new booking from ${booking.user?.name || 'a driver'} for ${booking.slot?.address || 'your parking spot'}.`,
        type: 'new_booking',
        data: JSON.stringify({ bookingId: booking.id }),
      },
    });

    broadcast({ type: 'booking_created', booking });
    res.status(201).json({
      message: rentalMode === 'open' 
        ? 'Booking created. Payment will be authorized for maximum duration.' 
        : 'Booking created successfully',
      booking,
      rentalMode,
      estimatedAmount: rentalMode === 'open' ? authAmount : totalPrice,
    });
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
    const qrValidation = await validateQRCode(qrData);

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

      // For open mode: require status to be 'confirmed' (not already active/completed)
      if (booking.rentalMode === 'open') {
        if (booking.status !== 'confirmed' && booking.status !== 'pending') {
          return res.status(400).json({ 
            error: `Cannot check in. Booking status is already '${booking.status}'.` 
          });
        }
        
        // Check if within allowed time window (start time should be close to now, within maxDuration)
        const now = new Date();
        const startTime = new Date(booking.startTime);
        const maxDuration = booking.maxDuration || 4;
        const windowEnd = new Date(startTime.getTime() + maxDuration * 60 * 60 * 1000);
        
        if (now < new Date(startTime.getTime() - 15 * 60 * 1000)) {
          return res.status(400).json({ error: 'Check-in not allowed yet. You can check in up to 15 minutes before your booking time.' });
        }
        
        if (now > windowEnd) {
          return res.status(400).json({ error: 'Your booking window has expired. Please create a new booking.' });
        }
      }

      // Update booking status to active
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

    // Notify host of check-in
    if (slot.ownerId !== userId) {
      await prisma.notification.create({
        data: {
          userId: slot.ownerId,
          title: 'Driver Checked In 🚗',
          body: `A driver has checked in to your parking spot at ${slot.address}.`,
          type: 'check_in',
          data: JSON.stringify({ sessionId: session.id }),
        },
      });
    }

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
      include: { 
        slot: true,
        booking: true
      },
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

    // Handle payment capture for open rental mode bookings
    let captureResult = null;
    if (session.booking && session.booking.rentalMode === 'open' && session.booking.authId) {
      try {
        const paymongoService = require('../services/paymongo');
        const actualAmount = totalAmount;
        const maxAmount = session.booking.authAmount || 0;
        
        // Capture only the actual amount (up to authorized max)
        const captureAmount = Math.min(actualAmount, maxAmount);
        
        console.log(`💳 Capturing payment for Booking #${session.bookingId}: ₱${captureAmount.toFixed(2)} (actual: ₱${actualAmount.toFixed(2)}, max: ₱${maxAmount.toFixed(2)})`);
        
        captureResult = await paymongoService.capturePaymentIntent(
          session.booking.authId,
          captureAmount
        );
        
        if (!captureResult.success) {
          console.error('Payment capture error:', captureResult.error);
          return res.status(500).json({ 
            error: 'Failed to process payment',
            details: captureResult.error.message 
          });
        }

        // Update payment record to completed
        // First, get the existing payment to preserve metadata
        const existingPayment = await prisma.payment.findFirst({
          where: {
            bookingId: session.bookingId,
            metadata: {
              path: ['paymentIntentId'],
              equals: session.booking.authId
            }
          }
        });

        if (existingPayment) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
              status: 'completed',
              amount: captureAmount,
              metadata: {
                ...existingPayment.metadata,
                capturedAt: new Date().toISOString(),
                capturedAmount: captureAmount
              }
            }
          });
        }
        
        // If actual amount exceeds authorized max, log overstay charge needed
        if (actualAmount > maxAmount) {
          const overstayAmount = actualAmount - maxAmount;
          console.log(`⚠️  Overstay detected: Booking ${session.bookingId}, Extra charge needed: ₱${overstayAmount.toFixed(2)}`);
          
          // TODO: Create additional charge or add to user balance
          // For now, we'll create a notification for the user
          await prisma.notification.create({
            data: {
              userId: session.userId,
              title: 'Additional Payment Required ⚠️',
              body: `Your parking exceeded the prepaid duration. Additional charge: ₱${overstayAmount.toFixed(2)}. Please settle this amount.`,
              type: 'payment_required',
              data: JSON.stringify({ 
                sessionId: session.id, 
                bookingId: session.bookingId,
                overstayAmount: overstayAmount 
              }),
            },
          });
        }
      } catch (paymentError) {
        console.error('Payment capture error:', paymentError);
        return res.status(500).json({ error: 'Failed to process payment' });
      }
    }

    // Update session
    const updatedSession = await prisma.parkingSession.update({
      where: { id: parseInt(sessionId) },
      data: {
        checkOutTime,
        durationMinutes,
        totalAmount,
        status: 'completed',
      },
      include: { slot: true, booking: true },
    });

    // Update slot status
    await prisma.parkingSlot.update({
      where: { id: session.slotId },
      data: { status: 'available' },
    });

    // Update booking to completed if it exists
    if (session.bookingId) {
      await prisma.booking.update({
        where: { id: session.bookingId },
        data: { 
          status: 'completed',
          endTime: checkOutTime
        },
      });
    }

    // Create payment record only if not already handled by authorization capture
    let payment = null;
    if (!captureResult) {
      payment = await prisma.payment.create({
        data: {
          userId,
          sessionId: session.id,
          bookingId: session.bookingId,
          amount: totalAmount,
          paymentMethod: 'pending',
          status: 'pending',
        },
      });
    } else {
      // Find the existing payment that was captured
      payment = await prisma.payment.findFirst({
        where: {
          bookingId: session.bookingId,
          metadata: {
            path: ['paymentIntentId'],
            equals: session.booking.authId
          }
        }
      });
    }

    // Notify user of check-out completion and payment
    if (session.booking?.userId) {
      await prisma.notification.create({
        data: {
          userId: session.booking.userId,
          title: 'Check-out Complete ✅',
          body: `Your parking session is complete. Total: ₱${totalAmount.toFixed(2)}`,
          type: 'check_out',
          data: JSON.stringify({ sessionId: session.id, amount: totalAmount }),
        },
      });
    }

    // Notify host of check-out
    if (session.slot?.ownerId) {
      await prisma.notification.create({
        data: {
          userId: session.slot.ownerId,
          title: 'Driver Checked Out 💵',
          body: `Parking session ended. Your earnings: ₱${(updatedSession.booking?.hostEarnings || 0).toFixed(2)}`,
          type: 'check_out',
          data: JSON.stringify({ sessionId: session.id }),
        },
      });
    }

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

/**
 * Get a single listing by ID
 */
exports.getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await prisma.parkingSlot.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        zone: true,
        reviews: {
          include: {
            author: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Generate QR code data for mobile app
    const qrCodeData = await generateQRCodeData(listing.id.toString());

    res.json({
      ...listing,
      amenities: safeJsonParse(listing.amenities),
      photos: safeJsonParse(listing.photos),
      qrCodeData, // Add QR code data string for mobile app
    });
  } catch (error) {
    console.error('Get listing by ID error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get host's own listings
 */
exports.getHostListings = async (req, res) => {
  try {
    const hostId = req.user.id;

    const listings = await prisma.parkingSlot.findMany({
      where: { ownerId: hostId },
      include: {
        zone: true,
        reviews: {
          select: { id: true, rating: true, comment: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      listings.map((l) => ({
        ...l,
        amenities: l.amenities || [],
        photos: l.photos || [],
        availability: l.isActive, // Map isActive to availability for frontend
        pricePerHour: l.price, // Map price to pricePerHour for frontend
        rating: l.averageRating || 0, // Map averageRating to rating for frontend
        reviewCount: l.reviews.length, // Add review count
      }))
    );
  } catch (error) {
    console.error('Get host listings error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user's marketplace bookings
 */
exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        slot: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            zone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(bookings);
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get reviews for a specific listing
 */
exports.getListingReviews = async (req, res) => {
  try {
    const { id } = req.params;

    const reviews = await prisma.review.findMany({
      where: { slotId: parseInt(id) },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    console.error('Get listing reviews error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a single booking by ID
 */
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        slot: {
          select: {
            id: true,
            address: true,
            lat: true,
            lon: true,
            price: true,
            slotType: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Ensure user can only access their own bookings
    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to this booking' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cancel a booking
 */
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        slot: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Ensure user can only cancel their own bookings
    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to cancel this booking' });
    }

    // Check if booking has already started or is within cancellation deadline
    // Skip this check for pending bookings - they can be cancelled anytime
    if (booking.status !== 'pending') {
      const now = new Date();
      const bookingStartTime = new Date(booking.startTime);
      const cancellationDeadline = new Date(bookingStartTime.getTime() - 30 * 60 * 1000); // 30 minutes before

      if (now >= cancellationDeadline) {
        return res.status(400).json({ 
          error: 'Cannot cancel booking within 30 minutes of start time or after it has started',
          code: 'CANCELLATION_DEADLINE_PASSED'
        });
      }
    }

    // Cannot cancel if already checked in
    if (booking.status === 'active') {
      return res.status(400).json({ 
        error: 'Cannot cancel an active booking. Please check out first.',
        code: 'BOOKING_ALREADY_ACTIVE'
      });
    }

    // Check if booking is already cancelled or completed
    if (booking.status === 'cancelled') {
      return res.status(400).json({ 
        error: 'Booking is already cancelled',
        code: 'ALREADY_CANCELLED'
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ 
        error: 'Cannot cancel a completed booking',
        code: 'BOOKING_COMPLETED'
      });
    }

    // Update booking status to cancelled
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
      include: {
        slot: {
          select: {
            id: true,
            address: true,
            status: true,
          },
        },
      },
    });

    // If slot was reserved for this booking, make it available again
    if (booking.slot.status === 'reserved') {
      await prisma.parkingSlot.update({
        where: { id: booking.slotId },
        data: { status: 'available' },
      });
    }

    // Notify host of cancellation
    await prisma.notification.create({
      data: {
        userId: booking.slot.ownerId,
        title: 'Booking Cancelled ❌',
        body: `A booking for ${booking.slot.address} has been cancelled.`,
        type: 'booking_cancelled',
        data: JSON.stringify({ bookingId: booking.id }),
      },
    });

    res.json({
      message: 'Booking cancelled successfully',
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Confirm booking without payment (for cash payments)
 * POST /marketplace/bookings/:id/confirm
 */
exports.confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: { slot: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Ensure user can only confirm their own bookings
    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to confirm this booking' });
    }

    // Check booking status
    if (booking.status !== 'pending') {
      return res.status(400).json({ 
        error: `Cannot confirm booking with status '${booking.status}'. Only pending bookings can be confirmed.` 
      });
    }

    // Update booking status to confirmed
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { status: 'confirmed' },
      include: {
        slot: {
          select: { id: true, address: true, status: true }
        }
      }
    });

    // Update slot status to reserved
    if (booking.slot.status === 'available') {
      await prisma.parkingSlot.update({
        where: { id: booking.slotId },
        data: { status: 'reserved' },
      });
    }

    // Notify host
    await prisma.notification.create({
      data: {
        userId: booking.slot.ownerId,
        title: 'Booking Confirmed - Cash Payment',
        body: `A booking at ${booking.slot.address} has been confirmed. Guest will pay in cash.`,
        type: 'booking_confirmed',
        data: JSON.stringify({ bookingId: booking.id, paymentMethod: 'cash' }),
      },
    });

    res.json({
      message: 'Booking confirmed successfully with cash payment',
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get reviews for a specific listing
 */
exports.toggleListingAvailability = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    const userId = req.user.id;

    // Check if listing exists and belongs to user
    const listing = await prisma.parkingSlot.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.ownerId !== userId) {
      return res.status(403).json({ error: 'You do not own this listing' });
    }

    // Toggle isActive
    const updatedListing = await prisma.parkingSlot.update({
      where: { id: listingId },
      data: {
        isActive: !listing.isActive,
      },
    });

    // Invalidate listings cache
    await cache.invalidateListingsCache();

    res.json({
      message: `Listing ${updatedListing.isActive ? 'activated' : 'paused'} successfully`,
      listing: updatedListing,
    });
  } catch (error) {
    console.error('Toggle listing availability error:', error);
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
  const dist = R * c;
  console.log('📏 Distance from', lat1, lon1, 'to', lat2, lon2, '=', dist.toFixed(2), 'km');
  return dist;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

exports.deleteListing = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    const userId = req.user.id;

    // Check if listing exists and belongs to user
    const listing = await prisma.parkingSlot.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.ownerId !== userId) {
      return res.status(403).json({ error: 'You do not own this listing' });
    }

    // Soft-delete by setting isActive to false, or hard delete
    // Hard delete: remove the listing
    await prisma.parkingSlot.delete({
      where: { id: listingId },
    });

    // Invalidate listings cache
    await cache.invalidateListingsCache();

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get upcoming bookings (for reservation reminders)
 */
exports.getUpcomingBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        startTime: { gte: now },
        status: { in: ['confirmed', 'pending'] },
      },
      include: {
        slot: {
          select: { id: true, address: true, lat: true, lon: true },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 10,
    });

    // Trigger notifications for bookings starting in next 2 hours
    const upcomingSoon = bookings.filter(b => {
      const hoursUntil = (new Date(b.startTime) - now) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil <= 2;
    });

    // Create reminder notifications if needed
    for (const booking of upcomingSoon) {
      // Check if we already sent a reminder in last hour
      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId,
          type: 'upcoming_reminder',
          data: JSON.stringify({ bookingId: booking.id }),
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });

      if (!existingNotif) {
        await prisma.notification.create({
          data: {
            userId,
            title: 'Upcoming Reservation ⏰',
            body: `Your parking reservation starts in less than 2 hours at ${booking.slot.address}.`,
            type: 'upcoming_reminder',
            data: JSON.stringify({ bookingId: booking.id }),
          },
        });
      }
    }

    res.json({ bookings });
  } catch (error) {
    console.error('Get upcoming bookings error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Check if booking can be extended
 * GET /marketplace/bookings/:id/extension-availability
 */
exports.checkExtensionAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { hours } = req.query; // Requested extension hours
    const userId = req.user.id;

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: { slot: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify ownership
    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only fixed mode bookings can be extended
    if (booking.rentalMode !== 'fixed') {
      return res.status(400).json({ 
        error: 'Only fixed duration bookings can be extended',
        code: 'INVALID_RENTAL_MODE'
      });
    }

    // Check booking status
    if (booking.status === 'completed') {
      return res.status(400).json({ 
        error: 'Cannot extend completed booking',
        code: 'BOOKING_COMPLETED'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ 
        error: 'Cannot extend cancelled booking',
        code: 'BOOKING_CANCELLED'
      });
    }

    // Check if booking has already ended
    const now = new Date();
    const currentEndTime = new Date(booking.endTime);
    
    if (now > currentEndTime) {
      return res.status(400).json({ 
        error: 'Booking has already ended',
        code: 'BOOKING_ENDED'
      });
    }

    // Calculate new end time
    const requestedHours = parseInt(hours) || 1;
    const newEndTime = new Date(currentEndTime.getTime() + (requestedHours * 60 * 60 * 1000));

    // Check for conflicting bookings
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        slotId: booking.slotId,
        id: { not: parseInt(id) },
        status: { in: ['confirmed', 'active', 'pending'] },
        OR: [
          {
            startTime: { lte: newEndTime },
            endTime: { gte: currentEndTime },
          },
        ],
      },
    });

    const isAvailable = conflictingBookings.length === 0;

    // Calculate extension cost
    const extensionCost = booking.slot.price * requestedHours;
    const serviceFee = 10; // Lower service fee for extensions
    const tax = extensionCost * 0.05;
    const totalCost = extensionCost + serviceFee + tax;

    res.json({
      available: isAvailable,
      currentEndTime: currentEndTime.toISOString(),
      requestedEndTime: newEndTime.toISOString(),
      extensionHours: requestedHours,
      pricing: {
        extensionCost,
        serviceFee,
        tax,
        total: totalCost,
      },
      conflictingBooking: conflictingBookings.length > 0 ? {
        startTime: conflictingBookings[0].startTime,
      } : null,
    });
  } catch (error) {
    console.error('Check extension availability error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Extend booking
 * POST /marketplace/bookings/:id/extend
 */
exports.extendBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { hours, paymentIntentId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!hours || !paymentIntentId) {
      return res.status(400).json({ 
        error: 'Missing required fields: hours, paymentIntentId' 
      });
    }

    const extensionHours = parseInt(hours);
    if (extensionHours < 1 || extensionHours > 4) {
      return res.status(400).json({ 
        error: 'Extension hours must be between 1 and 4' 
      });
    }

    // Get booking with slot details
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: { slot: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify ownership
    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate booking state (same checks as availability)
    if (booking.rentalMode !== 'fixed') {
      return res.status(400).json({ error: 'Only fixed duration bookings can be extended' });
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot extend ${booking.status} booking` });
    }

    const now = new Date();
    const currentEndTime = new Date(booking.endTime);
    
    if (now > currentEndTime) {
      return res.status(400).json({ error: 'Booking has already ended' });
    }

    // Calculate new end time
    const newEndTime = new Date(currentEndTime.getTime() + (extensionHours * 60 * 60 * 1000));

    // Double-check availability (race condition protection)
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        slotId: booking.slotId,
        id: { not: parseInt(id) },
        status: { in: ['confirmed', 'active', 'pending'] },
        OR: [
          {
            startTime: { lte: newEndTime },
            endTime: { gte: currentEndTime },
          },
        ],
      },
    });

    if (conflictingBookings.length > 0) {
      return res.status(409).json({ 
        error: 'Slot is no longer available for the requested extension time',
        code: 'SLOT_CONFLICT'
      });
    }

    // Calculate costs
    const extensionCost = booking.slot.price * extensionHours;
    const serviceFee = 10;
    const tax = extensionCost * 0.05;
    const totalCost = extensionCost + serviceFee + tax;

    // Update booking with extension
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: {
        originalEndTime: booking.originalEndTime || booking.endTime, // Store original if first extension
        endTime: newEndTime,
        extensionCount: { increment: 1 },
        totalExtensionHrs: { increment: extensionHours },
        lastExtendedAt: now,
        price: { increment: totalCost }, // Add extension cost to total price
      },
    });

    // Create payment record for extension
    await prisma.payment.create({
      data: {
        userId,
        bookingId: parseInt(id),
        amount: totalCost,
        paymentMethod: 'extension',
        status: 'completed',
        paymentIntent: paymentIntentId,
        paymentDetails: JSON.stringify({
          type: 'extension',
          hours: extensionHours,
          originalEndTime: currentEndTime,
          newEndTime,
        }),
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: booking.slot.ownerId,
        title: 'Booking Extended',
        body: `A booking at ${booking.slot.address} has been extended by ${extensionHours} hour(s).`,
        type: 'booking_extended',
        data: JSON.stringify({ 
          bookingId: booking.id,
          extensionHours,
          newEndTime,
        }),
      },
    });

    res.json({
      message: 'Booking extended successfully',
      booking: updatedBooking,
      extension: {
        hours: extensionHours,
        cost: totalCost,
        newEndTime: newEndTime.toISOString(),
      },
    });
  } catch (error) {
    console.error('Extend booking error:', error);
    res.status(500).json({ error: error.message });
  }
};
