import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Container,
	Box,
	Typography,
	TextField,
	Button,
	Alert
} from '@mui/material';
import api from '../api';

const ListSlot = () => {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		lat: '',
		lon: '',
		price: '',
		address: ''
	});
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		try {
			await api.post('/api/slots', formData);
			navigate('/map');
		} catch (err) {
			setError(err.response?.data?.error || 'Failed to list slot');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Container maxWidth="sm" sx={{ mt: 4 }}>
			<Typography variant="h4" gutterBottom>
				List Your Parking Slot
			</Typography>

			{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

			<Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
				<TextField
					fullWidth
					label="Latitude"
					name="lat"
					type="number"
					value={formData.lat}
					onChange={handleChange}
					margin="normal"
					required
					inputProps={{ step: 'any' }}
				/>
				<TextField
					fullWidth
					label="Longitude"
					name="lon"
					type="number"
					value={formData.lon}
					onChange={handleChange}
					margin="normal"
					required
					inputProps={{ step: 'any' }}
				/>
				<TextField
					fullWidth
					label="Price per Hour ($)"
					name="price"
					type="number"
					value={formData.price}
					onChange={handleChange}
					margin="normal"
					required
					inputProps={{ step: '0.01', min: '0' }}
				/>
				<TextField
					fullWidth
					label="Address"
					name="address"
					value={formData.address}
					onChange={handleChange}
					margin="normal"
					multiline
					rows={2}
				/>

				<Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
					<Button
						variant="outlined"
						onClick={() => navigate('/map')}
						fullWidth
					>
						Cancel
					</Button>
					<Button
						type="submit"
						variant="contained"
						disabled={loading}
						fullWidth
					>
						{loading ? 'Listing...' : 'List Slot'}
					</Button>
				</Box>
			</Box>
		</Container>
	);
};

export default ListSlot;
