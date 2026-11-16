import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListSlot from '../ListSlot';
import api from '../../api';
import { loadGoogleMaps } from '../../utils/googleMaps';

vi.mock('../../api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../../utils/googleMaps', () => ({ loadGoogleMaps: vi.fn() }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom');
	return { ...actual, useNavigate: () => mockNavigate };
});

let mapHandlers: Record<string, (event: any) => void>;
let markerHandlers: Record<string, (event: any) => void>;
let placeChanged: (() => void) | undefined;
let place: any;
let mapOptions: any;
let markerOptions: any;
let panTo: ReturnType<typeof vi.fn>;
let setPosition: ReturnType<typeof vi.fn>;
let setZoom: ReturnType<typeof vi.fn>;

function configureMaps() {
	mapHandlers = {};
	markerHandlers = {};
	placeChanged = undefined;
	place = {};
	panTo = vi.fn();
	setPosition = vi.fn();
	setZoom = vi.fn();
	class MapMock {
		constructor(_element: HTMLElement, options: any) { mapOptions = options; }
		addListener(name: string, handler: (event: any) => void) { mapHandlers[name] = handler; }
		panTo = panTo;
		setZoom = setZoom;
	}
	class MarkerMock {
		constructor(options: any) { markerOptions = options; }
		addListener(name: string, handler: (event: any) => void) { markerHandlers[name] = handler; }
		setPosition = setPosition;
	}
	class AutocompleteMock {
		constructor() {}
		bindTo() {}
		addListener(_name: string, handler: () => void) { placeChanged = handler; }
		getPlace() { return place; }
		unbindAll() {}
	}
	vi.mocked(loadGoogleMaps).mockResolvedValue({ maps: { Map: MapMock, Marker: MarkerMock, places: { Autocomplete: AutocompleteMock } } } as any);
}

