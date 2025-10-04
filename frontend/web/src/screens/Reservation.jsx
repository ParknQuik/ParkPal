import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
	Container,
	Box,
	Typography,
	TextField,
	Button,
	Card,
	CardContent,
	Alert
} from '@mui/material';
import api from '../api.jsx';

const Reservation = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const slot = location.state?.slot;
	const [startTime, setStartTime] = useState('');
	const [endTime, setEndTime] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	if (!slot) {
		return (
			<Container>
				<Alert severity="error" sx={{ mt: 4 }}>
					No slot selected. Please go back and select a slot.
				</Alert>
				<Button onClick={() => navigate('/map')} sx={{ mt: 2 }}>
					Back to Map
				</Button>
			</Container>
		);
	}

	const handleReserve = async () => {
		if (!startTime || !endTime) {
			setError('Please select both start and end time');
			return;
		}

		setLoading(true);
		setError('');

		try {
			const { data } = await api.post('/api/bookings', {
				slotId: slot.id,
				startTime,
				endTime
			});

			navigate('/payment', { state: { booking: data } });
		} catch (err) {
			setError(err.response?.data?.error || 'Reservation failed');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Container maxWidth="md" sx={{ mt: 4 }}>
			<Typography variant="h4" gutterBottom>
				Reserve Parking Slot
			</Typography>

			<Card sx={{ mt: 3 }}>
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Slot Details
					</Typography>
					<Typography variant="body1">
						<strong>Location:</strong> {slot.address || `${slot.lat}, ${slot.lon}`}
					</Typography>
					<Typography variant="body1">
						<strong>Price:</strong> ${slot.price}/hour
					</Typography>
					<Typography variant="body1">
						<strong>Owner:</strong> {slot.owner?.name || 'N/A'}
					</Typography>
				</CardContent>
			</Card>

			{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

			<Box sx={{ mt: 4 }}>
				<TextField
					fullWidth
					label="Start Time"
					type="datetime-local"
					value={startTime}
					onChange={(e) => setStartTime(e.target.value)}
					InputLabelProps={{ shrink: true }}
					margin="normal"
				/>
				<TextField
					fullWidth
					label="End Time"
					type="datetime-local"
					value={endTime}
					onChange={(e) => setEndTime(e.target.value)}
					InputLabelProps={{ shrink: true }}
					margin="normal"
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
						variant="contained"
						onClick={handleReserve}
						disabled={loading}
						fullWidth
					>
						{loading ? 'Reserving...' : 'Reserve & Pay'}
					</Button>
				</Box>
			</Box>
		</Container>
	);
};

export default Reservation;
