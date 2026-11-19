import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MapView from '../MapView';
import api from '../../api';
import { loadGoogleMaps } from '../../utils/googleMaps';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../../theme/theme';

vi.mock('../../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../utils/googleMaps', () => ({
	loadGoogleMaps: vi.fn(() => Promise.reject(new Error('Configure VITE_GOOGLE_MAPS_API_KEY to enable Google Maps.'))),
}));

describe('MapView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllEnvs();
		vi.stubEnv('VITE_GOOGLE_MAP_ID', '');
		Object.defineProperty(window, 'google', { configurable: true, value: undefined });
		Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
		vi.mocked(loadGoogleMaps).mockRejectedValue(new Error('Configure VITE_GOOGLE_MAPS_API_KEY to enable Google Maps.'));
		vi.mocked(api.get).mockResolvedValue({ data: { data: [], pagination: {} } });
	});

	it('uses the granted position for search and recentering', async () => {
		const position = { lat: 14.12, lng: 121.34 };
		const panTo = vi.fn();
		const setZoom = vi.fn();
		class GoogleMap {
			constructor(_element: HTMLElement, options: { center: { lat: number; lng: number } }) {
				expect(options.center).toEqual(position);
			}
			getBounds() { return null; }
			panTo = panTo;
			setZoom = setZoom;
		}
		class Marker { map: unknown; constructor(options: { map: unknown }) { this.map = options.map; } addEventListener() {} }
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, marker: { AdvancedMarkerElement: Marker } } } });
		Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
			getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: position.lat, longitude: position.lng } } as GeolocationPosition),
		} });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		render(<MemoryRouter initialEntries={['/map?location=thre']}><MapView /></MemoryRouter>);
		const recenter = await screen.findByRole('button', { name: 'Return to your location' });
		await waitFor(() => expect(recenter).toBeEnabled());
		await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marketplace/search', expect.objectContaining({
			params: expect.objectContaining({ lat: position.lat, lon: position.lng }),
		})));
		fireEvent.click(recenter);
		expect(panTo).toHaveBeenCalledWith(position);
		expect(setZoom).toHaveBeenCalledWith(15);
		expect(screen.queryByText(/Your location is unavailable/)).not.toBeInTheDocument();
	});

	it('keeps Manila as the starting area when location is denied', async () => {
		class GoogleMap { getBounds() { return null; } }
		class Marker { map: unknown; constructor(options: { map: unknown }) { this.map = options.map; } addEventListener() {} }
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, marker: { AdvancedMarkerElement: Marker } } } });
		Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
			getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1, message: 'denied' } as GeolocationPositionError),
		} });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		render(<MemoryRouter initialEntries={['/map?location=thre']}><MapView /></MemoryRouter>);
		await screen.findByText(/Your location is unavailable/);
		expect(screen.getByRole('button', { name: 'Return to your location' })).toBeDisabled();
		await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marketplace/search', expect.objectContaining({
			params: expect.objectContaining({ lat: 14.5995, lon: 120.9842 }),
		})));
	});

	it.each([
		'/map?lat=function%28%29%7B%7D&lng=function%28%29%7B%7D',
		'/map?lat=91&lng=121',
	])('falls back to Manila for malformed URL coordinates (%s)', async (url) => {
		const mapCenters: Array<{ lat: number; lng: number }> = [];
		class GoogleMap {
			constructor(_element: HTMLElement, options: { center: { lat: number; lng: number } }) { mapCenters.push(options.center); }
			getBounds() { return null; }
		}
		class Marker { map: unknown; constructor(options: { map: unknown }) { this.map = options.map; } addEventListener() {} }
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, marker: { AdvancedMarkerElement: Marker } } } });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		render(<MemoryRouter initialEntries={[url]}><MapView /></MemoryRouter>);
		await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marketplace/search', expect.objectContaining({
			params: expect.objectContaining({ lat: 14.5995, lon: 120.9842 }),
		})));
		await waitFor(() => expect(mapCenters).toContainEqual({ lat: 14.5995, lng: 120.9842 }));
	});

	it('keeps destination results visible until the sidebar search is edited', async () => {
		vi.mocked(api.get).mockResolvedValue({ data: { data: [{ id: 1, address: 'Host Garage', lat: 14.6, lon: 120.98, price: 50, status: 'available' }] } });
		render(<MemoryRouter initialEntries={['/map?location=Makati%20City%2C%20Metro%20Manila%2C%20Philippines&lat=14.5547&lng=121.0244']}><MapView /></MemoryRouter>);
		await screen.findByText('Host Garage');
		const sidebarSearch = screen.getByPlaceholderText('Search by location, type...');
		expect(sidebarSearch).toHaveValue('');
		await waitFor(() => expect(screen.getByText('Host Garage')).toBeInTheDocument());
		fireEvent.change(sidebarSearch, { target: { value: 'No matching garage' } });
		await waitFor(() => expect(screen.queryByText('Host Garage')).not.toBeInTheDocument());
		fireEvent.change(sidebarSearch, { target: { value: 'Host' } });
		await screen.findByText('Host Garage');
	});

	it.each([90, -90])('keeps synthetic bounds finite at latitude %s', async (lat) => {
		render(<MemoryRouter initialEntries={[`/map?lat=${lat}&lng=121`]}><MapView /></MemoryRouter>);
		await waitFor(() => expect(api.get).toHaveBeenCalled());
		const request = vi.mocked(api.get).mock.calls.find(([path]) => path === '/marketplace/search');
		const params = request?.[1]?.params as Record<string, number>;
		expect(Number.isFinite(params.lat)).toBe(true);
		expect(params.lat).toBeGreaterThanOrEqual(params.south);
		expect(params.lat).toBeLessThanOrEqual(params.north);
		for (const key of ['south', 'north', 'west', 'east']) expect(Number.isFinite(params[key])).toBe(true);
		expect(params.south).toBeGreaterThanOrEqual(-90);
		expect(params.north).toBeLessThanOrEqual(90);
		expect(params.west).toBeGreaterThanOrEqual(-180);
		expect(params.east).toBeLessThanOrEqual(180);
	});

	it('preserves longitude zero in the marketplace request', async () => {
		render(<MemoryRouter initialEntries={['/map?lat=14.6&lng=0']}><MapView /></MemoryRouter>);
		await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marketplace/search', expect.objectContaining({
			params: expect.objectContaining({ lat: 14.6, lon: 0 }),
		})));
	});

	it('uses the versioned marketplace search API and keeps the list available without Maps configuration', async () => {
		render(<MemoryRouter><MapView /></MemoryRouter>);

		await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marketplace/search', expect.objectContaining({
			params: expect.objectContaining({ lat: 14.5995, lon: 120.9842, radius: 5 }),
		})));
		await waitFor(() => expect(document.body.textContent).toContain('Configure VITE_GOOGLE_MAPS_API_KEY'));
	});

	it('uses the demo map ID in local development and renders host markers', async () => {
		let mapId: string | undefined;
		const markers = vi.fn();
		class GoogleMap {
			constructor(_element: HTMLElement, options: { mapId: string }) { mapId = options.mapId; }
			getBounds() { return null; }
		}
		class Marker {
			map: unknown;
			constructor(options: { map: unknown }) { this.map = options.map; markers(); }
			addEventListener() {}
		}
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, marker: { AdvancedMarkerElement: Marker } } } });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		vi.mocked(api.get).mockResolvedValue({ data: { data: [{ id: 1, address: 'Host Garage', lat: 14.6, lon: 120.98, price: 50, status: 'available' }] } });
		render(<MemoryRouter><MapView /></MemoryRouter>);
		await screen.findByText('Host Garage');
		await waitFor(() => expect(mapId).toBe('DEMO_MAP_ID'));
		await waitFor(() => expect(markers).toHaveBeenCalled());
	});

	it('uses the configured map ID and rebuilds the map for a theme change without moving it', async () => {
		vi.stubEnv('VITE_GOOGLE_MAP_ID', 'web-map-id');
		const options: Array<{ mapId: string; colorScheme: string; center: { lat: number; lng: number }; zoom: number }> = [];
		const removed = vi.fn();
		class GoogleMap {
			constructor(_element: HTMLElement, config: typeof options[number]) { options.push(config); }
			getCenter() { return { toJSON: () => ({ lat: 14.5, lng: 121 }) }; }
			getZoom() { return 16; }
			getBounds() { return null; }
			addListener() { return { remove: removed }; }
		}
		class Marker { map: unknown; constructor(config: { map: unknown }) { this.map = config.map; } addEventListener() {} }
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, ColorScheme: { LIGHT: 'LIGHT', DARK: 'DARK' }, marker: { AdvancedMarkerElement: Marker } } } });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		const view = (mode: 'light' | 'dark') => <ThemeProvider theme={createAppTheme(mode)}><MemoryRouter><MapView /></MemoryRouter></ThemeProvider>;
		const { rerender } = render(view('light'));
		await waitFor(() => expect(options).toHaveLength(1));
		expect(options[0]).toMatchObject({ mapId: 'web-map-id', colorScheme: 'LIGHT' });
		rerender(view('dark'));
		await waitFor(() => expect(options).toHaveLength(2));
		expect(options[1]).toMatchObject({ mapId: 'web-map-id', colorScheme: 'DARK', center: { lat: 14.5, lng: 121 }, zoom: 16 });
		expect(removed).toHaveBeenCalledTimes(1);
	});

	it('distinguishes bookable, selected, facility, preview, and location markers', async () => {
		const markers: Array<{ options: Record<string, any>; content: HTMLElement; handlers: Record<string, () => void>; title: string; zIndex: number }> = [];
		class GoogleMap { getBounds() { return { getSouthWest: () => ({ lat: () => 14.59, lng: () => 120.97 }), getNorthEast: () => ({ lat: () => 14.61, lng: () => 120.99 }) }; } }
		class Marker {
			map: unknown;
			options: Record<string, any>;
			content: HTMLElement;
			handlers: Record<string, () => void> = {};
			title = '';
			zIndex = 0;
			constructor(config: Record<string, any>) { this.options = config; this.content = config.content; this.map = config.map; markers.push(this); }
			addEventListener(event: string, handler: () => void) { this.handlers[event] = handler; }
		}
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, marker: { AdvancedMarkerElement: Marker } } } });
		Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 14.6, longitude: 120.98 } } as GeolocationPosition) } });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		vi.mocked(api.get).mockImplementation(async path => path === '/marketplace/discovery/candidates'
			? { data: { data: [
				{ id: 2, source: 'community', title: 'Verified Garage', latitude: 14.6, longitude: 120.98, isPreview: false, canBook: false },
				{ id: 3, source: 'osm', title: 'Possible Garage', latitude: 14.6, longitude: 120.98, isPreview: true, canBook: false },
			] } }
			: { data: { data: [{ id: 1, address: 'Host Garage', lat: 14.6, lon: 120.98, price: 50, status: 'available' }] } });
		render(<MemoryRouter><MapView /></MemoryRouter>);
		fireEvent.click(screen.getByRole('checkbox', { name: 'Nearby facilities' }));
		await waitFor(() => expect(markers).toHaveLength(4));
		const host = markers.find(marker => marker.title.includes('Bookable host space'))!;
		const facility = markers.find(marker => marker.title.includes('Verified Garage'))!;
		const preview = markers.find(marker => marker.title.includes('Possible Garage'))!;
		const location = markers.find(marker => marker.title === 'Your location')!;
		expect(host.content.textContent).toBe('₱50');
		expect(host.content.style.fontSize).toBe('14px');
		expect(host.content.style.background).toBe('rgb(23, 107, 91)');
		expect(facility.content.style.fontSize).toBe('11px');
		expect(facility.title).toContain('not bookable');
		expect(preview.content.textContent).toBe('?');
		expect(preview.title).toContain('Unverified parking preview');
		expect(location.content.style.background).toBe('rgb(66, 133, 244)');
		act(() => host.handlers['gmp-click']());
		await waitFor(() => expect(host.zIndex).toBe(1000));
		expect(host.title).toContain('Selected.');
		expect(host.content.style.borderColor).toBe('rgb(240, 182, 122)');
	});

	it('keeps host results visible when advanced markers are unavailable', async () => {
		class GoogleMap {}
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap } } });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		vi.mocked(api.get).mockResolvedValue({ data: { data: [{ id: 1, address: 'Host Garage', lat: 14.6, lon: 120.98, price: 50, status: 'available' }] } });
		render(<MemoryRouter><MapView /></MemoryRouter>);
		await screen.findByText('Host Garage');
		await screen.findByText('Map View Unavailable');
		expect(screen.getByText('Bookable spaces listed by hosts')).toBeInTheDocument();
		expect(screen.getByText('Map view unavailable. Use the sidebar to browse parking spots.')).toBeInTheDocument();
	});

	it('keeps host results visible when a marker constructor throws', async () => {
		class GoogleMap { getBounds() { return null; } }
		class Marker { constructor() { throw new Error('marker constructor failed'); } }
		Object.defineProperty(window, 'google', { configurable: true, value: { maps: { Map: GoogleMap, marker: { AdvancedMarkerElement: Marker } } } });
		vi.mocked(loadGoogleMaps).mockResolvedValue({} as typeof google);
		vi.mocked(api.get).mockResolvedValue({ data: { data: [{ id: 1, address: 'Host Garage', lat: 14.6, lon: 120.98, price: 50, status: 'available' }] } });
		render(<MemoryRouter><MapView /></MemoryRouter>);
		await screen.findByText('Host Garage');
		await screen.findByText('Map View Unavailable');
		expect(screen.getByText('Bookable spaces listed by hosts')).toBeInTheDocument();
		expect(screen.getByText('Map view unavailable. Use the sidebar to browse parking spots.')).toBeInTheDocument();
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
		await waitFor(() => expect(screen.getByRole('button', { name: 'Search Google Places' })).toBeEnabled());
		fireEvent.click(screen.getByRole('button', { name: 'Search Google Places' }));
		await waitFor(() => expect(api.post).toHaveBeenCalledWith('/marketplace/discovery/google', expect.objectContaining({ south: expect.any(Number), north: expect.any(Number) })));
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
        expect(calls()).toHaveLength(1);
        expect(screen.getByText('External Garage')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Search This Area' }));
        await waitFor(() => expect(calls()).toHaveLength(2), { timeout: 2000 });
        await waitFor(() => expect(screen.queryByText('External Garage')).not.toBeInTheDocument());
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
