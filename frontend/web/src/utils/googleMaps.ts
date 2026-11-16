type GoogleMapsLibraries = 'places' | 'marker';

let mapsPromise: Promise<typeof google> | undefined;

/** Load the Maps JavaScript API once for all screens, then await requested libraries. */
export async function loadGoogleMaps(libraries: GoogleMapsLibraries[] = []): Promise<typeof google> {
	const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
	if (!window.google?.maps && (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY')) {
		throw new Error('Configure VITE_GOOGLE_MAPS_API_KEY to enable Google Maps.');
	}

	if (!mapsPromise) {
		mapsPromise = new Promise<typeof google>((resolve, reject) => {
			if (window.google?.maps) {
				resolve(window.google);
				return;
			}

			const callbackName = '__parkpalGoogleMapsLoaded';
			const target = window as typeof window & { [key: string]: unknown };
			const existingScript = document.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com/maps/api/js"]');
			if (existingScript) {
				// A script installed outside this loader cannot guarantee requested libraries.
				reject(new Error('Google Maps is already loading without the shared ParkPal loader.'));
				return;
			}

			target[callbackName] = () => {
				delete target[callbackName];
				if (window.google?.maps) resolve(window.google);
				else reject(new Error('Google Maps loaded without exposing the Maps API.'));
			};
			const script = document.createElement('script');
			script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,marker&v=weekly&loading=async&callback=${callbackName}`;
			script.async = true;
			script.onerror = () => {
				delete target[callbackName];
				mapsPromise = undefined;
				reject(new Error('Failed to load Google Maps. Check the API key and project configuration.'));
			};
			document.head.appendChild(script);
		});
	}

	const maps = await mapsPromise;
	if (maps.maps.importLibrary) {
		await Promise.all(libraries.map((library) => maps.maps.importLibrary(library)));
	} else if (libraries.some((library) => library === 'marker' && !maps.maps.marker?.AdvancedMarkerElement)) {
		throw new Error('Google Maps marker library is unavailable.');
	}
	return maps;
}
