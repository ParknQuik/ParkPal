import React, { useEffect, useState } from 'react';
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

	useEffect(() => {
		if (!editId) return;
		api.get(`/marketplace/listings/${editId}`).then(({ data }) => setFormData({
			title: data.title || '', lat: String(data.lat), lon: String(data.lon), price: String(data.price),
			address: data.address || '', slotType: data.slotType || 'roadside_qr', description: data.description || '',
			amenities: Array.isArray(data.amenities) ? data.amenities : (typeof data.amenities === 'string' ? JSON.parse(data.amenities || '[]') : []), photos: Array.isArray(data.photos) ? data.photos : (typeof data.photos === 'string' ? JSON.parse(data.photos || '[]') : []),
		})).catch((err) => setError(err.response?.data?.error || 'Unable to load listing for editing'))
			.finally(() => setInitialLoading(false));
	}, [editId]);

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
			else { const response = await api.post('/marketplace/listings', payload); listingId = response.data?.id || response.data?.data?.id; }
			const uploaded = [];
			let photoFailures = 0;
			for (const file of photoFiles) {
				try {
					const ext = file.name.split('.').pop() || 'jpg';
					const signed = await api.get(`/marketplace/listings/${listingId}/photos/upload-url`, { params: { fileName: `photo-${Date.now()}-${uploaded.length}.${ext}` } });
					const { uploadUrl, fileName } = signed.data;
					const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'image/jpeg' }, body: file });
					if (!put.ok) throw new Error('Photo upload failed');
					const confirmed = await api.post(`/marketplace/listings/${listingId}/photos/confirm`, { fileName });
					const url = confirmed.data?.original || confirmed.data?.data?.original;
					if (url) uploaded.push(url);
				} catch (_) { photoFailures += 1; /* preserve listing if a photo upload fails */ }
			}
			if (uploaded.length) {
				try { await api.put(`/marketplace/listings/${listingId}`, { photos: [...formData.photos, ...uploaded] }); }
				catch (_) { photoFailures += uploaded.length; }
			}

			setSuccess(photoFailures ? `Listing ${editId ? 'updated' : 'created'}. Some photos could not be uploaded or attached; you can retry by editing the listing.` : `Listing ${editId ? 'updated' : 'created'} successfully! Redirecting...`);
			setTimeout(() => {
				navigate('/host-dashboard');
			}, 2000);
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
							<TextField
								fullWidth
								label="Latitude"
								name="lat"
								type="number"
								value={formData.lat}
								onChange={handleChange}
								required
								inputProps={{ step: 'any' }}
								helperText="Enter the actual latitude for this parking location"
							/>
						</Grid>
						<Grid item xs={12}>
							<Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Photos</Typography>
							<Button component="label" variant="outlined" disabled={formData.photos.length + photoFiles.length >= 5}>Choose photos (up to 5)
								<input hidden multiple accept="image/*" type="file" onChange={(event) => { const next = Array.from(event.target.files || []).slice(0, Math.max(0, 5 - formData.photos.length - photoFiles.length)); setPhotoFiles((current) => [...current, ...next]); event.target.value = ''; }} />
							</Button>
							<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>{[...formData.photos.map((src) => ({ src, existing: true })), ...photoFiles.map((file) => ({ src: URL.createObjectURL(file), existing: false, file }))].map((photo, index) => <Box key={index} sx={{ position: 'relative' }}><Box component="img" src={photo.src} alt={`Listing photo ${index + 1}`} sx={{ width: 88, height: 72, objectFit: 'cover', borderRadius: 1 }} /><Button size="small" onClick={() => photo.existing ? setFormData((old) => ({ ...old, photos: old.photos.filter((_, i) => i !== index) })) : setPhotoFiles((old) => old.filter((file) => file !== photo.file))}>Remove</Button></Box>)}</Box>
							<Typography variant="caption" display="block" color="text.secondary">{formData.photos.length + photoFiles.length}/5 photos</Typography>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Longitude"
								name="lon"
								type="number"
								value={formData.lon}
								onChange={handleChange}
								required
								inputProps={{ step: 'any' }}
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Full Address"
								name="address"
								value={formData.address}
								onChange={handleChange}
								required
								multiline
								rows={2}
								placeholder="e.g., 123 Main Street, Makati City, Metro Manila"
							/>
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
