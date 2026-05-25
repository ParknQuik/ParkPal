const express = require('express');
const { parkingCandidateScanSchema } = require('../validators/admin');

jest.mock('../services/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
}));

jest.mock('../controllers/adminController', () => ({
  googleScan: jest.fn((req, res) => res.json({ ok: true })),
  listCandidates: jest.fn((req, res) => res.json({ ok: true })),
  getLiveDetails: jest.fn((req, res) => res.json({ ok: true })),
  approvePreview: jest.fn((req, res) => res.json({ ok: true })),
  verifyGeofence: jest.fn((req, res) => res.json({ ok: true })),
  verifyCommercial: jest.fn((req, res) => res.json({ ok: true })),
  reject: jest.fn((req, res) => res.json({ ok: true })),
}));

const adminRoutes = require('../routes/admin');
const adminController = require('../controllers/adminController');

const app = express();
app.use(express.json());
adminRoutes(app);

const routeExists = (method, path) => {
  return app._router.stack.some((layer) => {
    return layer.route?.path === path && layer.route?.methods?.[method];
  });
};

describe('parking candidate admin routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mounts candidate scan under /admin', async () => {
    expect(routeExists('post', '/admin/parking-candidates/google/scan')).toBe(true);
  });

  it('does not expose candidate scan without the /admin prefix', async () => {
    expect(routeExists('post', '/parking-candidates/google/scan')).toBe(false);
  });

  it('validates candidate scan input before the controller', async () => {
    const { error } = parkingCandidateScanSchema.validate({
      lat: 120,
      lon: 120.9842,
      radius: 1000,
    });

    expect(error).toBeDefined();
    expect(adminController.googleScan).not.toHaveBeenCalled();
  });
});
