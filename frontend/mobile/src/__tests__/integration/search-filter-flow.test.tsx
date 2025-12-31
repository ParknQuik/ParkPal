/**
 * Integration Test: Search and Filter Flow
 * Tests the search and filtering functionality for parking spots
 */

import { configureStore } from '@reduxjs/toolkit';
import parkingReducer from '../../store/slices/parkingSlice';
import {
  fetchParkingSpots,
  searchSpots,
  updateFilters,
  clearFilters,
} from '../../store/slices/parkingSlice';

describe('Integration: Search and Filter Flow', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        parking: parkingReducer,
      },
    });
  });

  it('should search and then apply filters', async () => {
    // Step 1: Initial fetch
    await store.dispatch(
      fetchParkingSpots({ latitude: 14.5995, longitude: 120.9842 })
    );

    let state = store.getState().parking;
    const initialCount = state.spots.length;
    expect(initialCount).toBeGreaterThan(0);

    // Step 2: Apply price filter
    store.dispatch(updateFilters({ priceRange: [0, 30] }));

    state = store.getState().parking;
    expect(state.filters.priceRange).toEqual([0, 30]);

    // Step 3: Apply amenities filter
    store.dispatch(updateFilters({ amenities: ['covered', 'security'] }));

    state = store.getState().parking;
    expect(state.filters.amenities).toEqual(['covered', 'security']);

    // Step 4: Change sort order
    store.dispatch(updateFilters({ sortBy: 'price' }));

    state = store.getState().parking;
    expect(state.filters.sortBy).toBe('price');

    // Step 5: Clear filters
    store.dispatch(clearFilters());

    state = store.getState().parking;
    expect(state.filters).toEqual({
      priceRange: [0, 100],
      amenities: [],
      sortBy: 'distance',
    });
  });

  it('should search for specific spots', async () => {
    // Search for parking spots
    await store.dispatch(searchSpots('downtown'));

    const state = store.getState().parking;
    expect(state.loading).toBe(false);
    expect(state.spots).toBeInstanceOf(Array);
    expect(state.error).toBe(null);

    // Results should only contain spots matching the search
    state.spots.forEach((spot: any) => {
      const matchesSearch =
        spot.title.toLowerCase().includes('downtown') ||
        spot.address.toLowerCase().includes('downtown') ||
        spot.city.toLowerCase().includes('downtown');
      expect(matchesSearch).toBe(true);
    });
  });

  it('should handle multiple filter updates efficiently', () => {
    // Apply multiple filters in succession
    store.dispatch(updateFilters({ priceRange: [10, 50] }));
    store.dispatch(updateFilters({ amenities: ['covered'] }));
    store.dispatch(updateFilters({ sortBy: 'rating' }));
    store.dispatch(updateFilters({ amenities: ['covered', 'security'] }));

    const state = store.getState().parking;

    // All filters should be applied
    expect(state.filters).toEqual({
      priceRange: [10, 50],
      amenities: ['covered', 'security'],
      sortBy: 'rating',
    });
  });

  it('should reset state after clear filters', async () => {
    // Set up complex filter state
    store.dispatch(updateFilters({ priceRange: [20, 80] }));
    store.dispatch(updateFilters({ amenities: ['covered', 'evCharging'] }));
    store.dispatch(updateFilters({ sortBy: 'rating' }));

    // Clear everything
    store.dispatch(clearFilters());

    const state = store.getState().parking;
    expect(state.filters).toEqual({
      priceRange: [0, 100],
      amenities: [],
      sortBy: 'distance',
    });
  });

  it('should maintain spots data when updating filters', async () => {
    // Fetch spots first
    await store.dispatch(
      fetchParkingSpots({ latitude: 14.5995, longitude: 120.9842 })
    );

    let state = store.getState().parking;
    const spotsCount = state.spots.length;

    // Update filters
    store.dispatch(updateFilters({ priceRange: [10, 50] }));

    state = store.getState().parking;
    // Spots should still be there (filtering happens in UI layer)
    expect(state.spots.length).toBe(spotsCount);
  });
});
