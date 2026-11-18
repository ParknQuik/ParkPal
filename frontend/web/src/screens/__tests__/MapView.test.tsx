import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MapView from '../MapView';
import api from '../../api';
import { loadGoogleMaps } from '../../utils/googleMaps';

vi.mock('../../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
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
		await waitFor(() => expect(searchButton).toBeEnabled());
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
		class GoogleMap {
            panTo() {} setZoom() {}
            getBounds() { return {
                getSouthWest: () => ({ lat: () => 14.59, lng: () => 120.97 }),
                getNorthEast: () => ({ lat: () => 14.61, lng: () => 120.99 }),
            }; }
        }
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, marker: { AdvancedMarkerElement: Marker } } } });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		vi.mocked(api.get).mockImplementation(async (path) => path === '/marketplace/discovery/candidates'
			? { data: { data: [{
				id: 5, title: 'Central Market Garage', address: 'Central Market', latitude: 14.6, longitude: 120.98,
				canBook: false, canShowAnalytics: true, isPreview: false,
				crowdGuidance: { circlingTimeSeconds: 420, sampleCount: 8, windowStart: '2026-11-15T14:00:00Z', windowEnd: '2026-11-15T15:00:00Z' },
			}] } }
			: { data: { data: [], pagination: {} } });
		vi.mocked(api.post).mockResolvedValue({ data: { data: [{ id: 'google-1', title: 'Google Garage', latitude: 14.6, longitude: 120.98 }] } });

		render(<MemoryRouter><MapView /></MemoryRouter>);
		expect(screen.getByText('Host spaces')).toBeInTheDocument();
		expect(screen.getByText('Bookable spaces listed by hosts')).toBeInTheDocument();
		expect(screen.getByText(/Optional, non-bookable facility and community guidance/)).toBeInTheDocument();
		expect(screen.getByRole('checkbox', { name: 'Nearby facilities' })).not.toBeChecked();
		expect(vi.mocked(api.get).mock.calls.filter(([path]) => path === '/marketplace/discovery/candidates')).toHaveLength(0);
		expect(screen.queryByRole('button', { name: 'Search Google Places' })).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole('checkbox', { name: 'Nearby facilities' }));
		await screen.findByText('Central Market Garage');
		fireEvent.click(screen.getByRole('button', { name: 'Search Google Places' }));
		await waitFor(() => expect(api.post).toHaveBeenCalledWith('/marketplace/discovery/google', expect.objectContaining({ south: 14.59, north: 14.61 })));
		await screen.findByRole('button', { name: 'Search This Area' });
		let marker: typeof markerInstances[number] | undefined;
		await waitFor(() => {
			marker = markerInstances.find((item) => String(item.options.title).includes('7 minute estimated circling time'));
			expect(marker).toBeDefined();
		});
		expect(marker).toBeDefined();
		act(() => marker?.handlers['gmp-click']());
		expect(await screen.findByText('Recent average circling time · 8 sessions')).toBeInTheDocument();
		expect(screen.getByText(/Guidance only/)).toBeInTheDocument();
        const count = markerInstances.length;
        fireEvent.change(screen.getByLabelText('Min ₱/hr'), { target: { value: '25' } });
        await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marketplace/search', expect.objectContaining({ params: expect.objectContaining({ minPrice: '25' }) })));
        expect(markerInstances).toHaveLength(count);
        expect(screen.getByText(/Guidance only/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Search Google Places' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Reserve Now' })).not.toBeInTheDocument();
	});
	it('renders OSM partner counts with source and timestamp without a reservation action', async () => {
		const markerInstances: Array<{ options: Record<string, unknown>; handlers: Record<string, () => void> }> = [];
		class Marker {
			map: unknown;
			options: Record<string, unknown>;
			handlers: Record<string, () => void> = {};
			constructor(options: Record<string, unknown>) { this.options = options; this.map = options.map; markerInstances.push(this); }
			addEventListener(name: string, handler: () => void) { this.handlers[name] = handler; }
		}
		class GoogleMap {
            panTo() {} setZoom() {}
            getBounds() { return {
                getSouthWest: () => ({ lat: () => 14.59, lng: () => 120.97 }),
                getNorthEast: () => ({ lat: () => 14.61, lng: () => 120.99 }),
            }; }
        }
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, marker: { AdvancedMarkerElement: Marker } } } });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		vi.mocked(api.get).mockImplementation(async (path) => path === '/marketplace/discovery/candidates'
			? { data: { data: [{
				id: 'osm-5', source: 'osm', attribution: '© OpenStreetMap contributors', partnerAvailability: { partner: 'Test Operator', availableCount: 12, occupiedCount: 38, updatedAt: new Date().toISOString() }, title: 'Central Market Garage', address: 'Central Market', latitude: 14.6, longitude: 120.98,
				canBook: false, canShowAnalytics: false, isPreview: true,
				crowdGuidance: { circlingTimeSeconds: 420, sampleCount: 8, windowStart: '2026-11-15T14:00:00Z', windowEnd: '2026-11-15T15:00:00Z' },
			}] } }
			: { data: { data: [], pagination: {} } });

		render(<MemoryRouter><MapView /></MemoryRouter>);
		expect(vi.mocked(api.get).mock.calls.filter(([path]) => path === '/marketplace/discovery/candidates')).toHaveLength(0);
		fireEvent.click(screen.getByRole('checkbox', { name: 'Nearby facilities' }));
		await screen.findByText('Central Market Garage');
		await screen.findByRole('button', { name: 'Search This Area' });
		let marker: typeof markerInstances[number] | undefined;
		await waitFor(() => {
			marker = markerInstances.find((item) => String(item.options.title).includes('Central Market Garage'));
			expect(marker).toBeDefined();
		});
		expect(marker).toBeDefined();
		act(() => marker?.handlers['gmp-click']());
		expect(await screen.findByText(/12 spaces reported available · Verified partner: Test Operator · Updated/)).toBeInTheDocument();
        expect(screen.getAllByText(/OpenStreetMap contributors/).length).toBeGreaterThan(0);
		expect(screen.getByText(/Guidance only/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Search Google Places' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Reserve Now' })).not.toBeInTheDocument();
	});
    const installMap = () => {
        let area = { south: 14.59, west: 120.97, north: 14.61, east: 120.99 };
        const listeners: Record<string, () => void> = {};
        const remove = vi.fn();
        class GoogleMap {
            panTo() {} setZoom() {}
            addListener(event: string, callback: () => void) { listeners[event] = callback; return { remove }; }
            getBounds() { return {
                getSouthWest: () => ({ lat: () => area.south, lng: () => area.west }),
                getNorthEast: () => ({ lat: () => area.north, lng: () => area.east }),
            }; }
        }
        class Marker { map: unknown; constructor(options: { map: unknown }) { this.map = options.map; } addEventListener() {} }
        Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, marker: { AdvancedMarkerElement: Marker } } } });
        vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
        return { remove, ready: () => !!listeners.idle, move: (north: number) => { area = { ...area, north }; listeners.idle(); } };
    };

    it('loads once, keeps pins while moving, searches only after a tap, and removes listeners', async () => {
        const map = installMap();
        vi.mocked(api.get).mockImplementation(async (path, config) => {
            if (path === '/marketplace/search') throw new Error('host search failed');
            if (config?.params?.north === 14.62) return { data: { data: [] } };
            return { data: { data: [{ id: 1, title: 'External Garage', latitude: 14.6, longitude: 120.98, isPreview: true, canBook: false }] } };
        });
        const calls = () => vi.mocked(api.get).mock.calls.filter(([path]) => path === '/marketplace/discovery/candidates');
        const { unmount } = render(<MemoryRouter><MapView /></MemoryRouter>);
        expect(calls()).toHaveLength(0);
        fireEvent.click(screen.getByRole('checkbox', { name: 'Nearby facilities' }));
        await screen.findByText('External Garage', {}, { timeout: 2500 });
        expect(screen.getByText(/Failed to load parking slots/)).toBeInTheDocument();
        await waitFor(() => expect(map.ready()).toBe(true));
        expect(calls()).toHaveLength(1);
        act(() => map.move(14.62));
        await waitFor(() => expect(calls()).toHaveLength(2));
        await waitFor(() => expect(screen.queryByText('External Garage')).not.toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'Search This Area' }));
        await waitFor(() => expect(calls()).toHaveLength(2), { timeout: 2000 });
        expect(calls()[1][1]?.params).toMatchObject({ north: 14.62 });
        act(() => map.move(14.62));
        expect(calls()).toHaveLength(2);
        unmount();
        expect(map.remove).toHaveBeenCalledTimes(1);
    });

    it('keeps host spaces when facilities fail and shows empty facilities only after retry succeeds', async () => {
        installMap();
        let fail = true;
        vi.mocked(api.get).mockImplementation(async (path) => {
            if (path === '/marketplace/discovery/candidates') {
                if (fail) throw new Error('provider failed');
                return { data: { data: [] } };
            }
            return { data: { data: [{ id: 5, address: 'Host Garage', lat: 14.6, lon: 120.98, price: 50, status: 'available' }] } };
        });
        render(<MemoryRouter><MapView /></MemoryRouter>);
        fireEvent.click(screen.getByRole('checkbox', { name: 'Nearby facilities' }));
		const retry = await screen.findByRole('button', { name: 'Retry local guidance' }, { timeout: 2500 });
        expect(screen.getByText('Host Garage')).toBeInTheDocument();
		expect(screen.queryByText('No facilities found in this map area.')).not.toBeInTheDocument();
        fail = false;
        fireEvent.click(retry);
		await screen.findByText('No facilities found in this map area.', {}, { timeout: 2000 });
        expect(screen.getByText('Host Garage')).toBeInTheDocument();
    });

});
