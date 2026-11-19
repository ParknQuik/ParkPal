import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Search from '../Search';
import { loadGoogleMaps } from '../../utils/googleMaps';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../../theme/theme';

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
const renderSearch = (mode: 'light' | 'dark' = 'light') => render(<ThemeProvider theme={createAppTheme(mode)}><BrowserRouter><Search /></BrowserRouter></ThemeProvider>);

describe('Search Places autocomplete', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		widgetInstance = undefined;
		if (!customElements.get('fake-place-autocomplete')) customElements.define('fake-place-autocomplete', FakePlaceAutocompleteElement);
		vi.mocked(loadGoogleMaps).mockResolvedValue({ maps: { places: { PlaceAutocompleteElement: FakePlaceAutocompleteElement } } } as never);
	});
	afterEach(() => { vi.unstubAllGlobals(); });

	it('gives both date fields accessible external labels styled like the location label', () => {
		renderSearch();
		const locationLabel = screen.getByText('Where do you need parking?');
		const checkInLabel = screen.getByText('Check-in');
		const checkOutLabel = screen.getByText('Check-out');

		expect(screen.getByLabelText('Check-in')).toHaveAttribute('type', 'datetime-local');
		expect(screen.getByLabelText('Check-out')).toHaveAttribute('type', 'datetime-local');
		expect(checkInLabel.className).toBe(locationLabel.className);
		expect(checkOutLabel.className).toBe(locationLabel.className);
		expect(checkInLabel).toHaveStyle({ marginBottom: '8px' });
		expect(checkOutLabel).toHaveStyle({ marginBottom: '8px' });
	});

	it('restricts suggestions to the Philippines and saves selected address and coordinates', async () => {
		const view = renderSearch();
		await waitFor(() => expect(widgetInstance).toBeDefined());
		expect(widgetInstance?.options.includedRegionCodes).toEqual(['ph']);
		const place = { formattedAddress: 'Makati, Metro Manila, Philippines', location: { lat: () => 14.5547, lng: () => 121.0244 }, fetchFields: vi.fn().mockResolvedValue(undefined) };
		widgetInstance?.dispatchEvent(Object.assign(new Event('gmp-select'), { placePrediction: { toPlace: () => place } }));
		await waitFor(() => expect(screen.getByRole('button', { name: 'Search Parking' })).toBeEnabled());
		fireEvent.click(screen.getByRole('button', { name: 'Search Parking' }));
		expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('location=Makati'));
		const destination = mockNavigate.mock.lastCall?.[0] as string;
		const params = new URLSearchParams(destination.split('?')[1]);
		expect(params.get('lat')).toBe('14.5547');
		expect(params.get('lng')).toBe('121.0244');
		expect(place.fetchFields).toHaveBeenCalledWith({ fields: ['formattedAddress', 'displayName', 'location'] });
		view.unmount();
		expect(widgetInstance?.isConnected).toBe(false);
	});

	it('disables parking search when a selected place has invalid coordinates', async () => {
		renderSearch();
		await waitFor(() => expect(widgetInstance).toBeDefined());
		const place = { location: { lat: () => Number.NaN, lng: () => 121.0244 }, fetchFields: vi.fn().mockResolvedValue(undefined) };
		widgetInstance?.dispatchEvent(Object.assign(new Event('gmp-select'), { placePrediction: { toPlace: () => place } }));
		await screen.findByText(/selected location has invalid coordinates/i);
		expect(screen.getByRole('button', { name: 'Search Parking' })).toBeDisabled();
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

	it('sets the Places field color scheme from the active theme', async () => {
		const lightView = renderSearch('light');
		await waitFor(() => expect(widgetInstance).toBeDefined());
		let generatedStyles = Array.from(document.querySelectorAll('style')).map((style) => style.textContent).join(' ');
		expect(generatedStyles).toContain('color-scheme:light');
		lightView.unmount();

		renderSearch('dark');
		await waitFor(() => expect(widgetInstance).toBeDefined());
		generatedStyles = Array.from(document.querySelectorAll('style')).map((style) => style.textContent).join(' ');
		expect(generatedStyles).toContain('color-scheme:dark');
	});
});
