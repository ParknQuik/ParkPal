import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Box,
	Paper,
	Typography,
	Button,
	AppBar,
	Toolbar,
	IconButton,
	Chip,
	Card,
	CardContent,
	TextField,
	InputAdornment,
	Drawer,
	List,
	ListItem,
	ListItemText,
	Divider,
	Alert,
	CircularProgress,
	Slider,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
} from '@mui/material';
import {
	AccountCircle,
	Add,
	LocationOn,
	Search,
	MyLocation,
	Close,
	Star,
	Refresh,
} from '@mui/icons-material';
import api from '../api.jsx';

const MapView = () => {
	const navigate = useNavigate();
	const mapRef = useRef(null);
	const googleMapRef = useRef(null);
	const markersRef = useRef([]);

	const [slots, setSlots] = useState([]);
	const [filteredSlots, setFilteredSlots] = useState([]);
	const [selectedSlot, setSelectedSlot] = useState(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [userLocation, setUserLocation] = useState(null);
	const [searchCenter, setSearchCenter] = useState(null); // Where to search (can be different from user location)
	const [radius, setRadius] = useState(5); // Search radius in km (default 5km)
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [mapLoaded, setMapLoaded] = useState(false);

	// Default center (Manila)
	const defaultCenter = { lat: 14.5995, lng: 120.9842 };

	useEffect(() => {
		// Start loading slots immediately with default location
		fetchSlots();
		loadGoogleMapsScript();
		getUserLocation();
	}, []);

	// Fetch slots when user location is available or search center changes
	useEffect(() => {
		if (userLocation || searchCenter) {
			fetchSlots();
		}
	}, [userLocation, searchCenter, radius]);

	useEffect(() => {
		if (mapLoaded && slots.length > 0) {
			// Debounce map initialization slightly for better performance
			const timer = setTimeout(() => initializeMap(), 100);
			return () => clearTimeout(timer);
		}
	}, [mapLoaded, slots]);

	useEffect(() => {
		// Debounce search filtering
		const timer = setTimeout(() => filterSlots(), 300);
		return () => clearTimeout(timer);
	}, [searchQuery, slots]);

	const loadGoogleMapsScript = () => {
		// Check if Google Maps is already loaded
		if (window.google && window.google.maps) {
			setMapLoaded(true);
			return;
		}

		// Check for API key in environment
		const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

		if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
			console.warn('Google Maps API key not configured. Using list view only.');
			setError('Map view unavailable. Configure VITE_GOOGLE_MAPS_API_KEY to enable maps.');
			setMapLoaded(false);
			return;
		}

		const script = document.createElement('script');
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=beta`;
		script.async = true;
		script.defer = true;
		script.onload = () => setMapLoaded(true);
		script.onerror = () => {
			setError('Failed to load Google Maps. Check your API key configuration.');
			setMapLoaded(false);
		};
		document.head.appendChild(script);
	};

	const getUserLocation = () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					setUserLocation({
						lat: position.coords.latitude,
						lng: position.coords.longitude,
					});
				},
				(err) => {
					console.warn('Geolocation error:', err);
					setUserLocation(defaultCenter);
				},
				{
					timeout: 5000, // 5 second timeout
					maximumAge: 300000, // Accept cached location up to 5 minutes old
					enableHighAccuracy: false // Faster, less battery drain
				}
			);
		} else {
			setUserLocation(defaultCenter);
		}
	};

	const fetchSlots = async () => {
		try {
			setLoading(true);
			// Use searchCenter if set (user moved map), otherwise use userLocation
			const center = searchCenter || userLocation || defaultCenter;

			const { data } = await api.get('/api/marketplace/search', {
				params: {
					lat: center.lat,
					lon: center.lng || center.lon,
					radius: radius, // User-adjustable radius
					status: 'available',
				},
			});
			setSlots(data.listings || data || []);
			setFilteredSlots(data.listings || data || []);
		} catch (error) {
			console.error('Error fetching slots:', error);
			setError('Failed to load parking slots');
		} finally {
			setLoading(false);
		}
	};

	const filterSlots = () => {
		if (!searchQuery.trim()) {
			setFilteredSlots(slots);
			return;
		}

		const query = searchQuery.toLowerCase();
		const filtered = slots.filter(
			(slot) =>
				slot.address?.toLowerCase().includes(query) ||
				slot.description?.toLowerCase().includes(query) ||
				slot.slotType?.toLowerCase().includes(query)
		);
		setFilteredSlots(filtered);
	};

	const initializeMap = async () => {
		if (!mapRef.current || !window.google) return;

		const center = userLocation || defaultCenter;

		// Initialize map with mapId for Advanced Markers
		const map = new window.google.maps.Map(mapRef.current, {
			center,
			zoom: 13,
			mapId: 'PARKPAL_MAP', // Required for Advanced Markers
			mapTypeControl: false,
			streetViewControl: false,
			fullscreenControl: false,
		});

		googleMapRef.current = map;

		// Clear existing markers
		markersRef.current.forEach((marker) => {
			if (marker.map) marker.map = null;
		});
		markersRef.current = [];

		// Create pin element for user location
		if (userLocation && window.google.maps.marker) {
			try {
				const userPin = document.createElement('div');
				userPin.style.width = '16px';
				userPin.style.height = '16px';
				userPin.style.borderRadius = '50%';
				userPin.style.backgroundColor = '#4285F4';
				userPin.style.border = '3px solid white';
				userPin.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

				const userMarker = new window.google.maps.marker.AdvancedMarkerElement({
					map,
					position: userLocation,
					content: userPin,
					title: 'Your Location',
				});

				markersRef.current.push(userMarker);
			} catch (err) {
				console.error('Error creating user marker:', err);
			}
		}

		// Add parking slot markers using Advanced Markers
		filteredSlots.forEach((slot) => {
			const position = { lat: slot.lat, lng: slot.lon };

			try {
				// Create custom pin element
				const pin = document.createElement('div');
				pin.style.width = '20px';
				pin.style.height = '20px';
				pin.style.borderRadius = '50%';
				pin.style.backgroundColor = slot.status === 'available' ? '#4CAF50' : '#F44336';
				pin.style.border = '3px solid white';
				pin.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
				pin.style.cursor = 'pointer';

				// Add price label
				const priceLabel = document.createElement('div');
				priceLabel.textContent = `₱${slot.price}`;
				priceLabel.style.position = 'absolute';
				priceLabel.style.top = '-25px';
				priceLabel.style.left = '50%';
				priceLabel.style.transform = 'translateX(-50%)';
				priceLabel.style.backgroundColor = 'white';
				priceLabel.style.padding = '2px 6px';
				priceLabel.style.borderRadius = '4px';
				priceLabel.style.fontSize = '11px';
				priceLabel.style.fontWeight = 'bold';
				priceLabel.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
				priceLabel.style.whiteSpace = 'nowrap';

				const markerContent = document.createElement('div');
				markerContent.style.position = 'relative';
				markerContent.appendChild(priceLabel);
				markerContent.appendChild(pin);

				const marker = new window.google.maps.marker.AdvancedMarkerElement({
					map,
					position,
					content: markerContent,
					title: slot.address,
				});

				// Add click listener
				marker.addListener('click', () => {
					setSelectedSlot(slot);
					map.panTo(position);
				});

				markersRef.current.push(marker);
			} catch (err) {
				console.error('Error creating slot marker:', err);
			}
		});

		// Fit bounds to show all markers
		if (filteredSlots.length > 0) {
			const bounds = new window.google.maps.LatLngBounds();
			filteredSlots.forEach((slot) => {
				bounds.extend({ lat: slot.lat, lng: slot.lon });
			});
			if (userLocation) bounds.extend(userLocation);
			map.fitBounds(bounds);
		}
	};

	const handleRecenterMap = () => {
		if (googleMapRef.current && userLocation) {
			googleMapRef.current.panTo(userLocation);
			googleMapRef.current.setZoom(15);
			setSearchCenter(null); // Reset to user location
		}
	};

	const handleSearchThisArea = () => {
		if (googleMapRef.current) {
			const center = googleMapRef.current.getCenter();
			setSearchCenter({
				lat: center.lat(),
				lng: center.lng(),
			});
		}
	};

	const getStatusColor = (status) => {
		const colors = {
			available: 'success',
			occupied: 'error',
			reserved: 'warning',
		};
		return colors[status] || 'default';
	};

	return (
		<Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			{/* App Bar */}
			<AppBar position="static">
				<Toolbar>
					<Typography variant="h6" sx={{ flexGrow: 1 }}>
						ParkPal - Find Parking
					</Typography>
					<Button color="inherit" onClick={() => navigate('/list-slot')}>
						List Your Spot
					</Button>
					<IconButton color="inherit" onClick={() => navigate('/profile')}>
						<AccountCircle />
					</IconButton>
				</Toolbar>
			</AppBar>

			{/* Error Alert */}
			{error && (
				<Alert severity="warning" onClose={() => setError('')}>
					{error}
				</Alert>
			)}

			{/* Main Content */}
			<Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
				{/* Sidebar */}
				<Paper
					sx={{
						width: 350,
						display: 'flex',
						flexDirection: 'column',
						borderRadius: 0,
						overflow: 'hidden',
					}}
				>
					{/* Search Bar */}
					<Box sx={{ p: 2, pb: 1 }}>
						<TextField
							fullWidth
							placeholder="Search by location, type..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<Search />
									</InputAdornment>
								),
							}}
						/>
					</Box>

					{/* Radius Control */}
					<Box sx={{ px: 2, pb: 2 }}>
						<Typography variant="caption" color="text.secondary" gutterBottom>
							Search Radius: {radius} km
						</Typography>
						<Slider
							value={radius}
							onChange={(e, newValue) => setRadius(newValue)}
							min={1}
							max={20}
							step={1}
							marks={[
								{ value: 1, label: '1km' },
								{ value: 5, label: '5km' },
								{ value: 10, label: '10km' },
								{ value: 20, label: '20km' },
							]}
							valueLabelDisplay="auto"
							size="small"
						/>
						<Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
							Showing {filteredSlots.length} parking spot{filteredSlots.length !== 1 ? 's' : ''}
						</Typography>
					</Box>

					<Divider />

					{/* Slots List */}
					<Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
						{loading ? (
							<Box display="flex" justifyContent="center" py={4}>
								<CircularProgress />
							</Box>
						) : filteredSlots.length === 0 ? (
							<Box textAlign="center" py={4}>
								<Typography variant="body2" color="text.secondary">
									No parking slots found
								</Typography>
								<Button
									variant="outlined"
									startIcon={<Add />}
									onClick={() => navigate('/list-slot')}
									sx={{ mt: 2 }}
								>
									List Your Spot
								</Button>
							</Box>
						) : (
							<List disablePadding>
								{filteredSlots.map((slot, index) => (
									<React.Fragment key={slot.id}>
										<ListItem
											button
											onClick={() => {
												setSelectedSlot(slot);
												if (googleMapRef.current) {
													googleMapRef.current.panTo({
														lat: slot.lat,
														lng: slot.lon,
													});
													googleMapRef.current.setZoom(16);
												}
											}}
											selected={selectedSlot?.id === slot.id}
											sx={{
												mb: 1,
												borderRadius: 1,
												border: '1px solid',
												borderColor:
													selectedSlot?.id === slot.id
														? 'primary.main'
														: 'divider',
											}}
										>
											<ListItemText
												primary={
													<Box
														display="flex"
														justifyContent="space-between"
														alignItems="center"
														mb={0.5}
													>
														<Typography variant="subtitle2" fontWeight="bold">
															₱{slot.price}/hr
														</Typography>
														<Chip
															label={slot.status}
															color={getStatusColor(slot.status)}
															size="small"
														/>
													</Box>
												}
												secondary={
													<>
														<Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
															<LocationOn sx={{ fontSize: 14 }} />
															<Typography variant="caption" noWrap>
																{slot.address}
															</Typography>
														</Box>
														{slot.rating > 0 && (
															<Box display="flex" alignItems="center" gap={0.5}>
																<Star sx={{ fontSize: 14, color: 'warning.main' }} />
																<Typography variant="caption">
																	{slot.rating.toFixed(1)}
																</Typography>
															</Box>
														)}
														{slot.distance && (
															<Typography variant="caption" color="text.secondary">
																{slot.distance.toFixed(1)} km away
															</Typography>
														)}
													</>
												}
											/>
										</ListItem>
										{index < filteredSlots.length - 1 && <Divider />}
									</React.Fragment>
								))}
							</List>
						)}
					</Box>
				</Paper>

				{/* Map Container */}
				<Box sx={{ flex: 1, position: 'relative' }}>
					{mapLoaded ? (
						<>
							<div
								ref={mapRef}
								style={{ width: '100%', height: '100%' }}
							/>
							{/* Search This Area Button */}
							<Button
								variant="contained"
								startIcon={<Refresh />}
								sx={{
									position: 'absolute',
									top: 16,
									left: '50%',
									transform: 'translateX(-50%)',
									boxShadow: 3,
									zIndex: 1,
								}}
								onClick={handleSearchThisArea}
							>
								Search This Area
							</Button>

							{/* Recenter Button */}
							<IconButton
								sx={{
									position: 'absolute',
									bottom: 100,
									right: 16,
									bgcolor: 'white',
									boxShadow: 2,
									'&:hover': { bgcolor: 'white' },
								}}
								onClick={handleRecenterMap}
								title="Return to your location"
							>
								<MyLocation />
							</IconButton>
						</>
					) : (
						<Box
							display="flex"
							flexDirection="column"
							alignItems="center"
							justifyContent="center"
							height="100%"
							bgcolor="grey.100"
							p={4}
							textAlign="center"
						>
							<Typography variant="h6" color="text.secondary" gutterBottom>
								Map View Unavailable
							</Typography>
							<Typography variant="body2" color="text.secondary" mb={3}>
								To enable the interactive map, add your Google Maps API key to .env.local:
							</Typography>
							<Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white', fontFamily: 'monospace', mb: 2 }}>
								VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
							</Paper>
							<Typography variant="caption" color="text.secondary">
								Get your API key at: developers.google.com/maps
							</Typography>
							<Typography variant="body2" color="text.primary" mt={3}>
								Use the sidebar to browse available parking spots
							</Typography>
						</Box>
					)}

					{/* Selected Slot Details Card */}
					{selectedSlot && (
						<Card
							sx={{
								position: 'absolute',
								bottom: 16,
								left: '50%',
								transform: 'translateX(-50%)',
								minWidth: 400,
								maxWidth: 500,
								boxShadow: 3,
							}}
						>
							<CardContent>
								<Box display="flex" justifyContent="space-between" mb={2}>
									<Box>
										<Typography variant="h6">₱{selectedSlot.price}/hr</Typography>
										<Typography variant="caption" color="text.secondary">
											{selectedSlot.slotType?.replace('_', ' ').toUpperCase()}
										</Typography>
									</Box>
									<Box display="flex" gap={1} alignItems="flex-start">
										<Chip
											label={selectedSlot.status}
											color={getStatusColor(selectedSlot.status)}
											size="small"
										/>
										<IconButton
											size="small"
											onClick={() => setSelectedSlot(null)}
										>
											<Close />
										</IconButton>
									</Box>
								</Box>

								<Box display="flex" alignItems="center" gap={1} mb={1}>
									<LocationOn color="action" />
									<Typography variant="body2">{selectedSlot.address}</Typography>
								</Box>

								{selectedSlot.description && (
									<Typography variant="body2" color="text.secondary" mb={2}>
										{selectedSlot.description}
									</Typography>
								)}

								{selectedSlot.amenities &&
									selectedSlot.amenities.length > 0 && (
										<Box display="flex" gap={0.5} flexWrap="wrap" mb={2}>
											{selectedSlot.amenities.map((amenity, idx) => (
												<Chip
													key={idx}
													label={amenity}
													size="small"
													variant="outlined"
												/>
											))}
										</Box>
									)}

								{selectedSlot.rating > 0 && (
									<Box display="flex" alignItems="center" gap={0.5} mb={2}>
										<Star sx={{ color: 'warning.main' }} />
										<Typography variant="body2">
											{selectedSlot.rating.toFixed(1)} rating
										</Typography>
									</Box>
								)}

								<Button
									fullWidth
									variant="contained"
									onClick={() =>
										navigate('/reserve', { state: { slot: selectedSlot } })
									}
									disabled={selectedSlot.status !== 'available'}
								>
									{selectedSlot.status === 'available'
										? 'Reserve Now'
										: 'Not Available'}
								</Button>
							</CardContent>
						</Card>
					)}
				</Box>
			</Box>
		</Box>
	);
};

export default MapView;
