import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Search from '../Search';
import { loadGoogleMaps } from '../../utils/googleMaps';

vi.mock('../../utils/googleMaps', () => ({ loadGoogleMaps: vi.fn() }));
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom');
	return { ...actual, useNavigate: () => mockNavigate };
});

let widgetInstance: (HTMLElement & { options: { includedRegionCodes: string[] }; value: string }) | undefined;
class FakePlaceAutocompleteElement extends HTMLElement {
	options: { includedRegionCodes: string[] };
	value = '';
	constructor(options: { includedRegionCodes: string[] }) {
		super(); this.options = options; widgetInstance = this;
		const input = this.attachShadow({ mode: 'open' }).appendChild(document.createElement('input'));
		input.setAttribute('aria-label', 'Location');
	}
}
const renderSearch = () => render(<BrowserRouter><Search /></BrowserRouter>);

describe('Search Places autocomplete', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		widgetInstance = undefined;
		if (!customElements.get('fake-place-autocomplete')) customElements.define('fake-place-autocomplete', FakePlaceAutocompleteElement);
		vi.mocked(loadGoogleMaps).mockResolvedValue({ maps: { places: { PlaceAutocompleteElement: FakePlaceAutocompleteElement } } } as never);
	});
	afterEach(() => { vi.unstubAllGlobals(); });

	it('restricts suggestions to the Philippines and saves selected address and coordinates', async () => {
		const view = renderSearch();
		await waitFor(() => expect(widgetInstance).toBeDefined());
		expect(widgetInstance?.options.includedRegionCodes).toEqual(['ph']);
		const place = { formattedAddress: 'Makati, Metro Manila, Philippines', location: { lat: 14.5547, lng: 121.0244 }, fetchFields: vi.fn().mockResolvedValue(undefined) };
		widgetInstance?.dispatchEvent(Object.assign(new Event('gmp-select'), { placePrediction: { toPlace: () => place } }));
		await waitFor(() => expect(screen.getByRole('button', { name: 'Search Parking' })).toBeEnabled());
		fireEvent.click(screen.getByRole('button', { name: 'Search Parking' }));
		expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('location=Makati'));
		expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('lat=14.5547'));
		expect(place.fetchFields).toHaveBeenCalledWith({ fields: ['formattedAddress', 'displayName', 'location'] });
		view.unmount();
		expect(widgetInstance?.isConnected).toBe(false);
	});

	it('clears selected coordinates when the widget input changes and preserves popular locations', async () => {
		renderSearch();
		await waitFor(() => expect(widgetInstance).toBeDefined());
		fireEvent.click(screen.getByRole('button', { name: 'Manila' }));
		expect(widgetInstance?.value).toBe('Manila');
		expect(screen.getByRole('button', { name: 'Search Parking' })).toBeEnabled();
		const input = widgetInstance?.shadowRoot?.querySelector('input');
		if (input) act(() => { input.value = 'Manila edited'; input.dispatchEvent(new Event('input', { bubbles: true, composed: true })); });
		await waitFor(() => expect(screen.getByRole('button', { name: 'Search Parking' })).toBeDisabled());
	});

	it('shows a fallback when Google Maps fails and removes the widget on unmount', async () => {
		const error = new Error('Maps unavailable');
		vi.mocked(loadGoogleMaps).mockRejectedValueOnce(error);
		const view = renderSearch();
		expect(await screen.findByText(/Maps unavailable/)).toBeInTheDocument();
		view.unmount();
	});
});
