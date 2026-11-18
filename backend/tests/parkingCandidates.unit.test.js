const mockPrisma = {
  parkingCandidate: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  crowdParkingMetric: { findMany: jest.fn() },
  zone: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../config/prisma', () => mockPrisma);
jest.mock('axios', () => ({
  get: jest.fn(),
}));
jest.mock('../services/cache', () => ({ get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(true) }));
jest.mock('../services/mediaService', () => ({}));
jest.mock('../services/paymongo', () => ({}));
jest.mock('../services/qrcode', () => ({
  generateQRCodeImage: jest.fn(),
  generateQRCodeData: jest.fn(),
  validateQRCode: jest.fn(),
}));
jest.mock('../services/websocket', () => ({
  broadcast: jest.fn(),
}));

const axios = require('axios');
const cache = require('../services/cache');
const scanService = require('../services/parkingCandidateScanService');
const adminController = require('../controllers/adminController');
const marketplaceController = require('../controllers/marketplaceController');
const { discoveryCandidatesSchema } = require('../validators/marketplace');

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const runHandler = (handler, req) => {
  const res = createResponse();
  const next = jest.fn();
  handler(req, res, next);
  return { res, next };
};

describe('parking candidate controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.get.mockResolvedValue(null);
    delete process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_PLACES_API_KEY = 'test-google-key';
  });

  describe('googleScan', () => {
    it('disables legacy administrative scans without calling Google or writing candidates', async () => {
      const { next } = runHandler(adminController.googleScan, { user: { role: 'admin' }, body: { lat: 14.6, lon: 121, radius: 3000 } });
      await new Promise(setImmediate);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 410 }));
      expect(axios.get).not.toHaveBeenCalled();
      expect(mockPrisma.parkingCandidate.create).not.toHaveBeenCalled();
    });
  });

  describe('getLiveDetails', () => {
    it('prefers GOOGLE_PLACES_API_KEY over GOOGLE_MAPS_API_KEY for backend Places calls', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'places-backend-key';
      process.env.GOOGLE_MAPS_API_KEY = 'maps-only-key';

      mockPrisma.parkingCandidate.findUnique.mockResolvedValue({
        id: 20,
        googlePlaceId: 'place-live-1',
        candidateStatus: 'candidate_preview',
        scanTimestamp: new Date('2026-05-24T00:00:00.000Z'),
        createdAt: new Date('2026-05-24T00:00:00.000Z'),
      });
      axios.get.mockResolvedValue({
        data: {
          status: 'OK',
          result: {
            name: 'Transient Facility Name',
            formatted_address: 'Transient Address',
            geometry: {
              location: {
                lat: 14.5995,
                lng: 120.9842,
              },
            },
          },
        },
      });

      const { res, next } = runHandler(adminController.getLiveDetails, {
        user: { id: 1, role: 'admin' },
        params: { id: '20' },
      });

      await new Promise(setImmediate);

      expect(next).not.toHaveBeenCalled();
      expect(axios.get).toHaveBeenCalledWith(
        'https://maps.googleapis.com/maps/api/place/details/json',
        expect.objectContaining({
          params: expect.objectContaining({
            place_id: 'place-live-1',
            key: 'places-backend-key',
          }),
        })
      );
      expect(mockPrisma.parkingCandidate.update).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        details: expect.objectContaining({
          googlePlaceId: 'place-live-1',
          name: 'Transient Facility Name',
          address: 'Transient Address',
        }),
      });
    });

    it('falls back to GOOGLE_MAPS_API_KEY when GOOGLE_PLACES_API_KEY is not set', async () => {
      delete process.env.GOOGLE_PLACES_API_KEY;
      process.env.GOOGLE_MAPS_API_KEY = 'maps-only-key';

      mockPrisma.parkingCandidate.findUnique.mockResolvedValue({
        id: 21,
        googlePlaceId: 'place-live-2',
        candidateStatus: 'candidate_preview',
        scanTimestamp: new Date('2026-05-24T00:00:00.000Z'),
        createdAt: new Date('2026-05-24T00:00:00.000Z'),
      });
      axios.get.mockResolvedValue({
        data: {
          status: 'OK',
          result: {
            name: 'Fallback Facility Name',
            formatted_address: 'Fallback Address',
            geometry: {
              location: {
                lat: 14.5995,
                lng: 120.9842,
              },
            },
          },
        },
      });

      const { res, next } = runHandler(adminController.getLiveDetails, {
        user: { id: 1, role: 'admin' },
        params: { id: '21' },
      });

      await new Promise(setImmediate);

      expect(next).not.toHaveBeenCalled();
      expect(axios.get).toHaveBeenCalledWith(
        'https://maps.googleapis.com/maps/api/place/details/json',
        expect.objectContaining({
          params: expect.objectContaining({
            place_id: 'place-live-2',
            key: 'maps-only-key',
          }),
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        details: expect.objectContaining({
          googlePlaceId: 'place-live-2',
          name: 'Fallback Facility Name',
          address: 'Fallback Address',
        }),
      });
    });
  });

  describe('candidate coordinate retention', () => {
    it('clears coordinates at a 29-day cutoff to keep daily cleanup inside the 30-day limit', async () => {
      mockPrisma.parkingCandidate.updateMany.mockResolvedValue({ count: 2 });
      const before = Date.now();

      await scanService.expireOldCandidateCoordinates();

      const [query] = mockPrisma.parkingCandidate.updateMany.mock.calls[0];
      const expiresBefore = query.where.scanTimestamp.lt.getTime();
      expect(expiresBefore).toBeGreaterThanOrEqual(before - 29 * 24 * 60 * 60 * 1000 - 50);
      expect(expiresBefore).toBeLessThanOrEqual(before - 29 * 24 * 60 * 60 * 1000 + 50);
      expect(query.data).toEqual({ draftCenterLat: null, draftCenterLon: null });
      expect(query.where.OR).toEqual([
        { draftCenterLat: { not: null } },
        { draftCenterLon: { not: null } },
      ]);
    });
  });
});