describe('ListSlot location picker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		configureMaps();
		vi.mocked(api.get).mockResolvedValue({ data: {} } as any);
		vi.mocked(api.post).mockResolvedValue({ data: { id: 12 } } as any);
		vi.mocked(api.put).mockResolvedValue({ data: {} } as any);
	});

	it('selects an address and keeps map clicks and pin drags in sync', async () => {
		render(<MemoryRouter><ListSlot /></MemoryRouter>);
		await screen.findByRole('region', { name: 'Parking location map' });
		await waitFor(() => expect(placeChanged).toBeDefined());
		expect(mapOptions.center).toEqual({ lat: 14.5995, lng: 120.9842 });
		place = { formatted_address: '1 Example Street, Makati City, Metro Manila', geometry: { location: { lat: () => 14.55, lng: () => 121.02 } } };
		act(() => placeChanged?.());
		expect(await screen.findByDisplayValue('1 Example Street, Makati City, Metro Manila')).toBeInTheDocument();
		await screen.findByText(/14\.550000, 121\.020000/);
		expect(panTo).toHaveBeenCalledWith({ lat: 14.55, lng: 121.02 });
		act(() => mapHandlers.click({ latLng: { lat: () => 14.56, lng: () => 121.03 } }));
		await screen.findByText(/14\.560000, 121\.030000/);
		act(() => markerHandlers.dragend({ latLng: { lat: () => 14.57, lng: () => 121.04 } }));
		await screen.findByText(/14\.570000, 121\.040000/);
	});

	it('starts edit mode from the saved pin and keeps photos after location details', async () => {
		vi.mocked(api.get).mockResolvedValue({ data: { title: 'Saved spot', lat: 14.6, lon: 121.1, address: 'Saved address', price: 50, photos: [] } } as any);
		render(<MemoryRouter initialEntries={['/list-slot?edit=8']}><ListSlot /></MemoryRouter>);
		await screen.findByRole('region', { name: 'Parking location map' });
		await waitFor(() => expect(mapOptions.center).toEqual({ lat: 14.6, lng: 121.1 }));
		expect(markerOptions.position).toEqual({ lat: 14.6, lng: 121.1 });
		const locationHeading = screen.getByText('Location Details');
		const photosHeading = screen.getByText('Photos');
		expect(locationHeading.compareDocumentPosition(photosHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('blocks submission without coordinates and submits selected coordinates as lat and lon', async () => {
		render(<MemoryRouter><ListSlot /></MemoryRouter>);
		await screen.findByRole('region', { name: 'Parking location map' });
		fireEvent.change(screen.getByRole('textbox', { name: /Listing title/ }), { target: { value: 'My parking spot' } });
		fireEvent.change(screen.getByRole('textbox', { name: /Full Address/ }), { target: { value: '123 Example Road, Makati City' } });
		fireEvent.change(screen.getByRole('spinbutton', { name: /Price per Hour/ }), { target: { value: '50' } });
		fireEvent.click(screen.getByRole('button', { name: 'Create Listing' }));
		await screen.findByText('Latitude must be between -90 and 90.');
		expect(api.post).not.toHaveBeenCalled();
		act(() => mapHandlers.click({ latLng: { lat: () => 14.58, lng: () => 121.05 } }));
		await screen.findByText(/14\.580000, 121\.050000/);
		fireEvent.click(screen.getByRole('button', { name: 'Create Listing' }));
		await waitFor(() => expect(api.post).toHaveBeenCalledWith('/marketplace/listings', expect.objectContaining({ lat: 14.58, lon: 121.05 })));
	});

	it('signs and uploads a selected PNG using the same content type', async () => {
		const originalCreateObjectURL = URL.createObjectURL;
		URL.createObjectURL = vi.fn(() => 'blob:test-photo') as any;
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
		vi.stubGlobal('fetch', fetchMock);
		vi.mocked(api.get).mockImplementation(async (path) => path.includes('/photos/upload-url')
			? { data: { uploadUrl: 'https://storage.example/upload', fileName: 'listings/12/original_photo.png' } } as any
			: { data: {} } as any);
		vi.mocked(api.post).mockImplementation(async (path) => path === '/marketplace/listings'
			? { data: { id: 12 } } as any
			: { data: { original: 'https://storage.example/photo.png' } } as any);
		render(<MemoryRouter><ListSlot /></MemoryRouter>);
		await screen.findByRole('region', { name: 'Parking location map' });
		fireEvent.change(screen.getByRole('textbox', { name: /Listing title/ }), { target: { value: 'My parking spot' } });
		fireEvent.change(screen.getByRole('textbox', { name: /Full Address/ }), { target: { value: '123 Example Road, Makati City' } });
		fireEvent.change(screen.getByRole('spinbutton', { name: /Price per Hour/ }), { target: { value: '50' } });
		const photo = new File(['image'], 'space.png', { type: 'image/png' });
		fireEvent.change(screen.getByLabelText('Choose listing photos'), { target: { files: [photo] } });
		act(() => mapHandlers.click({ latLng: { lat: () => 14.58, lng: () => 121.05 } }));
		await screen.findByText('1/5 photos');
		fireEvent.click(screen.getByRole('button', { name: 'Create Listing' }));
		await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('https://storage.example/upload', expect.objectContaining({
			headers: { 'Content-Type': 'image/png' }, body: photo,
		})));
		expect(api.get).toHaveBeenCalledWith('/marketplace/listings/12/photos/upload-url', expect.objectContaining({
			params: expect.objectContaining({ contentType: 'image/png' }),
		}));
		URL.createObjectURL = originalCreateObjectURL;
		vi.unstubAllGlobals();
	});

	it('keeps the form open when a photo upload fails so the host can retry', async () => {
		URL.createObjectURL = vi.fn(() => 'blob:test-photo') as any;
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
		vi.mocked(api.get).mockImplementation(async (path) => path.includes('/photos/upload-url')
			? { data: { uploadUrl: 'https://storage.example/upload', fileName: 'listings/12/original_photo.png' } } as any
			: { data: {} } as any);
		vi.mocked(api.post).mockImplementation(async (path) => path === '/marketplace/listings'
			? { data: { id: 12 } } as any
			: { data: { original: 'https://storage.example/photo.png' } } as any);
		render(<MemoryRouter><ListSlot /></MemoryRouter>);
		await screen.findByRole('region', { name: 'Parking location map' });
		fireEvent.change(screen.getByRole('textbox', { name: /Listing title/ }), { target: { value: 'My parking spot' } });
		fireEvent.change(screen.getByRole('textbox', { name: /Full Address/ }), { target: { value: '123 Example Road, Makati City' } });
		fireEvent.change(screen.getByRole('spinbutton', { name: /Price per Hour/ }), { target: { value: '50' } });
		fireEvent.change(screen.getByLabelText('Choose listing photos'), { target: { files: [new File(['image'], 'space.png', { type: 'image/png' })] } });
		act(() => mapHandlers.click({ latLng: { lat: () => 14.58, lng: () => 121.05 } }));
		fireEvent.click(screen.getByRole('button', { name: 'Create Listing' }));
		await screen.findByText(/Photo upload issue: Storage upload failed \(500\)/);
		expect(mockNavigate).not.toHaveBeenCalled();
	});
});
