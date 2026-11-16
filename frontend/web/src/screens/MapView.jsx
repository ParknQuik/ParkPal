// Cache bust: Force rebuild with env vars
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
	Box,
	Paper,
	Typography,
	Button,
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
	Add,
	LocationOn,
	Search,
	MyLocation,
	Close,
	Star,
	Refresh,
} from '@mui/icons-material';
import api from '../api';
import { loadGoogleMaps } from '../utils/googleMaps';

const MapView = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const query = new URLSearchParams(location.search);
	const requestedCenter = query.has('lat') && query.has('lng')
		? { lat: Number(query.get('lat')), lng: Number(query.get('lng')) }
		: null;
	const checkIn = query.get('checkIn') || '';
	const checkOut = query.get('checkOut') || '';
	const mapRef = useRef(null);
	const googleMapRef = useRef(null);
	const markersRef = useRef([]);

	const [slots, setSlots] = useState([]);
	const [filteredSlots, setFilteredSlots] = useState([]);
	const [selectedSlot, setSelectedSlot] = useState(null);
	const [candidatePins, setCandidatePins] = useState([]);
	const [selectedCandidate, setSelectedCandidate] = useState(null);
	const [searchQuery, setSearchQuery] = useState(query.get('location') || '');
	const [userLocation, setUserLocation] = useState(null);
	const [searchCenter, setSearchCenter] = useState(null); // Where to search (can be different from user location)
	const [viewportBounds, setViewportBounds] = useState(null);
	const [radius, setRadius] = useState(5); // Search radius in km (default 5km)
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [mapLoaded, setMapLoaded] = useState(false);
	const [autoRefresh, setAutoRefresh] = useState(true); // Auto-refresh toggle
	const [lastRefresh, setLastRefresh] = useState(Date.now());
	const [minPrice, setMinPrice] = useState('');
	const [maxPrice, setMaxPrice] = useState('');
	const [slotType, setSlotType] = useState('');
	const [amenity, setAmenity] = useState('');
	const [sortBy, setSortBy] = useState('nearest');

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
	}, [userLocation, searchCenter, viewportBounds, radius, checkIn, checkOut]);

	useEffect(() => {
		if (mapLoaded) {
			// Debounce map initialization slightly for better performance
			const timer = setTimeout(() => initializeMap(), 100);
			return () => clearTimeout(timer);
		}
	}, [mapLoaded]);

	useEffect(() => {
		if (mapLoaded) updateMarkers();
	}, [mapLoaded, filteredSlots, candidatePins, userLocation]);

	useEffect(() => {
		// Debounce search filtering
		const timer = setTimeout(() => filterSlots(), 300);
		return () => clearTimeout(timer);
	}, [searchQuery, slots, minPrice, maxPrice, slotType, amenity, sortBy, userLocation, searchCenter]);

	useEffect(() => {
		const timer = setTimeout(() => fetchSlots(), 250);
		return () => clearTimeout(timer);
	}, [minPrice, maxPrice, slotType, amenity]);

	// Auto-refresh parking slots every 30 seconds
	useEffect(() => {
		if (!autoRefresh) return;

		const interval = setInterval(() => {
			console.log('[MapView] Auto-refreshing parking slots...');
			fetchSlots();
			setLastRefresh(Date.now());
		}, 30000); // 30 seconds

		return () => clearInterval(interval);
	}, [autoRefresh, userLocation, searchCenter, viewportBounds, radius]);

	const loadGoogleMapsScript = () => {
		loadGoogleMaps(['marker'])
			.then(() => setMapLoaded(true))
			.catch((loadError) => {
				console.warn('[MapView] Google Maps unavailable:', loadError);
				setError(loadError.message || 'Map view unavailable. Check your Google Maps configuration.');
				setMapLoaded(false);
			});
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
			const center = searchCenter || requestedCenter || userLocation || defaultCenter;

			const response = await api.get('/marketplace/search', {
				params: {
					lat: center.lat,
					lon: center.lng || center.lon,
					radius: radius, // User-adjustable radius
					...(viewportBounds || {}),
					status: 'available',
					...(minPrice !== '' ? { minPrice } : {}),
					...(maxPrice !== '' ? { maxPrice } : {}),
					...(slotType ? { slotType } : {}),
					...(amenity ? { amenities: amenity } : {}),
					...(checkIn && checkOut ? {
						availableFrom: new Date(checkIn).toISOString(),
						availableTo: new Date(checkOut).toISOString(),
					} : {}),
				},
			});
			const candidateResponse = await api.get('/marketplace/discovery/candidates', {
				params: { lat: center.lat, lon: center.lng || center.lon, radius },
			}).catch(() => null);
			setCandidatePins(candidateResponse?.data?.data || []);
			// Handle v1 API response format: { data: [...], pagination: {...} }
			const slotsData = response.data?.data || response.data?.listings || response.data || [];
			setSlots(slotsData);
			setFilteredSlots(slotsData);
		} catch (error) {
			console.error('Error fetching slots:', error);
			setError('Failed to load parking slots');
		} finally {
			setLoading(false);
		}
	};

	const filterSlots = () => {
		const query = searchQuery.toLowerCase();
		let filtered = slots.filter(
			(slot) =>
				!query || slot.address?.toLowerCase().includes(query) ||
				slot.description?.toLowerCase().includes(query) ||
				slot.slotType?.toLowerCase().includes(query)
		);
		if (minPrice !== '') filtered = filtered.filter((slot) => Number(slot.price) >= Number(minPrice));
		if (maxPrice !== '') filtered = filtered.filter((slot) => Number(slot.price) <= Number(maxPrice));
		if (slotType) filtered = filtered.filter((slot) => slot.slotType === slotType);
		if (amenity) filtered = filtered.filter((slot) => (Array.isArray(slot.amenities) ? slot.amenities : []).includes(amenity));
		const center = searchCenter || requestedCenter || userLocation || defaultCenter;
		const distance = (slot) => Number(slot.distance ?? Math.hypot(slot.lat - center.lat, slot.lon - center.lng));
		filtered.sort((a, b) => sortBy === 'cheapest' ? Number(a.price) - Number(b.price) : sortBy === 'top_rated' ? Number(b.rating || 0) - Number(a.rating || 0) : distance(a) - distance(b));
		setFilteredSlots(filtered);
	};

	const initializeMap = async () => {
		if (!mapRef.current || !window.google?.maps?.marker?.AdvancedMarkerElement) return;

		const center = searchCenter || requestedCenter || userLocation || defaultCenter;
		if (!googleMapRef.current) {
			googleMapRef.current = new window.google.maps.Map(mapRef.current, {
				center,
				zoom: 13,
				mapId: 'PARKPAL_MAP',
				mapTypeControl: false,
				streetViewControl: false,
				fullscreenControl: false,
			});
		}
		updateMarkers();
	};

	const updateMarkers = () => {
		const map = googleMapRef.current;
		if (!map || !window.google?.maps?.marker?.AdvancedMarkerElement) return;

		// Clear existing markers
		markersRef.current.forEach((marker) => {
			if (marker.map) marker.map = null;
		});
		markersRef.current = [];

		// Create pin element for user location
		if (userLocation) {
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
					gmpClickable: true,
				});

				// Advanced Markers use the DOM gmp-click event.
				marker.addEventListener('gmp-click', () => {
					setSelectedSlot(slot);
					map.panTo(position);
				});

				markersRef.current.push(marker);
			} catch (err) {
				console.error('Error creating slot marker:', err);
			}
		});

		candidatePins.forEach((candidate) => {
			const hasCurrentGuidance = candidate.canShowAnalytics && candidate.crowdGuidance?.sampleCount >= 3;
			const pin = document.createElement('div');
			pin.textContent = hasCurrentGuidance
				? `${Math.max(1, Math.round(candidate.crowdGuidance.circlingTimeSeconds / 60))}m`
				: candidate.isPreview ? '?' : 'P';
			pin.style.minWidth = '30px';
			pin.style.height = '30px';
			pin.style.padding = '0 7px';
			pin.style.display = 'grid';
			pin.style.placeItems = 'center';
			pin.style.borderRadius = '16px 16px 16px 4px';
			pin.style.transform = 'rotate(-45deg)';
			pin.style.background = hasCurrentGuidance ? '#176b5b' : candidate.isPreview ? '#a65b12' : '#2c6154';
			pin.style.color = '#fff';
			pin.style.border = '2px solid #fff';
			pin.style.boxShadow = '0 2px 6px rgba(0,0,0,.28)';
			pin.style.fontSize = '11px';
			pin.style.fontWeight = '700';
			pin.style.cursor = 'pointer';
			const marker = new window.google.maps.marker.AdvancedMarkerElement({
				map,
				position: { lat: candidate.latitude, lng: candidate.longitude },
				content: pin,
				title: `${candidate.title}. ${hasCurrentGuidance ? `${Math.round(candidate.crowdGuidance.circlingTimeSeconds / 60)} minute estimated circling time, guidance only, not bookable.` : 'Commercial parking guidance, not bookable.'}`,
				gmpClickable: true,
			});
			marker.addEventListener('gmp-click', () => {
				setSelectedSlot(null);
				setSelectedCandidate(candidate);
				map.panTo({ lat: candidate.latitude, lng: candidate.longitude });
			});
			markersRef.current.push(marker);
		});

	};

	const handleRecenterMap = () => {
		if (googleMapRef.current && userLocation) {
			googleMapRef.current.panTo(userLocation);
			googleMapRef.current.setZoom(15);
			setSearchCenter(null); // Reset to user location
			setViewportBounds(null);
		}
	};

	const handleSearchThisArea = () => {
		if (googleMapRef.current) {
			const bounds = googleMapRef.current.getBounds();
			if (!bounds) return;
			const southWest = bounds.getSouthWest();
			const northEast = bounds.getNorthEast();
			setViewportBounds({
				south: southWest.lat(),
				west: southWest.lng(),
				north: northEast.lat(),
				east: northEast.lng(),
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
		<Box sx={{ height: 'calc(100vh - 72px)', minHeight: 500, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
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
						width: { xs: '100%', md: 350 },
						flex: { xs: '0 0 58%', md: '0 0 350px' },
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
						<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
							<Typography variant="caption" color="text.secondary">
								Search Radius: {radius} km
							</Typography>
							<Button
								size="small"
								startIcon={<Refresh />}
								onClick={() => {
									fetchSlots();
									setLastRefresh(Date.now());
								}}
								disabled={loading}
							>
								Refresh
							</Button>
						</Box>
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
							{autoRefresh && ' • Auto-refresh: 30s'}
						</Typography>
					</Box>

					<Divider />
					<Box sx={{ px: 2, py: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
						<TextField size="small" label="Min ₱/hr" type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} inputProps={{ min: 0 }} />
						<TextField size="small" label="Max ₱/hr" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} inputProps={{ min: 0 }} />
						<FormControl size="small" sx={{ gridColumn: '1 / -1' }}>
							<InputLabel id="slot-type-label">Space type</InputLabel>
							<Select labelId="slot-type-label" label="Space type" value={slotType} onChange={(e) => setSlotType(e.target.value)}>
								<MenuItem value="">Any type</MenuItem><MenuItem value="roadside_qr">Roadside (QR)</MenuItem><MenuItem value="commercial_manual">Commercial (Manual)</MenuItem><MenuItem value="commercial_iot">Commercial (IoT)</MenuItem>
							</Select>
						</FormControl>
						<FormControl size="small" sx={{ gridColumn: '1 / -1' }}>
							<InputLabel id="amenity-label">Amenity</InputLabel>
							<Select labelId="amenity-label" label="Amenity" value={amenity} onChange={(e) => setAmenity(e.target.value)}>
								<MenuItem value="">Any amenity</MenuItem><MenuItem value="ev_charging">EV charging</MenuItem><MenuItem value="covered">Covered</MenuItem><MenuItem value="security">Security</MenuItem><MenuItem value="cctv">CCTV</MenuItem><MenuItem value="restroom">Restroom</MenuItem><MenuItem value="elevator">Elevator</MenuItem><MenuItem value="lighting">Lighting</MenuItem><MenuItem value="wide_slot">Wide space</MenuItem><MenuItem value="valet">Valet</MenuItem>
							</Select>
						</FormControl>
						<FormControl size="small" sx={{ gridColumn: '1 / -1' }}>
							<InputLabel id="sort-label">Sort by</InputLabel>
							<Select labelId="sort-label" label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
								<MenuItem value="nearest">Nearest</MenuItem><MenuItem value="cheapest">Cheapest</MenuItem><MenuItem value="top_rated">Top rated</MenuItem>
							</Select>
						</FormControl>
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
											setSelectedCandidate(null);
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
											primaryTypographyProps={{ component: 'div' }}
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
											secondaryTypographyProps={{ component: 'div' }}
										/>
										</ListItem>
										{index < filteredSlots.length - 1 && <Divider />}
									</React.Fragment>
								))}
							</List>
						)}
						{candidatePins.length > 0 && <Box sx={{ mt: 2 }}>
							<Divider sx={{ mb: 1.5 }} />
							<Typography variant="overline" color="primary.main" fontWeight={800}>COMMERCIAL GUIDANCE · NOT BOOKABLE</Typography>
							<List disablePadding>
								{candidatePins.map((candidate) => {
									const guidance = candidate.canShowAnalytics && candidate.crowdGuidance?.sampleCount >= 3 ? candidate.crowdGuidance : null;
									return <ListItem key={`candidate-${candidate.id}`} button selected={selectedCandidate?.id === candidate.id} onClick={() => {
										setSelectedSlot(null);
										setSelectedCandidate(candidate);
										if (googleMapRef.current) {
											googleMapRef.current.panTo({ lat: candidate.latitude, lng: candidate.longitude });
											googleMapRef.current.setZoom(16);
										}
									}} sx={{ mb: 1, border: '1px solid', borderColor: selectedCandidate?.id === candidate.id ? 'primary.main' : 'divider', borderRadius: 1 }}>
										<ListItemText primary={candidate.title} secondary={guidance
											? `~${Math.max(1, Math.round(guidance.circlingTimeSeconds / 60))} min circling estimate · ${guidance.sampleCount} sessions`
											: candidate.isPreview ? 'Candidate preview · no estimate' : 'No current crowd estimate'} />
										<Chip size="small" label={candidate.isPreview ? 'Preview' : 'Guide'} color={candidate.isPreview ? 'warning' : 'success'} variant="outlined" />
									</ListItem>;
								})}
							</List>
						</Box>}
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
									'&:hover, &:active': {
										transform: 'translateX(-50%)',
									},
									'@media (hover: hover) and (prefers-reduced-motion: no-preference)': {
										transition: 'box-shadow 200ms ease-out, background-color 200ms ease-out',
									},
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
									bgcolor: 'background.paper',
									boxShadow: 2,
									'&:hover': { bgcolor: 'background.paper' },
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
							bgcolor="background.default"
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
						{selectedCandidate && <Card sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: { xs: 'calc(100% - 24px)', sm: 420 }, maxWidth: 500, boxShadow: 3 }}>
							<CardContent>
								<Box display="flex" justifyContent="space-between" alignItems="start" gap={1}>
									<Box><Typography variant="h6">{selectedCandidate.title}</Typography><Typography variant="body2" color="text.secondary">{selectedCandidate.address || 'Commercial parking facility'}</Typography></Box>
									<IconButton size="small" aria-label="Close guidance details" onClick={() => setSelectedCandidate(null)}><Close /></IconButton>
								</Box>
								<Chip size="small" sx={{ my: 1 }} label={selectedCandidate.isPreview ? 'Candidate preview · not verified' : 'Verified facility guidance'} color={selectedCandidate.isPreview ? 'warning' : 'success'} variant="outlined" />
								{selectedCandidate.canShowAnalytics && selectedCandidate.crowdGuidance?.sampleCount >= 3 ? <>
									<Typography variant="h5" fontWeight={800}>~{Math.max(1, Math.round(selectedCandidate.crowdGuidance.circlingTimeSeconds / 60))} min</Typography>
									<Typography variant="body2">Recent average circling time · {selectedCandidate.crowdGuidance.sampleCount} sessions</Typography>
									<Typography variant="caption" color="text.secondary">Completed hourly window ending {new Date(selectedCandidate.crowdGuidance.windowEnd).toLocaleString()}</Typography>
								</> : <Typography variant="body2" color="text.secondary">No current estimate is available for this facility.</Typography>}
								<Alert severity="info" sx={{ mt: 1.5 }}>Guidance only. This facility is not bookable through ParknQuik, and this estimate does not confirm spaces, availability, capacity, or price.</Alert>
								<Button component="a" href={`https://www.google.com/maps/dir/?api=1&destination=${selectedCandidate.latitude},${selectedCandidate.longitude}`} target="_blank" rel="noreferrer" fullWidth sx={{ mt: 1 }}>Get directions</Button>
							</CardContent>
						</Card>}

					{selectedSlot && (
						<Card
							sx={{
								position: 'absolute',
								bottom: 16,
								left: '50%',
								transform: 'translateX(-50%)',
												minWidth: { xs: 'calc(100% - 24px)', sm: 400 },
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
										navigate(`/reserve?${new URLSearchParams({ listingId: String(selectedSlot.id), ...(checkIn ? { checkIn } : {}), ...(checkOut ? { checkOut } : {}) })}`, { state: { slot: selectedSlot, checkIn, checkOut } })
									}
									disabled={selectedSlot.status !== 'available' && !(checkIn && checkOut)}
								>
									{selectedSlot.status === 'available' || (checkIn && checkOut)
										? 'Reserve Now'
										: 'Not Available'}
								</Button>
								<Button fullWidth sx={{ mt: 1 }} onClick={() => navigate(`/listing/${selectedSlot.id}${checkIn || checkOut ? `?${new URLSearchParams({ ...(checkIn ? { checkIn } : {}), ...(checkOut ? { checkOut } : {}) })}` : ''}`)}>View listing details</Button>
							</CardContent>
						</Card>
					)}
				</Box>
			</Box>
		</Box>
	);
};

export default MapView;
