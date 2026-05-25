const { authenticate } = require('../services/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const adminController = require('../controllers/adminController');
const {
  parkingCandidateGeofenceSchema,
  parkingCandidateIdSchema,
  parkingCandidateListSchema,
  parkingCandidateRejectSchema,
  parkingCandidateScanSchema,
} = require('../validators/admin');

/**
 * Admin routes for parking candidates management
 * All routes require authentication and admin role
 */
module.exports = (app) => {

/**
 * POST /admin/parking-candidates/google/scan
 * Scan for parking candidates using Google Places Nearby Search
 */
app.post(
  '/admin/parking-candidates/google/scan',
  authenticate,
  validateBody(parkingCandidateScanSchema),
  adminController.googleScan
);

/**
 * GET /admin/parking-candidates
 * List parking candidates with pagination and filtering
 */
app.get(
  '/admin/parking-candidates',
  authenticate,
  validateQuery(parkingCandidateListSchema),
  adminController.listCandidates
);

/**
 * GET /admin/parking-candidates/:id/live-details
 * Get live Google Place details for a candidate
 */
app.get(
  '/admin/parking-candidates/:id/live-details',
  authenticate,
  validateParams(parkingCandidateIdSchema),
  adminController.getLiveDetails
);

/**
 * POST /admin/parking-candidates/:id/approve-preview
 * Approve candidate for preview (public visibility)
 */
app.post(
  '/admin/parking-candidates/:id/approve-preview',
  authenticate,
  validateParams(parkingCandidateIdSchema),
  adminController.approvePreview
);

/**
 * POST /admin/parking-candidates/:id/verify-geofence
 * Verify geofence for candidate
 */
app.post(
  '/admin/parking-candidates/:id/verify-geofence',
  authenticate,
  validateParams(parkingCandidateIdSchema),
  validateBody(parkingCandidateGeofenceSchema),
  adminController.verifyGeofence
);

/**
 * POST /admin/parking-candidates/:id/verify-commercial
 * Verify commercial status for candidate
 */
app.post(
  '/admin/parking-candidates/:id/verify-commercial',
  authenticate,
  validateParams(parkingCandidateIdSchema),
  adminController.verifyCommercial
);

/**
 * POST /admin/parking-candidates/:id/reject
 * Reject parking candidate
 */
app.post(
  '/admin/parking-candidates/:id/reject',
  authenticate,
  validateParams(parkingCandidateIdSchema),
  validateBody(parkingCandidateRejectSchema),
  adminController.reject
);
};
