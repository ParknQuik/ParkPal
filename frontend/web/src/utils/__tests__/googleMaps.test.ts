import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('loadGoogleMaps', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key');
		delete (window as Window & { google?: typeof google }).google;
	});

	it('waits for the marker library before resolving', async () => {
		let finishImport!: () => void;
		const importLibrary = vi.fn(() => new Promise<void>((resolve) => { finishImport = resolve; }));
		const maps = { maps: { importLibrary } } as unknown as typeof google;
		Object.defineProperty(window, 'google', { configurable: true, value: maps });
		const { loadGoogleMaps } = await import('../googleMaps');

		let resolved = false;
		const loading = loadGoogleMaps(['marker']).then(() => { resolved = true; });
		await Promise.resolve();
		expect(importLibrary).toHaveBeenCalledWith('marker');
		expect(resolved).toBe(false);
		finishImport();
		await loading;
		expect(resolved).toBe(true);
	});

	it('fails clearly when no API key is configured', async () => {
		vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
		const { loadGoogleMaps } = await import('../googleMaps');
		await expect(loadGoogleMaps(['places'])).rejects.toThrow('Configure VITE_GOOGLE_MAPS_API_KEY');
	});

	it('uses an already loaded Maps API without a local key', async () => {
		vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
		const maps = { maps: { importLibrary: vi.fn().mockResolvedValue(undefined) } } as unknown as typeof google;
		Object.defineProperty(window, 'google', { configurable: true, value: maps });
		const { loadGoogleMaps } = await import('../googleMaps');
		await expect(loadGoogleMaps(['places'])).resolves.toBe(maps);
		expect(maps.maps.importLibrary).toHaveBeenCalledWith('places');
	});
});
