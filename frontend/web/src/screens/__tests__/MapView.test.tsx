import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MapView from '../MapView';
import api from '../../api';
import { loadGoogleMaps } from '../../utils/googleMaps';

vi.mock('../../api', () => ({ default: { get: vi.fn() } }));
vi.mock('../../utils/googleMaps', () => ({
	loadGoogleMaps: vi.fn(() => Promise.reject(new Error('Configure VITE_GOOGLE_MAPS_API_KEY to enable Google Maps.'))),
}));

describe('MapView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(api.get).mockResolvedValue({ data: { data: [], pagination: {} } });
	});

	it('uses the versioned marketplace search API and keeps the list available without Maps configuration', async () => {
		render(<MemoryRouter><MapView /></MemoryRouter>);

		await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marketplace/search', expect.objectContaining({
			params: expect.objectContaining({ lat: 14.5995, lon: 120.9842, radius: 5 }),
		})));
		await waitFor(() => expect(document.body.textContent).toContain('Configure VITE_GOOGLE_MAPS_API_KEY'));
	});

	it('offers price, bookable space, amenity, and sort controls', async () => {
		render(<MemoryRouter><MapView /></MemoryRouter>);
		await screen.findByLabelText('Min ₱/hr');
		expect(screen.getByLabelText('Max ₱/hr')).toBeInTheDocument();
		expect(screen.getByLabelText('Space type')).toBeInTheDocument();
		expect(screen.getByLabelText('Amenity')).toBeInTheDocument();
		expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText('Min ₱/hr'), { target: { value: '50' } });
		await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marketplace/search', expect.objectContaining({
			params: expect.objectContaining({ minPrice: '50' }),
		})));
	});

	it('searches the visible map bounds and keeps them on filter refreshes', async () => {
		const map = {
			getBounds: () => ({
				getSouthWest: () => ({ lat: () => 14.5, lng: () => 120.9 }),
				getNorthEast: () => ({ lat: () => 14.7, lng: () => 121.1 }),
			}),
		};
		class Marker { map: unknown; constructor(options: { map: unknown }) { this.map = options.map; } addEventListener() {} }
		class GoogleMap { constructor() { return map; } }
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, marker: { AdvancedMarkerElement: Marker } } } });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		render(<MemoryRouter><MapView /></MemoryRouter>);
		const searchButton = await screen.findByRole('button', { name: 'Search This Area' });
		fireEvent.click(searchButton);
		const expectedBounds = { south: 14.5, west: 120.9, north: 14.7, east: 121.1 };
		await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marketplace/search', expect.objectContaining({
			params: expect.objectContaining(expectedBounds),
		})));
		fireEvent.change(screen.getByLabelText('Min ₱/hr'), { target: { value: '50' } });
		await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marketplace/search', expect.objectContaining({
			params: expect.objectContaining({ ...expectedBounds, minPrice: '50' }),
		})));
	});

	it('shows current crowd guidance for verified candidate pins without booking claims', async () => {
		const markerInstances: Array<{ options: Record<string, unknown>; handlers: Record<string, () => void> }> = [];
		class Marker {
			map: unknown;
			options: Record<string, unknown>;
			handlers: Record<string, () => void> = {};
			constructor(options: Record<string, unknown>) { this.options = options; this.map = options.map; markerInstances.push(this); }
			addEventListener(name: string, handler: () => void) { this.handlers[name] = handler; }
		}
		class GoogleMap { panTo() {} setZoom() {} constructor() { return this; } }
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, marker: { AdvancedMarkerElement: Marker } } } });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		vi.mocked(api.get).mockImplementation(async (path) => path === '/marketplace/discovery/candidates'
			? { data: { data: [{
				id: 5, title: 'Central Market Garage', address: 'Central Market', latitude: 14.6, longitude: 120.98,
				canBook: false, canShowAnalytics: true, isPreview: false,
				crowdGuidance: { circlingTimeSeconds: 420, sampleCount: 8, windowStart: '2026-11-15T14:00:00Z', windowEnd: '2026-11-15T15:00:00Z' },
			}] } }
			: { data: { data: [], pagination: {} } });

		render(<MemoryRouter><MapView /></MemoryRouter>);
		await screen.findByText('Central Market Garage');
		await screen.findByRole('button', { name: 'Search This Area' });
		let marker: typeof markerInstances[number] | undefined;
		await waitFor(() => {
			marker = markerInstances.find((item) => String(item.options.title).includes('7 minute estimated circling time'));
			expect(marker).toBeDefined();
		});
		expect(marker).toBeDefined();
		marker?.handlers['gmp-click']();
		expect(await screen.findByText('Recent average circling time · 8 sessions')).toBeInTheDocument();
		expect(screen.getByText(/Guidance only/)).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Reserve Now' })).not.toBeInTheDocument();
	});
});
