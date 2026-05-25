const prisma = require('../config/prisma');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const axios = require('axios');
const {
  getGooglePlacesApiKey,
  scanGoogleParkingCandidatesForPoint,
} = require('../services/parkingCandidateScanService');

/**
 * Admin role guard for controller handlers.
 */
const requireAdmin = (req) => {
  if (req.user?.role !== 'admin') {
    throw ApiError.forbidden('Admin access required');
  }
};

/**
 * Google Places Nearby Search for parking candidates
 * POST /admin/parking-candidates/google/scan
 */
exports.googleScan = asyncHandler(async (req, res, next) => {
  requireAdmin(req);

  const { lat, lon, radius, type = 'parking' } = req.body;

  const scanResult = await scanGoogleParkingCandidatesForPoint({
    lat,
    lon,
    radius,
    type,
    maxPages: 1,
  });

  res.json({
    success: true,
    count: scanResult.candidates.length,
    candidates: scanResult.candidates
  });
});

/**
 * List parking candidates with pagination
 * GET /admin/parking-candidates
 */
exports.listCandidates = asyncHandler(async (req, res, next) => {
  requireAdmin(req);

  const { status, limit = 20, offset = 0 } = req.query;

  const where = {};
  if (status) {
    where.candidateStatus = status;
  }

  try {
    const [candidates, totalCount] = await Promise.all([
      prisma.parkingCandidate.findMany({
        where,
        include: {
          linkedZone: true,
          reviewer: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.parkingCandidate.count({ where })
    ]);

    res.json({
      success: true,
      candidates,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: totalCount > (offset + candidates.length)
      }
    });
  } catch (error) {
    throw error;
  }
});

/**
 * Get live Google Place details for a candidate
 * GET /admin/parking-candidates/:id/live-details
 */
exports.getLiveDetails = asyncHandler(async (req, res, next) => {
  requireAdmin(req);

  const { id } = req.params;

  try {
    const candidate = await prisma.parkingCandidate.findUnique({
      where: { id: parseInt(id) }
    });

    if (!candidate) {
      throw ApiError.notFound('Parking candidate not found');
    }

    // Call Google Place Details API
    const googlePlacesUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
    const params = {
      place_id: candidate.googlePlaceId,
      fields: 'name,formatted_address,geometry,types,rating,user_ratings_total,opening_hours,website,international_phone_number',
      key: getGooglePlacesApiKey()
    };

    const response = await axios.get(googlePlacesUrl, { params });

    if (response.data.status !== 'OK') {
      throw ApiError.internal('Google Places Details API error');
    }

    const place = response.data.result;

    // Normalize details for admin review
    const normalizedDetails = {
      googlePlaceId: candidate.googlePlaceId,
      name: place.name || '',
      address: place.formatted_address || '',
      location: place.geometry ? {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      } : null,
      types: place.types || [],
      rating: place.rating || 0,
      userRatingsTotal: place.user_ratings_total || 0,
      openingHours: place.opening_hours || null,
      website: place.website || null,
      phoneNumber: place.international_phone_number || null,
      currentStatus: candidate.candidateStatus,
      scannedAt: candidate.scanTimestamp,
      createdAt: candidate.createdAt
    };

    res.json({
      success: true,
      details: normalizedDetails
    });
  } catch (error) {
    if (error.response && error.response.data) {
      throw ApiError.badRequest('Google Places API error', error.response.data);
    }
    throw error;
  }
});

/**
 * Approve candidate for preview (public visibility)
 * POST /admin/parking-candidates/:id/approve-preview
 */
exports.approvePreview = asyncHandler(async (req, res, next) => {
  requireAdmin(req);

  const { id } = req.params;

  try {
    const candidate = await prisma.parkingCandidate.findUnique({
      where: { id: parseInt(id) }
    });

    if (!candidate) {
      throw ApiError.notFound('Parking candidate not found');
    }

    const updatedCandidate = await prisma.parkingCandidate.update({
      where: { id: parseInt(id) },
      data: {
        candidateStatus: 'candidate_preview',
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      }
    });

    res.json({
      success: true,
      candidate: updatedCandidate
    });
  } catch (error) {
    throw error;
  }
});

/**
 * Verify geofence for candidate
 * POST /admin/parking-candidates/:id/verify-geofence
 */
exports.verifyGeofence = asyncHandler(async (req, res, next) => {
  requireAdmin(req);

  const { id } = req.params;
  const { centerLat, centerLon, radiusMeters, geofencePolygon } = req.body;

  try {
    const candidate = await prisma.parkingCandidate.findUnique({
      where: { id: parseInt(id) }
    });

    if (!candidate) {
      throw ApiError.notFound('Parking candidate not found');
    }

    // Check if a zone already exists with similar geofence
    let zone = await prisma.zone.findFirst({
      where: {
          centerLat,
          centerLon,
          radiusMeters
      }
    });

    if (!zone) {
      // Create new zone
      zone = await prisma.zone.create({
        data: {
          name: `Zone for Candidate ${id}`,
          type: 'candidate_geofence',
          address: 'Pending address assignment',
          city: 'Pending city assignment',
          geofencePolygon,
          centerLat,
          centerLon,
          radiusMeters,
          isActive: true
        }
      });
    }

    // Update candidate with linked zone and status
    const updatedCandidate = await prisma.parkingCandidate.update({
      where: { id: parseInt(id) },
      data: {
        linkedZoneId: zone.id,
        candidateStatus: 'geofence_verified',
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
        draftCenterLat: centerLat,
        draftCenterLon: centerLon,
        draftRadiusMeters: radiusMeters,
        draftGeofencePolygon: geofencePolygon
      }
    });

    res.json({
      success: true,
      candidate: updatedCandidate,
      zone
    });
  } catch (error) {
    throw error;
  }
});

/**
 * Verify commercial status for candidate
 * POST /admin/parking-candidates/:id/verify-commercial
 */
exports.verifyCommercial = asyncHandler(async (req, res, next) => {
  requireAdmin(req);

  const { id } = req.params;

  try {
    const candidate = await prisma.parkingCandidate.findUnique({
      where: { id: parseInt(id) }
    });

    if (!candidate) {
      throw ApiError.notFound('Parking candidate not found');
    }

    if (!candidate.linkedZoneId) {
      throw ApiError.badRequest('Candidate must be geofence verified before commercial verification');
    }

    const updatedCandidate = await prisma.parkingCandidate.update({
      where: { id: parseInt(id) },
      data: {
        candidateStatus: 'commercial_verified',
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      }
    });

    res.json({
      success: true,
      candidate: updatedCandidate
    });
  } catch (error) {
    throw error;
  }
});

/**
 * Reject parking candidate
 * POST /admin/parking-candidates/:id/reject
 */
exports.reject = asyncHandler(async (req, res, next) => {
  requireAdmin(req);

  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    throw ApiError.badRequest('Rejection reason is required');
  }

  try {
    const candidate = await prisma.parkingCandidate.findUnique({
      where: { id: parseInt(id) }
    });

    if (!candidate) {
      throw ApiError.notFound('Parking candidate not found');
    }

    const updatedCandidate = await prisma.parkingCandidate.update({
      where: { id: parseInt(id) },
      data: {
        candidateStatus: 'rejected',
        rejectionReason: reason.trim(),
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      }
    });

    res.json({
      success: true,
      candidate: updatedCandidate
    });
  } catch (error) {
    throw error;
  }
});
