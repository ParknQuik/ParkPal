const { authenticate } = require('../services/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const adminController = require('../controllers/adminController');
const { requireAdmin, requirePlatformOwner } = require('../middleware/adminGuard');
const adminAccessController = require('../controllers/adminAccessController');
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

app.post('/admin-invitations/accept', adminAccessController.acceptInvitation);
app.get('/admin/access', authenticate, requirePlatformOwner, adminAccessController.list);
app.post('/admin/access/invitations', authenticate, requirePlatformOwner, adminAccessController.invite);
app.delete('/admin/access/invitations/:id', authenticate, requirePlatformOwner, adminAccessController.revokeInvitation);
app.patch('/admin/access/admins/:id', authenticate, requirePlatformOwner, adminAccessController.setActive);

/**
 * POST /admin/parking-candidates/google/scan
 * Scan for parking candidates using Google Places Nearby Search
 */
app.post(
  '/admin/parking-candidates/google/scan',
  authenticate,
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
  validateParams(parkingCandidateIdSchema),
  validateBody(parkingCandidateRejectSchema),
  adminController.reject
);
};
