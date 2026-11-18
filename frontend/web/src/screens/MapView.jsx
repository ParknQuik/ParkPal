import { useViewportDiscovery } from '../hooks/useViewportDiscovery';
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
	FormControl,
	FormControlLabel,
	InputLabel,
	Select,
	MenuItem,
	Switch,
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
	const markersRef = useRef(new Map());
	const slotRequests = useRef(new Map());
	const slotCache = useRef(new Map());
	const slotSequence = useRef(0);
	const refreshAt = useRef(-Infinity);
	const updateMarkersRef = useRef(() => {});
	const mapListenersRef = useRef([]);
	useEffect(() => () => {
		mapListenersRef.current.forEach((listener) => listener.remove());
		markersRef.current.forEach(({ marker }) => { marker.map = null; });
	}, []);

	const [slots, setSlots] = useState([]);
	const [filteredSlots, setFilteredSlots] = useState([]);
	const [selectedSlot, setSelectedSlot] = useState(null);
	const [discoveryBounds, setDiscoveryBounds] = useState(null);
	const [viewportBounds, setViewportBounds] = useState(null);
	const [externalFacilitiesEnabled, setExternalFacilitiesEnabled] = useState(false);
	const facilityDiscovery = useViewportDiscovery(discoveryBounds, externalFacilitiesEnabled);
	const candidatePins = facilityDiscovery.pins;
	const [selectedCandidate, setSelectedCandidate] = useState(null);
	const [searchQuery, setSearchQuery] = useState(query.get('location') || '');
	const [userLocation, setUserLocation] = useState(null);
	const searchCenter = viewportBounds ? { lat: (viewportBounds.south + viewportBounds.north) / 2, lng: (viewportBounds.west + viewportBounds.east) / 2 } : null;

	const radius = 5;
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [mapLoaded, setMapLoaded] = useState(false);
	const [minPrice, setMinPrice] = useState('');
	const [maxPrice, setMaxPrice] = useState('');
	const [slotType, setSlotType] = useState('');
	const [amenity, setAmenity] = useState('');
	const [sortBy, setSortBy] = useState('nearest');

	// Default center (Manila)
	const defaultCenter = { lat: 14.5995, lng: 120.9842 };

	useEffect(() => {
		// Resolve the initial focus before loading local parking.
		loadGoogleMapsScript();
		getUserLocation();
	}, []);

	useEffect(() => {
		setSelectedCandidate(previous => previous ? candidatePins.find(pin => pin.id === previous.id) || null : null);
	}, [candidatePins]);

	useEffect(() => {
		if (userLocation && !searchCenter && !requestedCenter) googleMapRef.current?.panTo?.(userLocation);
	}, [userLocation]);

	useEffect(() => {
        if (!userLocation) return;
        const center = requestedCenter || userLocation;
        setViewportBounds(previous => previous || { south: center.lat - 0.045, north: center.lat + 0.045,
          west: center.lng - 0.045 / Math.cos(center.lat * Math.PI / 180), east: center.lng + 0.045 / Math.cos(center.lat * Math.PI / 180) });
    }, [userLocation]);

	// Only submitted bounds and filters trigger local parking requests.
	useEffect(() => {
		if (viewportBounds) {
			fetchSlots();
		}
	}, [viewportBounds, checkIn, checkOut]);

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
	}, [searchQuery, slots, minPrice, maxPrice, slotType, amenity, sortBy, userLocation, viewportBounds]);

	useEffect(() => {
		if (!viewportBounds) return;
		const timer = setTimeout(() => fetchSlots(), 250);
		return () => clearTimeout(timer);
	}, [minPrice, maxPrice, slotType, amenity]);

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

	const fetchSlots = async (force = false) => {
		if (!viewportBounds) return;
		const sequence = ++slotSequence.current;
		try {
			setLoading(true);
			// Use searchCenter if set (user moved map), otherwise use userLocation
			const center = searchCenter || requestedCenter || userLocation || defaultCenter;

			const params = {
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
            };
            const key = JSON.stringify(params);
            const cached = slotCache.current.get(key);
            let response;
            if (!force && cached && Date.now() - cached.at < 60000) response = cached.response;
            else {
              let request = slotRequests.current.get(key);
              if (!request) {
                request = api.get('/marketplace/search', { params: { ...params, ...(force ? { refresh: true } : {}) } });
                slotRequests.current.set(key, request);
                const remove = () => { if (slotRequests.current.get(key) === request) slotRequests.current.delete(key); };
                request.then(remove, remove);
              }
              response = await request;
              slotCache.current.delete(key);
              slotCache.current.set(key, { response, at: Date.now() });
              while (slotCache.current.size > 8) slotCache.current.delete(slotCache.current.keys().next().value);
            }
            if (sequence !== slotSequence.current) return;
            setError(response.data.discovery?.truncated ? 'Zoom in to see more host spaces.' : '');
			// Handle v1 API response format: { data: [...], pagination: {...} }
			const slotsData = response.data?.data || response.data?.listings || response.data || [];
			setSlots(slotsData);
			setFilteredSlots(slotsData);
		} catch (error) {
			console.error('Error fetching slots:', error);
			if (sequence === slotSequence.current) setError('Failed to load parking slots. Showing previous results.');
		} finally {
			if (sequence === slotSequence.current) setLoading(false);
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
			const captureBounds = () => {
				const bounds = googleMapRef.current?.getBounds?.();
				if (!bounds) return;
				const sw = bounds.getSouthWest();
				const ne = bounds.getNorthEast();
				const next = { south: sw.lat(), west: sw.lng(), north: ne.lat(), east: ne.lng() };
				setDiscoveryBounds((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
			};
			mapListenersRef.current = ['idle'].map((event) => googleMapRef.current.addListener?.(event, captureBounds)).filter(Boolean);
			captureBounds();
		}
		updateMarkersRef.current();
	};

	const updateMarkers = () => {
		const map = googleMapRef.current;
		if (!map || !window.google?.maps?.marker?.AdvancedMarkerElement) return;

        const wanted = new Set();
        const reconcile = (key, record, position, label, color, select) => {
          wanted.add(key);
          const title = record.title ? record.title + (record.crowdGuidance?.sampleCount >= 3 ? '. ' + Math.round(record.crowdGuidance.circlingTimeSeconds / 60) + ' minute estimated circling time, guidance only, not bookable.' : '. Commercial parking guidance, not bookable.') : record.address || label;
          const signature = JSON.stringify({ position, label, color, title });
          let entry = markersRef.current.get(key);
          if (!entry) {
            const content = document.createElement('div');
            content.style.cssText = 'padding:6px 9px;border:2px solid white;border-radius:16px;box-shadow:0 2px 6px #0004;cursor:pointer;font-weight:700';
            const marker = new window.google.maps.marker.AdvancedMarkerElement({ map, position, content, title, gmpClickable: true });
            entry = { marker, content, record, signature: null };
            marker.addEventListener('gmp-click', () => select(entry.record));
            markersRef.current.set(key, entry);
          }
          entry.record = record;
          if (entry.signature !== signature) {
            entry.marker.position = position;
            entry.marker.title = title;
            entry.content.textContent = label;
            entry.content.style.background = color;
            entry.signature = signature;
          }
        };
        if (userLocation) reconcile('user', {}, userLocation, '●', '#4285f4', () => {});
        filteredSlots.forEach(slot => reconcile('host-' + slot.id, slot, { lat: slot.lat, lng: slot.lon },
          '₱' + slot.price, slot.status === 'available' ? '#bdebd5' : '#f8b6b6',
          current => { setSelectedSlot(current); setSelectedCandidate(null); }));
        candidatePins.forEach(pin => reconcile(pin.source + '-' + pin.id, pin,
          { lat: pin.latitude, lng: pin.longitude },
          pin.canShowAnalytics && pin.crowdGuidance?.sampleCount >= 3
            ? Math.max(1, Math.round(pin.crowdGuidance.circlingTimeSeconds / 60)) + 'm' : pin.isPreview ? '?' : 'P',
          pin.isPreview ? '#f8ddb2' : '#bdebd5',
          current => { setSelectedCandidate(current); setSelectedSlot(null); }));
        markersRef.current.forEach((entry, key) => {
          if (!wanted.has(key)) { entry.marker.map = null; markersRef.current.delete(key); }
        });

	};

	updateMarkersRef.current = updateMarkers;

	const handleRecenterMap = () => {
		if (googleMapRef.current && userLocation) {
			googleMapRef.current.panTo(userLocation);
			googleMapRef.current.setZoom(15);

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

					<Card variant="outlined" sx={{ mx: 2, mb: 1.5, borderRadius: 2 }}>
						<CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
							<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
								<Box>
									<Typography variant="subtitle2" fontWeight={700}>Nearby facilities</Typography>
									<Typography variant="caption" color="text.secondary">Optional, non-bookable facility and community guidance for this map area.</Typography>
								</Box>
								<Switch inputProps={{ 'aria-label': 'Nearby facilities' }} checked={externalFacilitiesEnabled} onChange={(event) => setExternalFacilitiesEnabled(event.target.checked)} />
							</Box>
							{externalFacilitiesEnabled && <Box sx={{ mt: 1.25 }}>
								<Typography variant="body2" role="status" aria-live="polite">
									{!discoveryBounds || facilityDiscovery.status === 'loading' ? 'Loading nearby facility guidance…'
										: facilityDiscovery.status === 'error' ? 'Facility guidance could not load.'
										: facilityDiscovery.notice || (candidatePins.length === 0 ? 'No facilities found in this map area.' : `${candidatePins.length} facility ${candidatePins.length === 1 ? 'guide' : 'guides'} · not bookable`)}
								</Typography>
								{(facilityDiscovery.status === 'error' || facilityDiscovery.notice?.includes('unavailable')) && <Button size="small" onClick={facilityDiscovery.retry}>Retry local guidance</Button>}
								<Divider sx={{ my: 1 }} />
								<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Google Places previews are separate and are not bookable.</Typography>
								<Button size="small" variant="outlined" onClick={facilityDiscovery.findMore} disabled={!discoveryBounds || facilityDiscovery.googleLoading}>
									{facilityDiscovery.googleLoading ? 'Searching Google Places…' : 'Search Google Places'}
								</Button>
							</Box>}
						</CardContent>
					</Card>
                    {/* Radius Control */}
					<Box sx={{ px: 2, pb: 2 }}>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
							<Typography variant="caption" color="text.secondary">
								Focused map area
							</Typography>
							<Button
								size="small"
								startIcon={<Refresh />}
								onClick={() => {
                                    if (Date.now() - refreshAt.current < 5000) return;
                                    refreshAt.current = Date.now();
                                    fetchSlots(true);
									if (externalFacilitiesEnabled) facilityDiscovery.retry();
								}}
								disabled={loading}
							>
								Refresh
							</Button>
						</Box>
						<Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
							Showing {filteredSlots.length} parking spot{filteredSlots.length !== 1 ? 's' : ''}

						</Typography>
					</Box>

					<Divider />
					<Box sx={{ px: 2, pt: 1.5 }}>
						<Typography variant="subtitle2" fontWeight={800}>Host spaces</Typography>
						<Typography variant="caption" color="text.secondary">Bookable spaces listed by hosts</Typography>
					</Box>
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
						{loading && filteredSlots.length === 0 ? (
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
						{externalFacilitiesEnabled && discoveryBounds && <Box role="status" sx={{ mt: 2 }}>
							<Typography variant="body2">{facilityDiscovery.status === 'loading' ? 'Finding parking facilities…'
								  : facilityDiscovery.notice || (candidatePins.length === 0 ? 'No external parking facilities found in this area.' : 'Facility guidance · not bookable')}</Typography>
                        </Box>}
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
							{/* Camera movement reveals this action without sending requests. */}
							<Button
								variant="contained"
								startIcon={<Refresh />}
								sx={{
									display: discoveryBounds && JSON.stringify(discoveryBounds) !== JSON.stringify(viewportBounds) ? 'inline-flex' : 'none',
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
								disabled={!discoveryBounds || loading}
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
								{selectedCandidate.partnerAvailability && <Typography>{selectedCandidate.partnerAvailability.availableCount} spaces reported available · Verified partner: {selectedCandidate.partnerAvailability.partner} · Updated {new Date(selectedCandidate.partnerAvailability.updatedAt).toLocaleString()}</Typography>}
                                {selectedCandidate.source === 'osm' && <Typography variant="caption">© OpenStreetMap contributors · ODbL</Typography>}
                                {selectedCandidate.canShowAnalytics && selectedCandidate.crowdGuidance?.sampleCount >= 3 ? <>
									<Typography variant="h5" fontWeight={800}>~{Math.max(1, Math.round(selectedCandidate.crowdGuidance.circlingTimeSeconds / 60))} min</Typography>
									<Typography variant="body2">Recent average circling time · {selectedCandidate.crowdGuidance.sampleCount} sessions</Typography>
									<Typography variant="caption" color="text.secondary">Completed hourly window ending {new Date(selectedCandidate.crowdGuidance.windowEnd).toLocaleString()}</Typography>
								</> : <Typography variant="body2" color="text.secondary">No current estimate is available for this facility.</Typography>}
								<Alert severity="info" sx={{ mt: 1.5 }}>Guidance only. This facility is not bookable through ParknQuik, and this estimate does not confirm spaces, availability, capacity, or price.</Alert>
								<Typography variant="caption" color="text.secondary" translate="no" sx={{ display: 'block', mt: 1, whiteSpace: 'nowrap' }}>{selectedCandidate?.attribution || 'Google Maps'}</Typography>
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
