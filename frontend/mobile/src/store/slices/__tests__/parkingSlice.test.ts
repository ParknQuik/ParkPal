import { configureStore } from '@reduxjs/toolkit';
import parkingReducer, {
  fetchParkingSpots,
  fetchSpotById,
  searchSpots,
  setSelectedSpot,
  updateFilters,
  clearFilters,
} from '../parkingSlice';

describe('parkingSlice', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        parking: parkingReducer,
      },
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().parking;
      expect(state).toEqual({
        spots: [],
        selectedSpot: null,
        loading: false,
        error: null,
        filters: {
          priceRange: [0, 100],
          amenities: [],
          sortBy: 'distance',
        },
      });
    });
  });

  describe('fetchParkingSpots', () => {
    it('should fetch parking spots successfully', async () => {
      await store.dispatch(fetchParkingSpots());

      const state = store.getState().parking;
      expect(state.loading).toBe(false);
      expect(state.spots).toBeInstanceOf(Array);
      expect(state.error).toBe(null);
    });

    it('should calculate distances when location provided', async () => {
      const location = { latitude: 14.5995, longitude: 120.9842 };

      await store.dispatch(fetchParkingSpots(location));

      const state = store.getState().parking;
      expect(state.spots.length).toBeGreaterThan(0);
      state.spots.forEach((spot: any) => {
        expect(spot.distance).toBeDefined();
        expect(typeof spot.distance).toBe('number');
      });
    });

    it('should set loading state during fetch', () => {
      store.dispatch(fetchParkingSpots());

      const state = store.getState().parking;
      expect(state.loading).toBe(true);
    });
  });

  describe('fetchSpotById', () => {
    it('should fetch spot by ID successfully', async () => {
      // First fetch all spots to get a valid ID
      await store.dispatch(fetchParkingSpots());
      const spots = store.getState().parking.spots;
      const validId = spots[0]?.id;

      if (validId) {
        await store.dispatch(fetchSpotById(validId));

        const state = store.getState().parking;
        expect(state.loading).toBe(false);
        expect(state.selectedSpot).not.toBe(null);
        expect(state.selectedSpot?.id).toBe(validId);
      }
    });

    it('should handle spot not found', async () => {
      await store.dispatch(fetchSpotById('invalid-id'));

      const state = store.getState().parking;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Spot not found');
    });
  });

  describe('searchSpots', () => {
    it('should search spots by title', async () => {
      await store.dispatch(searchSpots('parking'));

      const state = store.getState().parking;
      expect(state.loading).toBe(false);
      expect(state.spots).toBeInstanceOf(Array);
    });

    it('should return empty array for no matches', async () => {
      await store.dispatch(searchSpots('xyz123nonexistent'));

      const state = store.getState().parking;
      expect(state.loading).toBe(false);
      expect(state.spots).toEqual([]);
    });
  });

  describe('setSelectedSpot', () => {
    it('should set selected spot', () => {
      const mockSpot = {
        id: '1',
        title: 'Test Spot',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        latitude: 14.5995,
        longitude: 120.9842,
        price: 50,
        priceUnit: 'hour' as const,
        rating: 4.5,
        reviews: 10,
        distance: 1.2,
        availability: 'available' as const,
        images: ['image1.jpg'],
        amenities: ['covered', 'security'],
        description: 'Test description',
        ownerId: '1',
        ownerName: 'Test Owner',
        ownerRating: 4.5,
        features: {
          covered: true,
          security: true,
          evCharging: false,
          accessible: false,
          lighting: false,
          cctv: false,
        },
      };

      store.dispatch(setSelectedSpot(mockSpot));

      const state = store.getState().parking;
      expect(state.selectedSpot).toEqual(mockSpot);
    });

    it('should clear selected spot', () => {
      store.dispatch(setSelectedSpot(null));

      const state = store.getState().parking;
      expect(state.selectedSpot).toBe(null);
    });
  });

  describe('updateFilters', () => {
    it('should update price range filter', () => {
      store.dispatch(updateFilters({ priceRange: [10, 50] }));

      const state = store.getState().parking;
      expect(state.filters.priceRange).toEqual([10, 50]);
    });

    it('should update amenities filter', () => {
      store.dispatch(updateFilters({ amenities: ['covered', 'security'] }));

      const state = store.getState().parking;
      expect(state.filters.amenities).toEqual(['covered', 'security']);
    });

    it('should update sortBy filter', () => {
      store.dispatch(updateFilters({ sortBy: 'price' }));

      const state = store.getState().parking;
      expect(state.filters.sortBy).toBe('price');
    });

    it('should merge filters instead of replacing', () => {
      store.dispatch(updateFilters({ priceRange: [10, 50] }));
      store.dispatch(updateFilters({ amenities: ['covered'] }));

      const state = store.getState().parking;
      expect(state.filters.priceRange).toEqual([10, 50]);
      expect(state.filters.amenities).toEqual(['covered']);
    });
  });

  describe('clearFilters', () => {
    it('should reset filters to initial state', () => {
      // First set some filters
      store.dispatch(updateFilters({ priceRange: [10, 50] }));
      store.dispatch(updateFilters({ amenities: ['covered'] }));
      store.dispatch(updateFilters({ sortBy: 'price' }));

      // Then clear them
      store.dispatch(clearFilters());

      const state = store.getState().parking;
      expect(state.filters).toEqual({
        priceRange: [0, 100],
        amenities: [],
        sortBy: 'distance',
      });
    });
  });
});
