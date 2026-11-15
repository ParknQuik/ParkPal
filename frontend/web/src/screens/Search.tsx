import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Container,
	Box,
	Typography,
	TextField,
	Button,
	Paper,
	Grid,
	InputAdornment,
	Card,
	CardContent,
	Chip,
} from '@mui/material';
import {
	Search as SearchIcon,
	LocationOn as LocationIcon,
	CalendarMonth as CalendarIcon,
	Map as MapIcon,
} from '@mui/icons-material';
import { loadGoogleMaps } from '../utils/googleMaps';

interface SearchParams {
	location: string;
	latitude: number | null;
	longitude: number | null;
	checkIn: string;
	checkOut: string;
}

const popularLocations = [
	'Manila',
	'Quezon City',
	'Makati',
	'Taguig',
	'Pasay',
	'Mandaluyong',
	'Pasig',
	'San Juan',
	'BGC (Bonifacio Global City)',
	'Ortigas',
	'Alabang',
	'San Jose del Monte, Bulacan',
];

const popularCoordinates: Record<string, [number, number]> = {
	Manila: [14.5995, 120.9842],
	'Quezon City': [14.676, 121.0437],
	Makati: [14.5547, 121.0244],
	Taguig: [14.5176, 121.0509],
	Pasay: [14.5378, 120.9896],
	Mandaluyong: [14.5794, 121.0359],
	Pasig: [14.5764, 121.0851],
	'San Juan': [14.6019, 121.0355],
	'BGC (Bonifacio Global City)': [14.5547, 121.045],
	Ortigas: [14.5874, 121.0614],
	Alabang: [14.4235, 121.0437],
	'San Jose del Monte, Bulacan': [14.8136, 121.0453],
};

