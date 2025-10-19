import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import api from '../api.jsx';

const SLOT_TYPES = [
	{ value: 'roadside_qr', label: 'Roadside (QR)' },
	{ value: 'commercial_manual', label: 'Commercial (Manual)' },
	{ value: 'commercial_iot', label: 'Commercial (IoT)' },
];

const AMENITIES = [
	'covered',
	'security',
	'cctv',
	'restroom',
	'elevator',
	'ev_charging',
	'lighting',
	'wide_slot',
	'valet',
	'bay_view',
];

const ListSlot = () => {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
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

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		setSuccess('');

		try {
			const response = await api.post('/api/marketplace/listings', {
				...formData,
				lat: parseFloat(formData.lat),
				lon: parseFloat(formData.lon),
				price: parseFloat(formData.price),
			});

			setSuccess('Listing created successfully! Redirecting...');
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
		<Container maxWidth="md" sx={{ py: 4 }}>
			<Paper sx={{ p: 4 }}>
				<Typography variant="h4" gutterBottom>
					Create Marketplace Listing
				</Typography>
				<Typography variant="body2" color="text.secondary" gutterBottom>
					List your parking spot and start earning. QR code will be generated automatically.
				</Typography>

				{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
				{success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

				<Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
					<Grid container spacing={2}>
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
								helperText="Click on map to get coordinates"
							/>
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
									{AMENITIES.map((amenity) => (
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
									{loading ? 'Creating Listing...' : 'Create Listing'}
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
