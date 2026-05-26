const request = require('supertest');
const express = require('express');

jest.mock('../config/prisma', () => ({
  parkingSlot: {
    findUnique: jest.fn(),
  },
}));

jest.mock('../services/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: Number(req.headers['x-test-user-id']) || 1 };
    next();
  },
}));

jest.mock('../services/mediaService', () => ({
  generateListingPhotoUploadUrl: jest.fn(),
  processListingPhoto: jest.fn(),
}));

jest.mock('../services/paymongo', () => ({}));
jest.mock('../services/penaltyService', () => ({
  applyStrike: jest.fn(),
  checkSuspension: jest.fn(),
}));
jest.mock('../services/websocket', () => ({
  broadcast: jest.fn(),
}));
jest.mock('../services/qrcode', () => ({
  generateQRCodeImage: jest.fn(),
  generateQRCodeData: jest.fn(),
  validateQRCode: jest.fn(),
}));
jest.mock('../services/cache', () => ({
  invalidateListingsCache: jest.fn(),
}));

const prisma = require('../config/prisma');
const mediaService = require('../services/mediaService');
const marketplaceRoutes = require('../routes/marketplace');

const app = express();
app.use(express.json());
marketplaceRoutes(app);

describe('Marketplace listing photo routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mediaService.generateListingPhotoUploadUrl.mockResolvedValue({
      uploadUrl: 'https://storage.googleapis.com/upload-url',
      fileName: 'listings/123/original_123.jpg',
      expiresAt: '2026-05-26T00:00:00.000Z',
    });
    mediaService.processListingPhoto.mockResolvedValue({
      original: 'https://storage.googleapis.com/parkpal/listings/123/original_123.jpg',
      large: 'https://storage.googleapis.com/parkpal/listings/123/large_123.jpg',
      medium: 'https://storage.googleapis.com/parkpal/listings/123/medium_123.jpg',
      thumbnail: 'https://storage.googleapis.com/parkpal/listings/123/thumbnail_123.jpg',
    });
  });

  describe('GET /marketplace/listings/:id/photos/upload-url', () => {
    it('uses the route id and query fileName', async () => {
      prisma.parkingSlot.findUnique.mockResolvedValue({ id: 123, ownerId: 1 });

      const response = await request(app)
        .get('/marketplace/listings/123/photos/upload-url')
        .query({ fileName: 'space.jpg' })
        .set('x-test-user-id', '1');

      expect(response.status).toBe(200);
      expect(prisma.parkingSlot.findUnique).toHaveBeenCalledWith({
        where: { id: 123 },
      });
      expect(mediaService.generateListingPhotoUploadUrl).toHaveBeenCalledWith(123, 'space.jpg');
      expect(response.body.uploadUrl).toBe('https://storage.googleapis.com/upload-url');
    });

    it('returns 400 when fileName is missing', async () => {
      const response = await request(app)
        .get('/marketplace/listings/123/photos/upload-url')
        .set('x-test-user-id', '1');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('fileName is required');
      expect(prisma.parkingSlot.findUnique).not.toHaveBeenCalled();
      expect(mediaService.generateListingPhotoUploadUrl).not.toHaveBeenCalled();
    });

    it('returns 403 for non-owners', async () => {
      prisma.parkingSlot.findUnique.mockResolvedValue({ id: 123, ownerId: 2 });

      const response = await request(app)
        .get('/marketplace/listings/123/photos/upload-url')
        .query({ fileName: 'space.jpg' })
        .set('x-test-user-id', '1');

      expect(response.status).toBe(403);
      expect(mediaService.generateListingPhotoUploadUrl).not.toHaveBeenCalled();
    });
  });

  describe('POST /marketplace/listings/:id/photos/confirm', () => {
    it('uses the route id and body fileName, not body listingId', async () => {
      prisma.parkingSlot.findUnique.mockResolvedValue({ id: 123, ownerId: 1 });

      const response = await request(app)
        .post('/marketplace/listings/123/photos/confirm')
        .set('x-test-user-id', '1')
        .send({
          listingId: 999,
          fileName: 'listings/123/original_123.jpg',
        });

      expect(response.status).toBe(200);
      expect(prisma.parkingSlot.findUnique).toHaveBeenCalledWith({
        where: { id: 123 },
      });
      expect(mediaService.processListingPhoto).toHaveBeenCalledWith(
        'listings/123/original_123.jpg',
        123
      );
      expect(response.body.original).toBe(
        'https://storage.googleapis.com/parkpal/listings/123/original_123.jpg'
      );
    });

    it('returns 400 when fileName is missing', async () => {
      const response = await request(app)
        .post('/marketplace/listings/123/photos/confirm')
        .set('x-test-user-id', '1')
        .send({ listingId: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('fileName is required');
      expect(prisma.parkingSlot.findUnique).not.toHaveBeenCalled();
      expect(mediaService.processListingPhoto).not.toHaveBeenCalled();
    });

    it('returns 403 for non-owners', async () => {
      prisma.parkingSlot.findUnique.mockResolvedValue({ id: 123, ownerId: 2 });

      const response = await request(app)
        .post('/marketplace/listings/123/photos/confirm')
        .set('x-test-user-id', '1')
        .send({ fileName: 'listings/123/original_123.jpg' });

      expect(response.status).toBe(403);
      expect(mediaService.processListingPhoto).not.toHaveBeenCalled();
    });
  });
});
