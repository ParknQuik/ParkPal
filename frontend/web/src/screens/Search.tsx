import React, { useState, useEffect, useRef } from 'react';
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
	CircularProgress,
} from '@mui/material';
import {
	Search as SearchIcon,
	LocationOn as LocationIcon,
	CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import api from '../api';

interface SearchParams {
	location: string;
	latitude: number | null;
	longitude: number | null;
	checkIn: string;
	checkOut: string;
}

const libraries: ("places")[] = ["places"];

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

const Search: React.FC = () => {
	const navigate = useNavigate();
	const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
	const [searchParams, setSearchParams] = useState<SearchParams>({
		location: '',
		latitude: null,
		longitude: null,
		checkIn: '',
		checkOut: '',
	});
	const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: googleMapsApiKey,
		libraries,
	});

	// Fetch Google Maps API key
	useEffect(() => {
		const fetchApiKey = async () => {
			try {
				const { data } = await api.get('/config/google-maps-api-key');
				setGoogleMapsApiKey(data.apiKey);
			} catch (error) {
				console.error('Failed to fetch Google Maps API key:', error);
			}
		};
		fetchApiKey();
	}, []);

	const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
		setAutocomplete(autocompleteInstance);
	};

	const onPlaceChanged = () => {
		if (autocomplete !== null) {
			const place = autocomplete.getPlace();
			if (place.geometry && place.geometry.location) {
				setSearchParams({
					...searchParams,
					location: place.formatted_address || place.name || '',
					latitude: place.geometry.location.lat(),
					longitude: place.geometry.location.lng(),
				});
			}
		}
	};

	const handleSearch = () => {
		if (!searchParams.latitude || !searchParams.longitude) {
			alert('Please select a valid location from the suggestions');
			return;
		}

		// Navigate to map with search parameters
		const params = new URLSearchParams({
			location: searchParams.location,
			lat: searchParams.latitude.toString(),
			lng: searchParams.longitude.toString(),
			checkIn: searchParams.checkIn,
			checkOut: searchParams.checkOut,
		});
		navigate(`/map?${params.toString()}`);
	};

	const handleQuickLocation = (location: string) => {
		setSearchParams({ ...searchParams, location, latitude: null, longitude: null });
	};

	if (loadError) {
		return <Container><Typography color="error">Error loading Google Maps</Typography></Container>;
	}

	if (!isLoaded || !googleMapsApiKey) {
		return (
			<Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
				<CircularProgress />
			</Container>
		);
	}

	return (
		<Container maxWidth="lg">
			<Box sx={{ py: 6 }}>
				{/* Hero Section */}
				<Box sx={{ textAlign: 'center', mb: 6 }}>
					<Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
						Find Parking Near You
					</Typography>
					<Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
						Book parking spaces in advance. Save time, save money.
					</Typography>
				</Box>

				{/* Search Card */}
				<Paper elevation={3} sx={{ p: 4, mb: 6 }}>
					<Grid container spacing={3}>
						{/* Location */}
						<Grid item xs={12} md={6}>
							<Autocomplete
								onLoad={onLoad}
								onPlaceChanged={onPlaceChanged}
								options={{
									componentRestrictions: { country: 'ph' },
								}}
							>
								<TextField
									label="Where do you need parking?"
									placeholder="Enter address or location"
									fullWidth
									value={searchParams.location}
									onChange={(e) =>
										setSearchParams({ ...searchParams, location: e.target.value })
									}
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<LocationIcon color="primary" />
											</InputAdornment>
										),
									}}
								/>
							</Autocomplete>
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
							{searchParams.location && !searchParams.latitude && (
								<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
									Please select a location from the dropdown suggestions
								</Typography>
							)}
						</Grid>
					</Grid>
				</Paper>

				{/* Popular Locations */}
				<Box sx={{ mb: 6 }}>
					<Typography variant="h5" gutterBottom fontWeight="bold">
						Popular Locations
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
