import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
	Container,
	Box,
	Typography,
	TextField,
	Button,
	Alert,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Chip,
	OutlinedInput,
	Paper,
	Grid,
} from '@mui/material';
import api from '../api';
import { loadGoogleMaps } from '../utils/googleMaps';
import { useAuth } from '../contexts/AuthContext';

const SLOT_TYPES = [
	{ value: 'roadside_qr', label: 'Roadside (QR)' },
	{ value: 'commercial_manual', label: 'Commercial (Manual)' },
	{ value: 'commercial_iot', label: 'Commercial (IoT)' },
];

const AMENITIES = [
	'covered',
	'cctv',
	'security',
	'ev_charging',
	'accessible',
	'24_7_access',
];

const ListSlot = () => {
	const navigate = useNavigate();
	const { user, updateUser } = useAuth();
	const [searchParams] = useSearchParams();
	const editId = searchParams.get('edit');
	const [formData, setFormData] = useState({
		title: '',
		lat: '',
		lon: '',
		price: '',
		address: '',
		slotType: 'roadside_qr',
		description: '',
		amenities: [],
		photos: [],
	});
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [loading, setLoading] = useState(false);
	const [initialLoading, setInitialLoading] = useState(Boolean(editId));
	const [photoFiles, setPhotoFiles] = useState([]);
	const addressInputRef = useRef(null);
	const mapElementRef = useRef(null);
	const redirectTimerRef = useRef(null);
	const [mapError, setMapError] = useState('');
	const [mapReady, setMapReady] = useState(false);

	useEffect(() => () => {
		if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
	}, []);

	useEffect(() => {
		if (!editId) return;
		api.get(`/marketplace/listings/${editId}`).then(({ data }) => setFormData({
			title: data.title || '', lat: String(data.lat), lon: String(data.lon), price: String(data.price),
			address: data.address || '', slotType: data.slotType || 'roadside_qr', description: data.description || '',
			amenities: Array.isArray(data.amenities) ? data.amenities : (typeof data.amenities === 'string' ? JSON.parse(data.amenities || '[]') : []), photos: Array.isArray(data.photos) ? data.photos : (typeof data.photos === 'string' ? JSON.parse(data.photos || '[]') : []),
		})).catch((err) => setError(err.response?.data?.error || 'Unable to load listing for editing'))
			.finally(() => setInitialLoading(false));
	}, [editId]);

	useEffect(() => {
		if (initialLoading || !addressInputRef.current || !mapElementRef.current) return undefined;
		let active = true;
		let map;
		let marker;
		let autocomplete;
		const setLocation = (location, pan = true) => {
			const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
			const lon = typeof location.lng === 'function' ? location.lng() : location.lng;
			if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
			setFormData((old) => ({ ...old, lat: String(lat), lon: String(lon) }));
			marker.setPosition({ lat, lng: lon });
			if (pan) map.panTo({ lat, lng: lon });
		};
		loadGoogleMaps(['places']).then((maps) => {
			if (!active) return;
			const existing = formData.lat !== '' && formData.lon !== '' && Number.isFinite(Number(formData.lat)) && Number.isFinite(Number(formData.lon));
			const center = existing ? { lat: Number(formData.lat), lng: Number(formData.lon) } : { lat: 14.5995, lng: 120.9842 };
			map = new maps.maps.Map(mapElementRef.current, { center, zoom: existing ? 17 : 12, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
			marker = new maps.maps.Marker({ map, position: existing ? center : undefined, draggable: true, title: 'Parking spot location' });
			map.addListener('click', (event) => setLocation(event.latLng));
			marker.addListener('dragend', (event) => setLocation(event.latLng, false));
			autocomplete = new maps.maps.places.Autocomplete(addressInputRef.current, { fields: ['formatted_address', 'geometry', 'name'] });
			autocomplete.bindTo('bounds', map);
			autocomplete.addListener('place_changed', () => {
				const place = autocomplete.getPlace();
				if (place.formatted_address) setFormData((old) => ({ ...old, address: place.formatted_address }));
				if (place.geometry?.location) {
					map.setZoom(17);
					setLocation(place.geometry.location);
				} else setError('Choose an address from the suggestions to set its map location.');
			});
			setMapReady(true);
		}).catch((loadError) => {
			if (active) setMapError(loadError.message || 'Location picker unavailable. Check your Google Maps configuration.');
		});
		return () => { active = false; if (autocomplete) autocomplete.unbindAll(); };
	}, [initialLoading]);

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		setSuccess('');

		const lat = Number(formData.lat), lon = Number(formData.lon), price = Number(formData.price);
		if (formData.title.trim().length < 3) { setError('Spot name must be at least 3 characters.'); setLoading(false); return; }
		if (formData.address.trim().length < 10) { setError('Address must be at least 10 characters.'); setLoading(false); return; }
		if (!formData.price.trim() || !Number.isFinite(price) || price <= 0 || price > 10000) { setError('Price must be greater than 0 and less than or equal to 10,000.'); setLoading(false); return; }
		if (!formData.lat.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90) { setError('Latitude must be between -90 and 90.'); setLoading(false); return; }
		if (!formData.lon.trim() || !Number.isFinite(lon) || lon < -180 || lon > 180) { setError('Longitude must be between -180 and 180.'); setLoading(false); return; }
		try {
			const payload = {
				...formData, title: formData.title.trim(), address: formData.address.trim(), description: formData.description.trim(),
				lat, lon, price,
			};
			let listingId = editId;
			if (editId) await api.put(`/marketplace/listings/${editId}`, payload);
			else {
				const response = await api.post('/marketplace/listings', payload);
				listingId = response.data?.id || response.data?.data?.id;
				if (response.data?.canHost && user) updateUser({ ...user, canHost: true });
			}
			const uploaded = [];
			const photoFailures = [];
			for (const file of photoFiles) {
				try {
					const contentType = file.type || 'image/jpeg';
					const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
					const signed = await api.get(`/marketplace/listings/${listingId}/photos/upload-url`, { params: { fileName: `photo-${Date.now()}-${uploaded.length}.${ext}`, contentType } });
					const { uploadUrl, fileName } = signed.data;
					const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
					if (!put.ok) throw new Error(`Storage upload failed (${put.status})`);
					const confirmed = await api.post(`/marketplace/listings/${listingId}/photos/confirm`, { fileName });
					const url = confirmed.data?.original || confirmed.data?.data?.original;
					if (url) uploaded.push(url);
					else throw new Error('Photo processing did not return an image URL');
				} catch (uploadError) {
					photoFailures.push(uploadError.response?.data?.error || uploadError.message || 'Photo upload failed');
				}
			}
			if (uploaded.length) {
				try { await api.put(`/marketplace/listings/${listingId}`, { photos: [...formData.photos, ...uploaded] }); }
				catch (uploadError) { photoFailures.push(uploadError.response?.data?.error || 'Uploaded photos could not be attached to the listing'); }
			}

			setSuccess(photoFailures.length ? `Listing ${editId ? 'updated' : 'created'}.` : `Listing ${editId ? 'updated' : 'created'} successfully! Redirecting...`);
			if (photoFailures.length) setError(`Photo upload issue: ${photoFailures.join('; ')}. You can retry by editing the listing.`);
			if (!photoFailures.length) {
				redirectTimerRef.current = setTimeout(() => {
					redirectTimerRef.current = null;
					navigate('/host-dashboard');
				}, 2000);
			}
		} catch (err) {
			setError(err.response?.data?.error || 'Failed to create listing');
		} finally {
			setLoading(false);
		}
	};

	const handleAmenityChange = (event) => {
		const value = event.target.value;
		setFormData({
			...formData,
			amenities: typeof value === 'string' ? value.split(',') : value,
		});
	};

	return (
		initialLoading ? <Container sx={{ py: 4 }}><Typography>Loading listing…</Typography></Container> :
		<Container maxWidth="md" sx={{ py: 4 }}>
			<Paper sx={{ p: 4 }}>
				<Typography variant="h4" gutterBottom>
					{editId ? 'Edit Marketplace Listing' : 'Create Marketplace Listing'}
				</Typography>
				<Typography variant="body2" color="text.secondary" gutterBottom>
					List your parking spot and start earning. QR code will be generated automatically.
				</Typography>

				{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
				{success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

				<Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
					<Grid container spacing={2}>
						<Grid item xs={12}>
							<TextField fullWidth label="Listing title" name="title" value={formData.title} onChange={handleChange} required inputProps={{ maxLength: 200 }} />
						</Grid>
						{/* Location Section */}
						<Grid item xs={12}>
							<Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
								Location Details
							</Typography>
						</Grid>
						<Grid item xs={12} sm={6}>
								<TextField fullWidth label="Full Address" name="address" inputRef={addressInputRef} value={formData.address} onChange={handleChange} required placeholder="Search for your parking spot address" />
						</Grid>
						<Grid item xs={12}>
							{mapError ? <Alert severity="warning" sx={{ mb: 1 }}>Location picker unavailable: {mapError} You can still enter the address and use a previously saved location.</Alert> : <>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{mapReady ? 'Choose an address, then click the map or drag the pin to the exact parking spot.' : 'Loading address search and map…'}</Typography>
								<Box ref={mapElementRef} role="region" aria-label="Parking location map" sx={{ width: '100%', height: 320, borderRadius: 1, bgcolor: 'grey.100', border: 1, borderColor: 'divider' }} />
							</>}
						</Grid>
						<Grid item xs={12}>
							<Typography variant="body2" color="text.secondary" aria-live="polite">Coordinates: {formData.lat && formData.lon ? `${Number(formData.lat).toFixed(6)}, ${Number(formData.lon).toFixed(6)} (latitude, longitude)` : 'Select a location on the map'}</Typography>
						</Grid>
						<Grid item xs={12}>
							<Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Photos</Typography>
							<Button component="label" variant="outlined" disabled={formData.photos.length + photoFiles.length >= 5}>Choose photos (up to 5)
								<input hidden multiple accept="image/jpeg,image/png,image/webp" type="file" aria-label="Choose listing photos" onChange={(event) => { const next = Array.from(event.target.files || []).slice(0, Math.max(0, 5 - formData.photos.length - photoFiles.length)); setPhotoFiles((current) => [...current, ...next]); event.target.value = ''; }} />
							</Button>
							<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>{[...formData.photos.map((src) => ({ src, existing: true })), ...photoFiles.map((file) => ({ src: URL.createObjectURL(file), existing: false, file }))].map((photo, index) => <Box key={index} sx={{ position: 'relative' }}><Box component="img" src={photo.src} alt={`Listing photo ${index + 1}`} sx={{ width: 88, height: 72, objectFit: 'cover', borderRadius: 1 }} /><Button size="small" onClick={() => photo.existing ? setFormData((old) => ({ ...old, photos: old.photos.filter((_, i) => i !== index) })) : setPhotoFiles((old) => old.filter((file) => file !== photo.file))}>Remove</Button></Box>)}</Box>
							<Typography variant="caption" display="block" color="text.secondary">{formData.photos.length + photoFiles.length}/5 photos</Typography>
						</Grid>

						{/* Listing Details Section */}
						<Grid item xs={12}>
							<Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
								Listing Details
							</Typography>
						</Grid>
						<Grid item xs={12} sm={6}>
							<FormControl fullWidth required>
								<InputLabel>Slot Type</InputLabel>
								<Select
									name="slotType"
									value={formData.slotType}
									onChange={handleChange}
									label="Slot Type"
								>
									{SLOT_TYPES.map((type) => (
										<MenuItem key={type.value} value={type.value}>
											{type.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Price per Hour (₱)"
								name="price"
								type="number"
								value={formData.price}
								onChange={handleChange}
								required
								inputProps={{ step: '0.01', min: '0' }}
								helperText="Platform fee: 5%"
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Description"
								name="description"
								value={formData.description}
								onChange={handleChange}
								multiline
								rows={3}
								placeholder="Describe your parking spot (e.g., covered, near entrance, secure...)"
							/>
						</Grid>

						{/* Amenities Section */}
						<Grid item xs={12}>
							<Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
								Amenities
							</Typography>
						</Grid>
						<Grid item xs={12}>
							<FormControl fullWidth>
								<InputLabel>Select Amenities</InputLabel>
								<Select
									multiple
									value={formData.amenities}
									onChange={handleAmenityChange}
									input={<OutlinedInput label="Select Amenities" />}
									renderValue={(selected) => (
										<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
											{selected.map((value) => (
												<Chip key={value} label={value} size="small" />
											))}
										</Box>
									)}
								>
									{[...new Set([...AMENITIES, ...formData.amenities])].map((amenity) => (
										<MenuItem key={amenity} value={amenity}>
											{amenity.replace('_', ' ').toUpperCase()}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						</Grid>

						{/* Submit Buttons */}
						<Grid item xs={12}>
							<Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
								<Button
									variant="outlined"
									onClick={() => navigate('/host-dashboard')}
									fullWidth
									disabled={loading}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="contained"
									disabled={loading}
									fullWidth
								>
									{loading ? (editId ? 'Saving…' : 'Creating…') : (editId ? 'Save Changes' : 'Create Listing')}
								</Button>
							</Box>
						</Grid>
					</Grid>
				</Box>
			</Paper>
		</Container>
	);
};

export default ListSlot;