const Search: React.FC = () => {
	const navigate = useNavigate();
	const locationWidgetRef = useRef<HTMLDivElement>(null);
	const autocompleteRef = useRef<{ value: string } | null>(null);
	const [searchParams, setSearchParams] = useState<SearchParams>({
		location: '',
		latitude: null,
		longitude: null,
		checkIn: '',
		checkOut: '',
	});
	const [mapsError, setMapsError] = useState('');
	// Cache bust: Force rebuild to include Browse Map button - 2026-03-14

	useEffect(() => {
		let active = true;
		let widget: (HTMLElement & { place?: unknown; value: string }) | undefined;
		const handleInput = (event: Event) => {
			const target = event.target as HTMLInputElement | null;
			const value = target?.value ?? widget?.shadowRoot?.querySelector('input')?.value;
			if (value !== undefined) setSearchParams((previous) => ({ ...previous, location: value, latitude: null, longitude: null }));
		};
		const handleSelect = async (event: Event) => {
			const selection = event as Event & { placePrediction?: { toPlace: () => { fetchFields: (options: { fields: string[] }) => Promise<void>; formattedAddress?: string; displayName?: { text?: string }; location?: { lat: number; lng: number } } } };
			const place = selection.placePrediction?.toPlace();
			if (!place) return;
			try {
				await place.fetchFields({ fields: ['formattedAddress', 'displayName', 'location'] });
				if (!active || !place.location) return;
				const location = place.formattedAddress || place.displayName?.text || '';
				if (widget) widget.value = location;
				setSearchParams((previous) => ({ ...previous, location, latitude: place.location!.lat, longitude: place.location!.lng }));
			} catch {
				if (active) setMapsError('Could not load the selected location. Choose a popular location below to continue.');
			}
		};
		loadGoogleMaps(['places'])
			.then((maps) => {
				if (!active || !locationWidgetRef.current) return;
				const places = maps.maps.places as typeof maps.maps.places & { PlaceAutocompleteElement: new (options: { includedRegionCodes: string[] }) => HTMLElement & { value: string } };
				widget = new places.PlaceAutocompleteElement({ includedRegionCodes: ['ph'] });
				autocompleteRef.current = widget;
				widget.addEventListener('input', handleInput);
				widget.addEventListener('gmp-select', handleSelect);
				locationWidgetRef.current.replaceChildren(widget);
			})
			.catch((error: Error) => { if (active) setMapsError(error.message); });
		return () => {
			active = false;
			widget?.removeEventListener('input', handleInput);
			widget?.removeEventListener('gmp-select', handleSelect);
			widget?.remove();
			autocompleteRef.current = null;
		};
	}, []);

	const handleSearch = () => {
		if (searchParams.latitude === null || searchParams.longitude === null) {
			alert('Please select a valid location from the suggestions');
			return;
		}
		if (!!searchParams.checkIn !== !!searchParams.checkOut || (searchParams.checkIn && (new Date(searchParams.checkIn) <= new Date() || new Date(searchParams.checkOut) <= new Date(searchParams.checkIn)))) {
			alert('Choose both dates and make sure check-out is after check-in.');
			return;
		}

		// Navigate to map with search parameters
		const params = new URLSearchParams({
			location: searchParams.location,
			lat: searchParams.latitude.toString(),
			lng: searchParams.longitude.toString(),
			...(searchParams.checkIn ? { checkIn: searchParams.checkIn, checkOut: searchParams.checkOut } : {}),
		});
		navigate(`/map?${params.toString()}`);
	};

	const handleQuickLocation = (location: string) => {
		const [latitude, longitude] = popularCoordinates[location];
		if (autocompleteRef.current) autocompleteRef.current.value = location;
		setSearchParams({ ...searchParams, location, latitude, longitude });
	};

	return (
		<Container maxWidth="lg">
			<Box sx={{ py: { xs: 4, md: 7 } }}>
				{/* Hero Section */}
				<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.35fr) minmax(260px, .65fr)' }, gap: { xs: 3, md: 6 }, alignItems: 'center', mb: { xs: 3, md: 4 } }}>
					<Box sx={{ maxWidth: 760 }}>
						<Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '.16em' }}>PARKING, RIGHT WHERE YOU NEED IT</Typography>
						<Typography variant="h1" component="h1" gutterBottom sx={{ maxWidth: 700 }}>
							Your next stop, minus the parking hunt.
						</Typography>
						<Typography variant="body1" color="text.secondary" sx={{ maxWidth: 580, fontSize: { xs: '1rem', md: '1.12rem' } }}>
							Find owner-listed parking near your destination, compare the details, then reserve for the time you need.
						</Typography>
					</Box>
					<Paper elevation={0} sx={{ position: 'relative', minHeight: { xs: 150, md: 210 }, overflow: 'hidden', p: 2.5, border: '1px solid', borderColor: 'divider', background: 'linear-gradient(135deg, #e8f1e9 0%, #f4f6f1 62%, #f5e6da 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
						<Box aria-hidden="true" sx={{ position: 'absolute', inset: '22% -8% auto 24%', height: 2, bgcolor: 'rgba(23,107,91,.18)', transform: 'rotate(-22deg)', boxShadow: '0 30px 0 rgba(23,107,91,.14), 0 60px 0 rgba(23,107,91,.12)' }} />
						<Box sx={{ position: 'relative', alignSelf: 'flex-end', width: 54, height: 54, borderRadius: '50% 50% 50% 8px', transform: 'rotate(-45deg)', bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center', boxShadow: '0 10px 24px rgba(23,107,91,.28)' }}><LocationIcon sx={{ transform: 'rotate(45deg)' }} /></Box>
						<Box sx={{ position: 'relative' }}>
							<Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800 }}>MADE FOR THE CITY</Typography>
							<Typography variant="h6">A real space, ready when you are.</Typography>
							<Typography variant="body2" color="text.secondary">Compare price, access, and amenities before you book.</Typography>
						</Box>
					</Paper>
				</Box>

				{/* Search Card */}
				<Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, mb: { xs: 5, md: 7 }, border: '1px solid', borderColor: 'divider', overflow: 'hidden', position: 'relative', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: 'primary.main' } }}>
					<Grid container spacing={3}>
						{/* Location */}
						<Grid item xs={12} md={6}>
							<Typography component="label" htmlFor="search-location" variant="body2" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>Where do you need parking?</Typography>
							<Box ref={locationWidgetRef} aria-label="Where do you need parking?" sx={{ minHeight: 56, '& gmp-place-autocomplete': { width: '100%', '--gmpx-color-surface': 'transparent', '--gmpx-color-on-surface': 'var(--mui-palette-text-primary)' } }} />
							{mapsError && <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{mapsError} Choose a popular location below to continue.</Typography>}
						</Grid>

						{/* Date Range */}
						<Grid item xs={12} md={3}>
							<TextField
								label="Check-in"
								type="datetime-local"
								value={searchParams.checkIn}
								onChange={(e) =>
									setSearchParams({ ...searchParams, checkIn: e.target.value })
								}
								fullWidth
								InputLabelProps={{ shrink: true }}
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<CalendarIcon color="primary" />
										</InputAdornment>
									),
								}}
							/>
						</Grid>

						<Grid item xs={12} md={3}>
							<TextField
								label="Check-out"
								type="datetime-local"
								value={searchParams.checkOut}
								onChange={(e) =>
									setSearchParams({ ...searchParams, checkOut: e.target.value })
								}
								fullWidth
								InputLabelProps={{ shrink: true }}
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<CalendarIcon color="primary" />
										</InputAdornment>
									),
								}}
							/>
						</Grid>

						{/* Search Button */}
						<Grid item xs={12}>
							<Grid container spacing={2}>
								<Grid item xs={12} sm={6}>
									<Button
										variant="contained"
										size="large"
										fullWidth
										startIcon={<SearchIcon />}
										onClick={handleSearch}
										disabled={!searchParams.latitude || !searchParams.longitude}
										sx={{ py: 1.5 }}
									>
										Search Parking
									</Button>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Button
										variant="outlined"
										size="large"
										fullWidth
										startIcon={<MapIcon />}
											onClick={() => navigate(`/map?${new URLSearchParams({
											location: searchParams.location,
											...(searchParams.latitude !== null ? { lat: String(searchParams.latitude), lng: String(searchParams.longitude) } : {}),
											...(searchParams.checkIn ? { checkIn: searchParams.checkIn } : {}),
											...(searchParams.checkOut ? { checkOut: searchParams.checkOut } : {}),
										}).toString()}`)}
										sx={{ py: 1.5 }}
									>
										Browse Map
									</Button>
								</Grid>
							</Grid>
							{searchParams.location && !searchParams.latitude && (
								<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
									Please select a location from the dropdown suggestions
								</Typography>
							)}
						</Grid>
					</Grid>
				</Paper>

				{/* Popular Locations */}
				<Box sx={{ mb: { xs: 5, md: 7 } }}>
					<Typography variant="h5" gutterBottom fontWeight="bold">
						Popular places to park
					</Typography>
					<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
						{popularLocations.slice(0, 8).map((location) => (
							<Chip
								key={location}
								label={location}
								onClick={() => handleQuickLocation(location)}
								clickable
								color={searchParams.location === location ? 'primary' : 'default'}
								icon={<LocationIcon />}
							/>
						))}
					</Box>
				</Box>

				{/* How it Works */}
				<Box>
					<Typography variant="h5" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
						How It Works
					</Typography>
					<Grid container spacing={3}>
						<Grid item xs={12} md={4}>
							<Card>
								<CardContent sx={{ textAlign: 'center', py: 4 }}>
									<SearchIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
									<Typography variant="h6" gutterBottom fontWeight="bold">
										1. Search
									</Typography>
									<Typography color="text.secondary">
										Enter your location and desired parking time
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} md={4}>
							<Card>
								<CardContent sx={{ textAlign: 'center', py: 4 }}>
									<LocationIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
									<Typography variant="h6" gutterBottom fontWeight="bold">
										2. Choose
									</Typography>
									<Typography color="text.secondary">
										Browse available parking spots on the map
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} md={4}>
							<Card>
								<CardContent sx={{ textAlign: 'center', py: 4 }}>
									<CalendarIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
									<Typography variant="h6" gutterBottom fontWeight="bold">
										3. Book
									</Typography>
									<Typography color="text.secondary">
										Reserve your spot and park with confidence
									</Typography>
								</CardContent>
							</Card>
						</Grid>
					</Grid>
				</Box>
			</Box>
		</Container>
	);
};

export default Search;
