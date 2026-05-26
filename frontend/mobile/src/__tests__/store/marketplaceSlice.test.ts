import { createListing, getMyListings } from '../../store/slices/marketplaceSlice';
import { marketplaceAPI } from '../../services/api';

jest.mock('../../services/api', () => ({
  marketplaceAPI: {
    createListing: jest.fn(),
    getMyListings: jest.fn(),
  },
}));

const listingParams = {
  title: 'Driveway Spot',
  description: 'Covered driveway',
  address: '123 Main Street, Makati City',
  latitude: 14.5995,
  longitude: 120.9822,
  pricePerHour: 75,
  slotType: 'roadside_qr',
  amenities: ['covered'],
  photos: ['https://storage.googleapis.com/parkpal/listings/1.jpg'],
};

describe('marketplaceSlice createListing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the backend-required title field', async () => {
    (marketplaceAPI.createListing as jest.Mock).mockResolvedValue({
      data: { id: 42 },
    });

    await createListing(listingParams)(jest.fn(), jest.fn(), undefined);

    expect(marketplaceAPI.createListing).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Driveway Spot',
      lat: 14.5995,
      lon: 120.9822,
      price: 75,
    }));
  });

  it('returns backend validation details as the rejected payload', async () => {
    (marketplaceAPI.createListing as jest.Mock).mockRejectedValue({
      response: {
        data: {
          error: 'Validation failed',
          details: [
            { field: 'photos.0', message: 'Photo must be a valid URL' },
          ],
        },
      },
    });

    const result = await createListing(listingParams)(jest.fn(), jest.fn(), undefined);

    expect(result.type).toBe('marketplace/createListing/rejected');
    expect(result.payload).toBe('Photo must be a valid URL');
  });
});

describe('marketplaceSlice getMyListings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses backend availability before slot status for host listing publish state', async () => {
    (marketplaceAPI.getMyListings as jest.Mock).mockResolvedValue({
      data: {
        data: [
          {
            id: 7,
            address: 'Occupied but published',
            lat: 14.5995,
            lon: 120.9822,
            price: 75,
            status: 'occupied',
            availability: true,
          },
        ],
      },
    });

    const result = await getMyListings()(jest.fn(), jest.fn(), undefined);
    const payload = result.payload as any[];

    expect(result.type).toBe('marketplace/getMyListings/fulfilled');
    expect(payload[0]).toEqual(expect.objectContaining({
      availability: true,
      status: 'occupied',
    }));
  });

  it('falls back to isActive before legacy status for host listing publish state', async () => {
    (marketplaceAPI.getMyListings as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 8,
          address: 'Available but paused',
          lat: 14.5995,
          lon: 120.9822,
          price: 75,
          status: 'available',
          isActive: false,
        },
      ],
    });

    const result = await getMyListings()(jest.fn(), jest.fn(), undefined);
    const payload = result.payload as any[];

    expect(result.type).toBe('marketplace/getMyListings/fulfilled');
    expect(payload[0]).toEqual(expect.objectContaining({
      availability: false,
      status: 'available',
    }));
  });
});
