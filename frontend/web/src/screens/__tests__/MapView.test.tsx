import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MapView from '../MapView';
import api from '../../api';

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
});
