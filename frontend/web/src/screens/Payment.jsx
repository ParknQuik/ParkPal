import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
	Container,
	Box,
	Typography,
	Card,
	CardContent,
	FormControl,
	FormLabel,
	RadioGroup,
	FormControlLabel,
	Radio,
	Button,
	Alert
} from '@mui/material';
import api from '../api.jsx';

const Payment = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const booking = location.state?.booking;
	const [method, setMethod] = useState('card');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	if (!booking) {
		return (
			<Container>
				<Alert severity="error" sx={{ mt: 4 }}>
					No booking found. Please go back and create a reservation.
				</Alert>
				<Button onClick={() => navigate('/map')} sx={{ mt: 2 }}>
					Back to Map
				</Button>
			</Container>
		);
	}

	const handlePayment = async () => {
		setLoading(true);
		setError('');

		try {
			await api.post('/api/payments', {
				bookingId: booking.id,
				method,
				amount: booking.price
			});

			alert('Payment successful!');
			navigate('/map');
		} catch (err) {
			setError(err.response?.data?.error || 'Payment failed');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Container maxWidth="sm" sx={{ mt: 4 }}>
			<Typography variant="h4" gutterBottom>
				Payment
			</Typography>

			<Card sx={{ mt: 3 }}>
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Booking Summary
					</Typography>
					<Typography variant="body1">
						<strong>Booking ID:</strong> #{booking.id}
					</Typography>
					<Typography variant="body1">
						<strong>Amount:</strong> ${booking.price}
					</Typography>
					<Typography variant="body1">
						<strong>Status:</strong> {booking.status}
					</Typography>
				</CardContent>
			</Card>

			{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

			<Box sx={{ mt: 4 }}>
				<FormControl component="fieldset">
					<FormLabel component="legend">Payment Method</FormLabel>
					<RadioGroup value={method} onChange={(e) => setMethod(e.target.value)}>
						<FormControlLabel value="card" control={<Radio />} label="Credit/Debit Card" />
						<FormControlLabel value="paypal" control={<Radio />} label="PayPal" />
						<FormControlLabel value="cash" control={<Radio />} label="Cash" />
					</RadioGroup>
				</FormControl>

				<Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
					<Button
						variant="outlined"
						onClick={() => navigate('/map')}
						fullWidth
					>
						Cancel
					</Button>
					<Button
						variant="contained"
						onClick={handlePayment}
						disabled={loading}
						fullWidth
					>
						{loading ? 'Processing...' : `Pay $${booking.price}`}
					</Button>
				</Box>
			</Box>
		</Container>
	);
};

export default Payment;
