const mockPrisma = {
  parkingCandidate: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  zone: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../config/prisma', () => mockPrisma);
jest.mock('axios', () => ({
  get: jest.fn(),
}));
jest.mock('../services/cache', () => ({}));
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
    delete process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_PLACES_API_KEY = 'test-google-key';
  });

  describe('googleScan', () => {
    it('stores candidate coordinates without resetting existing review status', async () => {
      const existingCandidate = {
        id: 10,
        googlePlaceId: 'place-1',
        candidateStatus: 'rejected',
        draftCenterLat: null,
        draftCenterLon: null,
      };
      const updatedCandidate = {
        ...existingCandidate,
        draftCenterLat: 14.5995,
        draftCenterLon: 120.9842,
      };

      axios.get.mockResolvedValue({
        data: {
          status: 'OK',
          results: [
            {
              place_id: 'place-1',
              geometry: {
                location: {
                  lat: 14.5995,
                  lng: 120.9842,
                },
              },
            },
          ],
        },
      });
      mockPrisma.parkingCandidate.findUnique.mockResolvedValue(existingCandidate);
      mockPrisma.parkingCandidate.update.mockResolvedValue(updatedCandidate);

      const { res, next } = runHandler(adminController.googleScan, {
        user: { id: 1, role: 'admin' },
        body: {
          lat: 14.6,
          lon: 120.98,
          radius: 1000,
          type: 'parking',
        },
      });

      await new Promise(setImmediate);

      expect(next).not.toHaveBeenCalled();
      expect(mockPrisma.parkingCandidate.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: expect.objectContaining({
          scanArea: 'POINT(14.6 120.98)',
          scanSource: 'google_places',
          draftCenterLat: 14.5995,
          draftCenterLon: 120.9842,
          draftRadiusMeters: 1000,
        }),
      });
      expect(mockPrisma.parkingCandidate.update.mock.calls[0][0].data).not.toHaveProperty('candidateStatus');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        candidates: [updatedCandidate],
      });
    });

    it('creates candidates without storing Google display details', async () => {
      const createdCandidate = {
        id: 11,
        googlePlaceId: 'place-2',
        candidateStatus: 'candidate_preview',
        draftCenterLat: 14.5995,
        draftCenterLon: 120.9842,
      };

      axios.get.mockResolvedValue({
        data: {
          status: 'OK',
          results: [
            {
              place_id: 'place-2',
              name: 'Do Not Store Parking Name',
              formatted_address: 'Do Not Store Address',
              rating: 4.8,
              photos: [{ photo_reference: 'photo-ref' }],
              opening_hours: { open_now: true },
              geometry: {
                location: {
                  lat: 14.5995,
                  lng: 120.9842,
                },
              },
            },
          ],
        },
      });
      mockPrisma.parkingCandidate.findUnique.mockResolvedValue(null);
      mockPrisma.parkingCandidate.create.mockResolvedValue(createdCandidate);

      const { res, next } = runHandler(adminController.googleScan, {
        user: { id: 1, role: 'admin' },
        body: {
          lat: 14.6,
          lon: 120.98,
          radius: 1000,
          type: 'parking',
        },
      });

      await new Promise(setImmediate);

      expect(next).not.toHaveBeenCalled();
      expect(mockPrisma.parkingCandidate.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({
          name: expect.anything(),
          formattedAddress: expect.anything(),
          rating: expect.anything(),
          photos: expect.anything(),
          openingHours: expect.anything(),
        }),
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        candidates: [createdCandidate],
      });
    });

    it('treats ZERO_RESULTS as a successful empty scan', async () => {
      axios.get.mockResolvedValue({
        data: {
          status: 'ZERO_RESULTS',
          results: [],
        },
      });

      const { res, next } = runHandler(adminController.googleScan, {
        user: { id: 1, role: 'admin' },
        body: {
          lat: 14.6,
          lon: 120.98,
          radius: 1000,
          type: 'parking',
        },
      });

      await new Promise(setImmediate);

      expect(next).not.toHaveBeenCalled();
      expect(mockPrisma.parkingCandidate.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.parkingCandidate.create).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        candidates: [],
      });
    });

    it('returns sanitized Google status details for non-OK provider responses', async () => {
      axios.get.mockResolvedValue({
        data: {
          status: 'REQUEST_DENIED',
          error_message: 'This API project is not authorized to use this API.',
          results: [],
        },
      });

      const { res, next } = runHandler(adminController.googleScan, {
        user: { id: 1, role: 'admin' },
        body: {
          lat: 14.6,
          lon: 120.98,
          radius: 1000,
          type: 'parking',
        },
      });

      await new Promise(setImmediate);

      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 502,
        message: 'Google Places Nearby Search failed',
        details: {
          provider: 'google_places',
          failureType: 'provider_error',
          googleStatus: 'REQUEST_DENIED',
          googleMessage: 'This API project is not authorized to use this API.',
        },
      }));
      expect(JSON.stringify(next.mock.calls[0][0].details)).not.toContain('test-google-key');
    });

    it('returns sanitized upstream details for Google transport failures', async () => {
      axios.get.mockRejectedValue({
        response: {
          status: 403,
          data: {
            status: 'REQUEST_DENIED',
            error_message: 'API key restriction mismatch.',
          },
        },
        config: {
          params: {
            key: 'test-google-key',
          },
        },
      });

      const { res, next } = runHandler(adminController.googleScan, {
        user: { id: 1, role: 'admin' },
        body: {
          lat: 14.6,
          lon: 120.98,
          radius: 1000,
          type: 'parking',
        },
      });

      await new Promise(setImmediate);

      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 502,
        message: 'Google Places API request failed',
        details: {
          provider: 'google_places',
          failureType: 'http_error',
          googleStatus: 'REQUEST_DENIED',
          googleMessage: 'API key restriction mismatch.',
          httpStatus: 403,
        },
      }));
      expect(JSON.stringify(next.mock.calls[0][0].details)).not.toContain('test-google-key');
    });

    it('returns a sanitized network failure when Google cannot be reached', async () => {
      axios.get.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      });

      const { res, next } = runHandler(adminController.googleScan, {
        user: { id: 1, role: 'admin' },
        body: {
          lat: 14.6,
          lon: 120.98,
          radius: 1000,
          type: 'parking',
        },
      });

      await new Promise(setImmediate);

      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 502,
        message: 'Google Places API request failed',
        details: {
          provider: 'google_places',
          failureType: 'network_error',
        },
      }));
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

  describe('getDiscoveryCandidates', () => {
    it('returns only normalized non-bookable candidate discovery entities', async () => {
      mockPrisma.parkingCandidate.findMany.mockResolvedValue([
        {
          id: 1,
          candidateStatus: 'candidate_preview',
          draftCenterLat: 14.5995,
          draftCenterLon: 120.9842,
          linkedZone: null,
        },
        {
          id: 2,
          candidateStatus: 'geofence_verified',
          draftCenterLat: 14.6000,
          draftCenterLon: 120.9850,
          linkedZone: {
            id: 5,
            name: 'Verified Facility',
            address: 'Verified Address',
          },
        },
        {
          id: 3,
          candidateStatus: 'candidate_preview',
          draftCenterLat: 15.5995,
          draftCenterLon: 121.9842,
          linkedZone: null,
        },
      ]);

      const { res, next } = runHandler(marketplaceController.getDiscoveryCandidates, {
        query: {
          lat: '14.5995',
          lon: '120.9842',
          radius: '5',
        },
      });

      await new Promise(setImmediate);

      expect(next).not.toHaveBeenCalled();
      expect(mockPrisma.parkingCandidate.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          candidateStatus: { in: ['candidate_preview', 'geofence_verified', 'commercial_verified'] },
        }),
      }));
      expect(res.json).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            id: 1,
            source: 'google_candidate',
            canBook: false,
            canShowAnalytics: false,
            isPreview: true,
          }),
          expect.objectContaining({
            id: 2,
            source: 'google_candidate',
            canBook: false,
            canShowAnalytics: true,
            isPreview: false,
            title: 'Verified Facility',
            address: 'Verified Address',
          }),
        ],
      });
    });

    it('rejects zero-radius public discovery queries at validation', () => {
      const { error } = discoveryCandidatesSchema.validate({
        lat: 14.5995,
        lon: 120.9842,
        radius: 0,
      });

      expect(error).toBeDefined();
      expect(error.details[0]).toEqual(expect.objectContaining({
        path: ['radius'],
        type: 'number.min',
      }));
    });
  });
});
